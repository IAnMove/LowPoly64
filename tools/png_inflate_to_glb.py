#!/usr/bin/env python3
"""Turn a transparent PNG/WebP into Retrovisor's closed low-poly 2.5D GLB.

This is a dependency-light Python port of src/modules/png-model algorithm v2.
Runtime dependency: Pillow (``python -m pip install Pillow``).
"""
from __future__ import annotations

import argparse, base64, json, math, struct, sys
from array import array
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable
from PIL import Image


def clamp(v, lo, hi): return min(hi, max(lo, v))


@dataclass
class Settings:
    target_size: float = 4.0
    density: int = 40
    alpha_threshold: int = 16
    thickness: float = 0.8
    bulge: float = 1.35
    depth_profile: str = "balanced"
    smoothing: int = 1
    manual_strength: float = 0.75
    mirror_back: bool = True
    edge_depth: float = 0.03
    edge_falloff: float = 0.18
    coverage_threshold: float = 0.2
    component_mode: str = "largest"
    min_component_cells: int = 2
    side_style: str = "sampled"
    side_color: str = "#665533"


def bounds_for_alpha(alpha, w, h, threshold):
    points = [(x, y) for y in range(h) for x in range(w) if alpha[y*w+x] >= threshold]
    if not points: raise ValueError("La imagen es totalmente transparente con el umbral elegido")
    xs, ys = zip(*points)
    return min(xs), min(ys), max(xs)-min(xs)+1, max(ys)-min(ys)+1


def sample_coverage(alpha, iw, b, col, row, cols, rows, threshold):
    bx, by, bw, bh = b
    left, right = bx + col/cols*bw, bx + (col+1)/cols*bw
    top, bottom = by + row/rows*bh, by + (row+1)/rows*bh
    area = max(sys.float_info.epsilon, (right-left)*(bottom-top)); total = 0.0
    for y in range(math.floor(top), math.ceil(bottom)):
        oy = max(0.0, min(bottom, y+1)-max(top, y))
        for x in range(math.floor(left), math.ceil(right)):
            ox = max(0.0, min(right, x+1)-max(left, x)); a = alpha[y*iw+x]
            if a >= threshold: total += ox*oy*(a/255.0)
    return clamp(total/area, 0, 1)


def components(mask, cols, rows):
    labels = [-1]*len(mask); found=[]
    for start, on in enumerate(mask):
        if not on or labels[start] >= 0: continue
        cid=len(found); q=[start]; labels[start]=cid; cells=[]
        for i in q:
            cells.append(i); x=i%cols; y=i//cols
            for n in (i-1 if x else -1, i+1 if x+1<cols else -1,
                      i-cols if y else -1, i+cols if y+1<rows else -1):
                if n >= 0 and mask[n] and labels[n] < 0: labels[n]=cid; q.append(n)
        found.append(cells)
    return labels, found


def silhouette(image: Image.Image, s: Settings):
    w,h=image.size
    if w > 8192 or h > 8192 or w*h > 32*1024*1024:
        raise ValueError("La imagen supera el limite de 8192 px o 32 megapixeles")
    channel=image.getchannel("A")
    alpha=list(channel.get_flattened_data() if hasattr(channel,"get_flattened_data") else channel.getdata())
    b=bounds_for_alpha(alpha,w,h,s.alpha_threshold)
    scale=min(1, s.density/max(b[2],b[3])); cols=max(1,round(b[2]*scale)); rows=max(1,round(b[3]*scale))
    coverage=[]; mask=[]
    for y in range(rows):
        for x in range(cols):
            c=sample_coverage(alpha,w,b,x,y,cols,rows,s.alpha_threshold); coverage.append(c); mask.append(c>=s.coverage_threshold)
    labels, comps=components(mask,cols,rows)
    if not comps: raise ValueError("La silueta muestreada no contiene celdas opacas")
    selected=([max(comps,key=len)] if s.component_mode=="largest" else [c for c in comps if len(c)>=s.min_component_cells])
    if not selected: selected=[max(comps,key=len)]
    keep={i for c in selected for i in c}; mask=[i in keep for i in range(len(mask))]; labels,comps=components(mask,cols,rows)
    dist=[math.inf if v else 0.0 for v in mask]
    def inside(x,y): return 0<=x<cols and 0<=y<rows and mask[y*cols+x]
    for y in range(rows):
        for x in range(cols):
            i=y*cols+x
            if mask[i] and not all((inside(x-1,y),inside(x+1,y),inside(x,y-1),inside(x,y+1))): dist[i]=.5
    rt2=math.sqrt(2)
    for yr,xr,neighbors in ((range(rows),range(cols),((-1,0,1),(0,-1,1),(-1,-1,rt2),(1,-1,rt2))),
                            (range(rows-1,-1,-1),range(cols-1,-1,-1),((1,0,1),(0,1,1),(1,1,rt2),(-1,1,rt2)))):
        for y in yr:
            for x in xr:
                i=y*cols+x
                if mask[i]:
                    for dx,dy,cost in neighbors:
                        nx,ny=x+dx,y+dy
                        if 0<=nx<cols and 0<=ny<rows: dist[i]=min(dist[i],dist[ny*cols+nx]+cost)
    maximum=max(d for d in dist if math.isfinite(d)); norm=[d/maximum if mask[i] else 0 for i,d in enumerate(dist)]
    return dict(iw=w,ih=h,b=b,cols=cols,rows=rows,mask=mask,labels=labels,coverage=coverage,norm=norm,components=len(comps))


def paint(depth, size, spec):
    tool,u,v,radius,strength=spec; cx=clamp(u,0,1)*(size-1); cy=clamp(v,0,1)*(size-1); radius=clamp(radius,1,size/2); source=depth[:]
    for y in range(max(0,math.floor(cy-radius)),min(size-1,math.ceil(cy+radius))+1):
        for x in range(max(0,math.floor(cx-radius)),min(size-1,math.ceil(cx+radius))+1):
            d=math.hypot(x-cx,y-cy)
            if d>radius: continue
            a=clamp(strength,.01,1)*(1-d/radius)**2; i=y*size+x
            if tool=="inflate": depth[i]=clamp(depth[i]+a,-1,1)
            elif tool=="deflate": depth[i]=clamp(depth[i]-a,-1,1)
            elif tool=="erase": depth[i]*=1-a
            else:
                ns=[source[yy*size+xx] for yy in range(max(0,y-1),min(size,y+2)) for xx in range(max(0,x-1),min(size,x+2))]
                depth[i]=source[i]*(1-a)+sum(ns)/len(ns)*a


def generate(g,s,depth_map,map_size):
    C,R=g['cols'],g['rows']; pi=lambda x,y:y*(C+1)+x
    inside=lambda x,y:0<=x<C and 0<=y<R and g['mask'][y*C+x]
    used=[False]*((C+1)*(R+1)); boundary=[False]*len(used); edges=[]
    for y in range(R):
        for x in range(C):
            if not inside(x,y): continue
            comp=g['labels'][y*C+x]
            for p in (pi(x,y),pi(x+1,y),pi(x,y+1),pi(x+1,y+1)): used[p]=True
            for absent,a,b in ((not inside(x-1,y),(x,y),(x,y+1)),(not inside(x,y+1),(x,y+1),(x+1,y+1)),
                               (not inside(x+1,y),(x+1,y+1),(x+1,y)),(not inside(x,y-1),(x+1,y),(x,y))):
                if absent: boundary[pi(*a)]=boundary[pi(*b)]=True; edges.append((comp,a,b))
    def point_source(x,y):
        vals=[g['norm'][yy*C+xx] for yy in (y-1,y) for xx in (x-1,x) if inside(xx,yy)]
        return sum(vals)/len(vals) if vals else 0
    def map_sample(u,v):
        x=clamp(u,0,1)*(map_size-1); y=clamp(v,0,1)*(map_size-1); x0=int(x);y0=int(y);x1=min(map_size-1,x0+1);y1=min(map_size-1,y0+1);fx=x-x0;fy=y-y0
        return (depth_map[y0*map_size+x0]*(1-fx)+depth_map[y0*map_size+x1]*fx)*(1-fy)+(depth_map[y1*map_size+x0]*(1-fx)+depth_map[y1*map_size+x1]*fx)*fy
    maximum=s.thickness*.5; edge=maximum*s.edge_depth; depths=[0.0]*len(used)
    for y in range(R+1):
        for x in range(C+1):
            i=pi(x,y)
            if not used[i]: continue
            if boundary[i]: depths[i]=edge; continue
            d=clamp(point_source(x,y),0,1); taper=(clamp(d/s.edge_falloff,0,1)**2)*(3-2*clamp(d/s.edge_falloff,0,1))
            auto=(math.sqrt(d*(2-d))**s.bulge if s.depth_profile=='organic' else (d**max(1,s.bulge)*.55 if s.depth_profile=='relief' else d**s.bulge))
            ratio=s.edge_depth+(.92-s.edge_depth)*auto*taper+map_sample(x/C,y/R)*s.manual_strength*taper*(1-s.edge_depth)
            depths[i]=maximum*clamp(ratio,s.edge_depth,1)
    for _ in range(s.smoothing):
        nxt=depths[:]
        for y in range(R+1):
            for x in range(C+1):
                i=pi(x,y)
                if not used[i] or boundary[i]: continue
                vals=[depths[pi(xx,yy)] for xx,yy in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)) if 0<=xx<=C and 0<=yy<=R and used[pi(xx,yy)]]
                nxt[i]=clamp((depths[i]*2+sum(vals))/(2+len(vals)),edge,maximum)
        depths=nxt
    aspect=g['b'][2]/g['b'][3]; width=s.target_size if aspect>=1 else s.target_size*aspect; height=s.target_size/aspect if aspect>=1 else s.target_size
    verts=[];uvs=[];faces=[]; cache={}
    def pair(comp,x,y):
        key=(comp,pi(x,y))
        if key not in cache:
            px=(x/C-.5)*width; py=(.5-y/R)*height; z=depths[pi(x,y)]; sx=g['b'][0]+x/C*g['b'][2]; sy=g['b'][1]+y/R*g['b'][3]
            front=len(verts); verts.append((px,py,z));uvs.append((sx/g['iw'],sy/g['ih']))
            back=len(verts); verts.append((px,py,-z));uvs.append(((g['b'][0]+(1-x/C)*g['b'][2])/g['iw'] if s.mirror_back else sx/g['iw'],sy/g['ih']))
            cache[key]=(front,back)
        return cache[key]
    for y in range(R):
        for x in range(C):
            if not inside(x,y):continue
            c=g['labels'][y*C+x];tl=pair(c,x,y);tr=pair(c,x+1,y);bl=pair(c,x,y+1);br=pair(c,x+1,y+1)
            faces += [(tl[0],bl[0],br[0]),(tl[0],br[0],tr[0]),(tl[1],tr[1],br[1]),(tl[1],br[1],bl[1])]
    side_start=len(faces)
    for c,a,b in edges:
        aa=pair(c,*a);bb=pair(c,*b);faces += [(aa[0],aa[1],bb[1]),(aa[0],bb[1],bb[0])]
    return verts,uvs,faces,side_start,dict(width=width,height=height,maximumDepth=max(depths)*2,vertices=len(verts),triangles=len(faces),components=g['components'])


def write_glb(path,image_png,verts,uvs,faces,side_start,s):
    pos=array('f',(v for xyz in verts for v in xyz)).tobytes(); tex=array('f',(v for uv in uvs for v in uv)).tobytes()
    front=array('I',(i for f in faces[:side_start] for i in f)).tobytes(); sides=array('I',(i for f in faces[side_start:] for i in f)).tobytes()
    chunks=[]; blob=bytearray()
    def add(data,target=None):
        while len(blob)%4: blob.append(0)
        off=len(blob);blob.extend(data);chunks.append({'buffer':0,'byteOffset':off,'byteLength':len(data),**({'target':target} if target else {})});return len(chunks)-1
    pv=add(pos,34962);uv=add(tex,34962);fi=add(front,34963);si=add(sides,34963);im=add(image_png)
    mins=[min(v[i] for v in verts) for i in range(3)];maxs=[max(v[i] for v in verts) for i in range(3)]
    acc=[{'bufferView':pv,'componentType':5126,'count':len(verts),'type':'VEC3','min':mins,'max':maxs},{'bufferView':uv,'componentType':5126,'count':len(uvs),'type':'VEC2'},
         {'bufferView':fi,'componentType':5125,'count':len(front)//4,'type':'SCALAR'},{'bufferView':si,'componentType':5125,'count':len(sides)//4,'type':'SCALAR'}]
    rgb=[int(s.side_color[i:i+2],16)/255 for i in (1,3,5)]
    mats=[{'pbrMetallicRoughness':{'baseColorTexture':{'index':0},'metallicFactor':0,'roughnessFactor':1},'doubleSided':False,'alphaMode':'BLEND'},
          ({'pbrMetallicRoughness':{'baseColorTexture':{'index':0},'metallicFactor':0,'roughnessFactor':1}} if s.side_style=='sampled' else {'pbrMetallicRoughness':{'baseColorFactor':rgb+[1],'metallicFactor':0,'roughnessFactor':1}})]
    doc={'asset':{'version':'2.0','generator':'Retrovisor png_inflate_to_glb.py'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':[{'mesh':0,'name':path.stem}],
         'meshes':[{'primitives':[{'attributes':{'POSITION':0,'TEXCOORD_0':1},'indices':2,'material':0},{'attributes':{'POSITION':0,'TEXCOORD_0':1},'indices':3,'material':1}]}],
         'materials':mats,'textures':[{'sampler':0,'source':0}],'samplers':[{'magFilter':9728,'minFilter':9728,'wrapS':33071,'wrapT':33071}],
         'images':[{'bufferView':im,'mimeType':'image/png'}],'accessors':acc,'bufferViews':chunks,'buffers':[{'byteLength':len(blob)}]}
    js=json.dumps(doc,separators=(',',':')).encode();js+=b' ' *((4-len(js)%4)%4);blob+=b'\0'*((4-len(blob)%4)%4)
    out=struct.pack('<III',0x46546c67,2,12+8+len(js)+8+len(blob))+struct.pack('<II',len(js),0x4E4F534A)+js+struct.pack('<II',len(blob),0x004E4942)+blob
    path.write_bytes(out)


def stroke(text):
    p=text.split(',')
    if len(p)!=5 or p[0] not in ('inflate','deflate','smooth','erase'): raise argparse.ArgumentTypeError('formato: herramienta,u,v,radio,fuerza')
    return p[0],float(p[1]),float(p[2]),float(p[3]),float(p[4])


def main():
    p=argparse.ArgumentParser(description='Infla la silueta alfa de una imagen y crea un GLB 2.5D cerrado.')
    p.add_argument('input',type=Path);p.add_argument('output',type=Path,nargs='?')
    for name,typ,default in [('target-size',float,4),('density',int,40),('alpha-threshold',int,16),('thickness',float,.8),('bulge',float,1.35),('smoothing',int,1),('manual-strength',float,.75),('edge-depth',float,.03),('edge-falloff',float,.18),('coverage-threshold',float,.2),('min-component-cells',int,2)]: p.add_argument('--'+name,type=typ,default=default)
    p.add_argument('--depth-profile',choices=['balanced','organic','relief'],default='balanced');p.add_argument('--component-mode',choices=['largest','all'],default='largest');p.add_argument('--side-style',choices=['sampled','solid'],default='sampled');p.add_argument('--side-color',default='#665533');p.add_argument('--no-mirror-back',action='store_true');p.add_argument('--stroke',action='append',type=stroke,default=[]);p.add_argument('--depth-map-size',type=int,default=64);p.add_argument('--analysis-json',type=Path)
    a=p.parse_args(); out=a.output or a.input.with_suffix('.glb'); kw={k.replace('-','_'):v for k,v in vars(a).items() if k.replace('-','_') in Settings.__annotations__};kw['mirror_back']=not a.no_mirror_back;s=Settings(**kw)
    s.target_size=clamp(s.target_size,.25,50);s.density=int(clamp(s.density,12,72));s.alpha_threshold=int(clamp(s.alpha_threshold,1,254));s.thickness=clamp(s.thickness,.02,20);s.bulge=clamp(s.bulge,.25,4);s.smoothing=int(clamp(s.smoothing,0,4));s.manual_strength=clamp(s.manual_strength,0,2);s.edge_falloff=clamp(s.edge_falloff,.02,.8);s.edge_depth=clamp(s.edge_depth,0,.25);s.coverage_threshold=clamp(s.coverage_threshold,.01,1);s.min_component_cells=int(clamp(s.min_component_cells,1,256))
    if not (len(s.side_color)==7 and s.side_color[0]=='#' and all(c in '0123456789abcdefABCDEF' for c in s.side_color[1:])): raise ValueError('--side-color debe tener formato #RRGGBB')
    image=Image.open(a.input).convert('RGBA');g=silhouette(image,s);size=int(clamp(a.depth_map_size,8,96));dm=[0.0]*(size*size)
    for spec in a.stroke: paint(dm,size,spec)
    verts,uvs,faces,side_start,analysis=generate(g,s,dm,size)
    import io
    buf=io.BytesIO();image.save(buf,'PNG');out.parent.mkdir(parents=True,exist_ok=True);write_glb(out,buf.getvalue(),verts,uvs,faces,side_start,s)
    if a.analysis_json: a.analysis_json.write_text(json.dumps(analysis,indent=2),encoding='utf-8')
    print(json.dumps({'output':str(out.resolve()),**analysis},ensure_ascii=False))


if __name__=='__main__':
    try: main()
    except Exception as e: print(f'error: {e}',file=sys.stderr);sys.exit(1)

import {cube,cyl,sphere,cone,pyramid,wedge,tbox,torus,capsule,lathe,loft,vc,shade,tint,read,write,template,anim,track,kf,PI,relTemplateColors} from './lib.mjs';
const C='Arquitectura';
const A=(rel)=>({animations:read(rel).animations});
const GLASS='#93c5fd',WOODD='#7c4a28',FRAME='#5b3a21',STONE='#94a3b8';
// helpers -------------------------------------------------------------
// window with frame + mullion; z is wall face
const win=(name,[w,h],pos,{color=GLASS,frame=FRAME,sill=true,axis='z'}={})=>{
  const [x,y,z]=pos; const out=[];
  if(axis==='z'){const s=Math.sign(z)||1;
    out.push(cube(name+'_FRAME',[w+0.24,h+0.24,0.14],frame,[x,y,z-0.02*s]));
    out.push(cube(name,[w,h,0.12],color,[x,y,z+0.04*s],{opacity:0.72,vc:[0.25,0.85]}));
    out.push(cube(name+'_MULLION',[0.08,h,0.06],frame,[x,y,z+0.1*s],{vc:false}));
    out.push(cube(name+'_MULLION_H',[w,0.08,0.06],frame,[x,y,z+0.1*s],{vc:false}));
    if(sill)out.push(cube(name+'_SILL',[w+0.4,0.12,0.3],shade(frame,0.9),[x,y-h/2-0.12,z+0.08*s]));
  } else {const s=Math.sign(x)||1;
    out.push(cube(name+'_FRAME',[0.14,h+0.24,w+0.24],frame,[x-0.02*s,y,z]));
    out.push(cube(name,[0.12,h,w],color,[x+0.04*s,y,z],{opacity:0.72,vc:[0.25,0.85]}));
    out.push(cube(name+'_MULLION',[0.06,h,0.08],frame,[x+0.1*s,y,z],{vc:false}));
    out.push(cube(name+'_MULLION_H',[0.06,0.08,w],frame,[x+0.1*s,y,z],{vc:false}));
    if(sill)out.push(cube(name+'_SILL',[0.3,0.12,w+0.4],shade(frame,0.9),[x+0.08*s,y-h/2-0.12,z]));
  }
  return out;};
// door with frame, knob and step; door on +z face unless s given
const door=(name,[w,h],pos,{color=WOODD,frame=FRAME,step=true,knob=true,arch=false}={})=>{
  const [x,y,z]=pos; const s=Math.sign(z)||1; const out=[];
  out.push(cube(name+'_FRAME',[w+0.3,h+0.16,0.16],frame,[x,y+0.08,z-0.02*s]));
  out.push(cube(name,[w,h,0.12],color,[x,y,z+0.04*s]));
  out.push(cube(name+'_PANEL',[w*0.6,h*0.36,0.04],shade(color,0.82),[x,y+h*0.22,z+0.12*s],{vc:false}));
  out.push(cube(name+'_PANEL_2',[w*0.6,h*0.3,0.04],shade(color,0.82),[x,y-h*0.22,z+0.12*s],{vc:false}));
  if(knob)out.push(sphere(name+'_KNOB',[0.07,6,4],'#fbbf24',[x+w*0.32,y,z+0.14*s],{vc:[0.3,0.8]}));
  if(step)out.push(cube(name+'_STEP',[w+0.6,0.16,0.5],'#78716c',[x,0.08,z+0.3*s]));
  if(arch)out.push(cube(name+'_ARCH',[w+0.3,0.3,0.18],frame,[x,y+h/2+0.2,z-0.01*s]));
  return out;};
// gabled roof (wedge) along Z with eaves, ridge, optional chimney
const gable=(w,h,d,y,color,{ridge=true,chimney=null,trim=null,name='ROOF',overhang=0.6}={})=>{
  const out=[wedge(name,[w+overhang,h,d+overhang],color,[0,y+h/2,0])];
  if(ridge)out.push(cube(name+'_RIDGE',[0.3,0.16,d+overhang+0.1],shade(color,0.7),[0,y+h,0]));
  const eave=trim||shade(color,0.6);
  out.push(cube(name+'_EAVE_F',[w+overhang+0.1,0.16,0.24],eave,[0,y-0.04,(d+overhang)/2]));
  out.push(cube(name+'_EAVE_B',[w+overhang+0.1,0.16,0.24],eave,[0,y-0.04,-(d+overhang)/2]));
  if(chimney){const [cx,cz,ch]=chimney;out.push(cube('CHIMNEY',[0.7,ch,0.7],'#78716c',[cx,y+ch/2,cz]));out.push(cube('CHIMNEY_CAP',[0.86,0.16,0.86],'#57534e',[cx,y+ch+0.08,cz]));out.push(cube('CHIMNEY_HOLE',[0.4,0.06,0.4],'#1f2937',[cx,y+ch+0.18,cz],{vc:false}));}
  return out;};
// hip roof (pyramid) with eaves
const hip=(w,h,d,y,color,{name='ROOF',overhang=0.8,chimney=null}={})=>{
  const out=[pyramid(name,[w+overhang,h],color,[0,y+h/2,0],{scale:[1,1,(d+overhang)/(w+overhang)]})];
  out.push(cube(name+'_EAVE',[w+overhang+0.1,0.16,d+overhang+0.1],shade(color,0.6),[0,y-0.04,0]));
  out.push(cube(name+'_FINIAL',[0.2,0.3,0.2],shade(color,0.7),[0,y+h+0.1,0],{vc:false}));
  if(chimney){const [cx,cz,ch]=chimney;out.push(cube('CHIMNEY',[0.7,ch,0.7],'#78716c',[cx,y+ch/2,cz]));out.push(cube('CHIMNEY_CAP',[0.86,0.16,0.86],'#57534e',[cx,y+ch+0.08,cz]));}
  return out;};
// walls with foundation and corner posts
const walls=(w,h,d,color,{name='BODY',foundation=true,posts=null,y0=0}={})=>{
  const out=[cube(name,[w,h,d],color,[0,y0+h/2,0])];
  if(foundation)out.push(cube(name+'_FOUNDATION',[w+0.2,0.4,d+0.2],'#6b7280',[0,y0+0.2,0]));
  if(posts){const [px,pz]=[w/2,d/2];[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b],i)=>out.push(cube(`${name}_POST_${i+1}`,[0.28,h,0.28],posts,[a*px,y0+h/2,b*pz])));}
  return out;};
// ---------------------------------------------------------------------
// archway
write('architecture/archway.json',template('archway','Arco',C,[
 cube('BASE_L',[1.0,0.3,1.1],'#64748b',[-1.45,0.15,0]),cube('BASE_R',[1.0,0.3,1.1],'#64748b',[1.45,0.15,0]),
 tbox('COLUMN_L',{wb:0.7,db:0.85,wt:0.6,dt:0.75,h:2.8},STONE,[-1.45,1.7,0]),
 tbox('COLUMN_R',{wb:0.7,db:0.85,wt:0.6,dt:0.75,h:2.8},STONE,[1.45,1.7,0]),
 cube('CAP_L',[0.9,0.28,1],'#64748b',[-1.45,3.12,0]),cube('CAP_R',[0.9,0.28,1],'#64748b',[1.45,3.12,0]),
 cube('LINTEL',[2.15,0.34,0.95],'#64748b',[0,3.18,0]),
 cube('LINTEL_TOP',[3.8,0.2,1.05],'#64748b',[0,3.45,0]),
 wedge('ARCH_FILL_L',[0.6,0.6,0.9],'#94a3b8',[-0.8,2.7,0],{rotation:[0,0,-PI/2]}),
 wedge('ARCH_FILL_R',[0.6,0.6,0.9],'#94a3b8',[0.8,2.7,0],{rotation:[0,0,PI/2]}),
 pyramid('KEYSTONE',[0.46,0.36],'#cbd5e1',[0,3.0,0],{rotation:[PI,0,0]}),
 cube('CARVING_L',[0.3,0.3,0.06],'#cbd5e1',[-1.45,2.4,0.45],{rotation:[0,0,0.785],vc:false}),
 cube('CARVING_R',[0.3,0.3,0.06],'#cbd5e1',[1.45,2.4,0.45],{rotation:[0,0,0.785],vc:false}),
 sphere('MOSS_L',[0.2,5,4],'#4d7c0f',[-1.7,0.35,0.5],{scale:[1.3,0.5,1]}),
]));
// barn
write('architecture/barn.json',template('barn','Granero',C,[
 ...walls(5.4,3.8,4.8,'#dc2626',{foundation:true}),
 cube('TRIM_1',[5.5,0.14,0.14],'#f5f5f4',[0,3.7,2.4]),cube('TRIM_2',[0.14,3.6,0.14],'#f5f5f4',[-2.65,1.9,2.42]),cube('TRIM_3',[0.14,3.6,0.14],'#f5f5f4',[2.65,1.9,2.42]),
 cube('CROSS_1',[0.14,2.2,0.08],'#f5f5f4',[-2.0,1.9,2.44],{rotation:[0,0,0.5],vc:false}),cube('CROSS_2',[0.14,2.2,0.08],'#f5f5f4',[2.0,1.9,2.44],{rotation:[0,0,-0.5],vc:false}),
 ...gable(5.4,2.0,4.8,3.8,'#7c2d12',{trim:'#f5f5f4'}),
 cube('DOOR',[1.62,2.4,0.12],WOODD,[0,1.2,2.46]),
 cube('DOOR_FRAME',[1.9,2.6,0.1],'#f5f5f4',[0,1.3,2.42]),
 cube('DOOR_BAR',[1.76,0.16,0.12],'#a16207',[0,1.26,2.54],{rotation:[0,0,0.44]}),
 cube('DOOR_BAR_2',[1.76,0.16,0.12],'#a16207',[0,1.26,2.54],{rotation:[0,0,-0.44]}),
 cube('LOFT',[1.2,0.72,0.12],'#78350f',[0,3.22,2.46]),cube('LOFT_FRAME',[1.4,0.9,0.08],'#f5f5f4',[0,3.22,2.43]),
 cube('HAY',[1.3,0.38,0.86],'#facc15',[1.48,0.24,1.42]),cube('HAY_2',[0.9,0.5,0.7],'#eab308',[2.1,0.3,2.9]),
 cube('HAY_3',[0.9,0.5,0.7],'#eab308',[1.3,0.68,1.5],{rotation:[0,0.4,0]}),
 cyl('WEATHERVANE',[0.03,0.03,0.6,4],'#374151',[0,6.1,0],{vc:false}),
 cube('VANE_ARROW',[0.5,0.06,0.04],'#374151',[0.1,6.3,0],{vc:false}),
]));
// blacksmith
write('architecture/blacksmith.json',template('blacksmith','Herreria',C,[
 ...walls(4.8,3,4.2,'#a8a29e',{posts:'#57534e'}),
 ...gable(4.8,1.6,4.2,3.0,'#6b7280'),
 cube('CHIMNEY',[0.84,2.2,0.84],'#57534e',[1.56,4.42,-0.52]),cube('CHIMNEY_CAP',[1.0,0.16,1.0],'#292524',[1.56,5.6,-0.52]),
 sphere('SMOKE_1',[0.3,6,4],'#9ca3af',[1.56,5.95,-0.5],{opacity:0.5,vc:false}),sphere('SMOKE_2',[0.22,5,4],'#d1d5db',[1.8,6.4,-0.4],{opacity:0.4,vc:false}),
 ...door('DOOR',[1.18,1.96],[-0.92,0.98,2.16]),
 cube('FORGE',[1.62,1.1,0.8],'#1f2937',[1.18,0.82,1.82]),cube('FORGE_TOP',[1.8,0.12,0.95],'#374151',[1.18,1.4,1.82]),
 cone('FIRE',[0.34,0.72,8],'#f97316',[1.18,1.72,1.82],{opacity:0.82,vc:[0.3,0.8]}),
 cone('FIRE_CORE',[0.18,0.45,6],'#fde68a',[1.18,1.7,1.82],{opacity:0.9,vc:[0.1,0.9]}),
 ...win('WINDOW',[0.9,0.78],[0.24,1.72,2.16],{color:'#7dd3fc'}),
 cyl('ANVIL_BASE',[0.3,0.36,0.5,6],'#57534e',[2.9,0.25,1.4]),cube('ANVIL',[0.9,0.3,0.34],'#374151',[2.9,0.65,1.4]),
 cone('ANVIL_HORN',[0.15,0.4,6],'#374151',[3.5,0.65,1.4],{rotation:[0,0,-PI/2]}),
 cube('SIGN',[1.0,0.5,0.1],'#78350f',[-0.9,2.6,2.2]),cube('SIGN_HAMMER',[0.3,0.12,0.04],'#cbd5e1',[-0.9,2.6,2.27],{vc:false}),
]));
// bridge
write('architecture/bridge.json',template('bridge','Puente',C,[
 cube('DECK',[3,0.3,6],'#8b4513',[0,1,0]),
 ...[0,1,2,3,4,5,6,7].map(i=>cube(`PLANK_LINE_${i+1}`,[3.02,0.05,0.05],shade('#8b4513',0.7),[0,1.16,-2.8+i*0.8],{vc:false})),
 wedge('ARCH_SUPPORT',[3.0,0.6,5.6],'#6b4423',[0,0.55,0],{rotation:[PI,0,0]}),
 cube('PIER_L',[0.5,1.0,0.6],'#64748b',[-1.2,0.5,-2.9]),cube('PIER_R',[0.5,1.0,0.6],'#64748b',[1.2,0.5,-2.9]),
 cube('PIER_L2',[0.5,1.0,0.6],'#64748b',[-1.2,0.5,2.9]),cube('PIER_R2',[0.5,1.0,0.6],'#64748b',[1.2,0.5,2.9]),
 cube('RAIL_L',[0.16,0.16,6],'#a0522d',[-1.5,2.2,0]),cube('RAIL_R',[0.16,0.16,6],'#a0522d',[1.5,2.2,0]),
 cube('RAIL_L_LOW',[0.12,0.12,6],'#a0522d',[-1.5,1.65,0]),cube('RAIL_R_LOW',[0.12,0.12,6],'#a0522d',[1.5,1.65,0]),
 ...[-2.5,-0.83,0.83,2.5].flatMap((z,i)=>[cyl(`POST_${i*2+1}`,[0.13,0.15,1.2,6],'#8b4513',[-1.5,1.7,z]),cyl(`POST_${i*2+2}`,[0.13,0.15,1.2,6],'#8b4513',[1.5,1.7,z])]),
 ...[-2.5,-0.83,0.83,2.5].flatMap((z,i)=>[pyramid(`POST_CAP_${i*2+1}`,[0.3,0.2],'#6b4423',[-1.5,2.4,z]),pyramid(`POST_CAP_${i*2+2}`,[0.3,0.2],'#6b4423',[1.5,2.4,z])]),
]));
// chapel
write('architecture/chapel.json',template('chapel','Capilla',C,[
 ...walls(4.8,4.2,7.2,'#e5e7eb',{foundation:true}),
 cube('BUTTRESS_L1',[0.4,3.0,0.5],'#d1d5db',[-2.55,1.5,1.5]),cube('BUTTRESS_L2',[0.4,3.0,0.5],'#d1d5db',[-2.55,1.5,-1.5]),
 cube('BUTTRESS_R1',[0.4,3.0,0.5],'#d1d5db',[2.55,1.5,1.5]),cube('BUTTRESS_R2',[0.4,3.0,0.5],'#d1d5db',[2.55,1.5,-1.5]),
 ...gable(4.8,1.9,7.2,4.2,'#7c2d12'),
 ...door('DOOR',[1.02,2.1],[0,1.05,3.66],{arch:true}),
 cyl('WINDOW_ROSE',[0.54,0.54,0.18,8],GLASS,[0,3.22,3.66],{rotation:[PI/2,0,0],opacity:0.72,vc:[0.25,0.85]}),
 torus('ROSE_FRAME',[0.56,0.06,4,8],'#78716c',[0,3.22,3.7],{vc:false}),
 cube('ROSE_CROSS_V',[0.06,1.0,0.06],'#78716c',[0,3.22,3.78],{vc:false}),cube('ROSE_CROSS_H',[1.0,0.06,0.06],'#78716c',[0,3.22,3.78],{vc:false}),
 ...win('WINDOW_L',[0.5,1.3],[-2.42,2.6,0.5],{axis:'x',sill:false}),...win('WINDOW_R',[0.5,1.3],[2.42,2.6,0.5],{axis:'x',sill:false}),
 ...win('WINDOW_L2',[0.5,1.3],[-2.42,2.6,-1.8],{axis:'x',sill:false}),...win('WINDOW_R2',[0.5,1.3],[2.42,2.6,-1.8],{axis:'x',sill:false}),
 cube('TOWER',[1.42,3,1.42],'#d1d5db',[0,6.2,-2.12]),
 cube('BELFRY',[1.0,0.9,1.0],'#1f2937',[0,7.3,-2.12]),cube('BELFRY_POST_1',[0.14,0.9,0.14],'#d1d5db',[-0.64,7.3,-1.48]),cube('BELFRY_POST_2',[0.14,0.9,0.14],'#d1d5db',[0.64,7.3,-1.48]),
 cube('BELFRY_POST_3',[0.14,0.9,0.14],'#d1d5db',[-0.64,7.3,-2.76]),cube('BELFRY_POST_4',[0.14,0.9,0.14],'#d1d5db',[0.64,7.3,-2.76]),
 lathe('BELL',{points:[[0.1,0.3],[0.22,0.1],[0.3,-0.2],[0.36,-0.3],[0,-0.3]],segments:8},'#ca8a04',[0,7.35,-2.12],{vc:[0.3,0.8]}),
 cone('SPIRE',[1.0,1.8,8],'#4b5563',[0,8.6,-2.12]),
 cube('CROSS',[0.12,0.72,0.12],'#f8fafc',[0,9.62,-2.12],{vc:false}),cube('CROSS_BAR',[0.42,0.12,0.12],'#f8fafc',[0,9.48,-2.12],{vc:false}),
]));
// column
write('architecture/column.json',template('column','Columna',C,[
 cube('BASE',[1.1,0.28,1.1],'#64748b',[0,0.14,0]),
 cyl('BASE_RING',[0.52,0.56,0.14,10],'#94a3b8',[0,0.35,0]),
 loft('SHAFT',{sides:10,sections:[{y:-1.5,radiusX:0.44,radiusZ:0.44},{y:0.2,radiusX:0.4,radiusZ:0.4},{y:1.5,radiusX:0.36,radiusZ:0.36}]},'#cbd5e1',[0,1.92,0]),
 ...[0,1,2,3,4].map(i=>{const a=i/5*PI*2;return cube(`FLUTE_${i+1}`,[0.06,2.9,0.06],'#a1a9b5',[Math.cos(a)*0.4,1.92,Math.sin(a)*0.4],{rotation:[0,-a,0],vc:false});}),
 cyl('CAPITAL_RING',[0.48,0.4,0.14,10],'#94a3b8',[0,3.46,0]),
 tbox('CAPITAL',{wb:0.9,wt:1.08,h:0.26},'#94a3b8',[0,3.66,0]),
 cube('TOP',[1.3,0.18,1.3],'#64748b',[0,3.88,0]),
]));
// cottage
write('architecture/cottage.json',template('cottage','Casa Campo',C,[
 ...walls(4.2,2.8,3.8,'#d6c3a1',{posts:'#6b4423'}),
 cube('BEAM_MID',[4.3,0.14,0.2],'#6b4423',[0,1.9,1.92]),
 ...gable(4.2,1.8,3.8,2.8,'#9a3412',{chimney:[1.24,-0.42,1.8]}),
 ...door('DOOR',[0.9,1.8],[0,0.9,1.96]),
 ...win('WINDOW_L',[0.88,0.78],[-1.18,1.56,1.96],{color:'#7dd3fc'}),...win('WINDOW_R',[0.88,0.78],[1.18,1.56,1.96],{color:'#7dd3fc'}),
 cube('FLOWERBOX_L',[0.96,0.2,0.26],'#78350f',[-1.18,1.05,2.1]),cube('FLOWERBOX_R',[0.96,0.2,0.26],'#78350f',[1.18,1.05,2.1]),
 sphere('FLOWERS_L',[0.26,5,4],'#ef4444',[-1.18,1.22,2.1],{scale:[1.6,0.6,0.8],vc:[0.3,0.8]}),sphere('FLOWERS_R',[0.26,5,4],'#f472b6',[1.18,1.22,2.1],{scale:[1.6,0.6,0.8],vc:[0.3,0.8]}),
 sphere('BUSH',[0.45,6,4],'#2e8b2e',[-2.5,0.4,1.6]),
]));
// dojo
write('architecture/dojo.json',template('dojo','Dojo',C,[
 cube('PLATFORM',[7.0,0.5,6.2],'#9a8a6a',[0,0.25,0]),cube('PLATFORM_STEP',[2.4,0.25,0.9],'#9a8a6a',[0,0.12,3.4]),
 cube('BODY',[6.2,2.6,5.4],'#d6c3a1',[0,1.8,0]),
 ...[[-3.1,2.7],[3.1,2.7],[-3.1,-2.7],[3.1,-2.7]].map((p,i)=>cube(`PILLAR_${i+1}`,[0.3,2.8,0.3],'#7c2d12',[p[0],1.9,p[1]])),
 cube('BEAM',[6.4,0.2,5.6],'#7c2d12',[0,3.2,0]),
 pyramid('ROOF_LOW',[7.8,1.2],'#7c2d12',[0,3.9,0],{scale:[1,1,0.98]}),
 cube('ROOF_LOW_EAVE',[8.0,0.14,7.0],'#5a1f0c',[0,3.26,0]),
 cube('ROOF_MID_WALL',[4.6,0.7,3.8],'#d6c3a1',[0,4.6,0]),
 pyramid('ROOF_TOP',[5.8,0.92],'#991b1b',[0,5.4,0],{scale:[1,1,0.86]}),
 cube('ROOF_TOP_EAVE',[5.9,0.12,5.1],'#5a1f0c',[0,4.92,0]),
 cube('FINIAL',[0.3,0.4,0.3],'#fbbf24',[0,6.0,0],{vc:[0.3,0.8]}),
 cube('DOOR',[1.32,1.86,0.12],'#78350f',[0,1.43,2.76]),cube('DOOR_SPLIT',[0.06,1.86,0.08],'#d6c3a1',[0,1.43,2.84],{vc:false}),
 cube('DOOR_FRAME',[1.6,2.05,0.1],'#5a1f0c',[0,1.5,2.72]),
 cube('WINDOW_L',[1.42,0.9,0.12],'#fef3c7',[-1.96,2.04,2.76],{opacity:0.62,vc:[0.1,0.9]}),cube('WINDOW_R',[1.42,0.9,0.12],'#fef3c7',[1.96,2.04,2.76],{opacity:0.62,vc:[0.1,0.9]}),
 ...[-2.3,-1.96,-1.62,1.62,1.96,2.3].map((x,i)=>cube(`LATTICE_${i+1}`,[0.05,0.9,0.06],'#5a1f0c',[x,2.04,2.84],{vc:false})),
 cube('LATTICE_H_L',[1.42,0.05,0.06],'#5a1f0c',[-1.96,2.04,2.84],{vc:false}),cube('LATTICE_H_R',[1.42,0.05,0.06],'#5a1f0c',[1.96,2.04,2.84],{vc:false}),
 cube('BANNER',[0.5,1.4,0.06],'#f8fafc',[2.9,2.2,2.9],{vc:false}),cube('BANNER_MARK',[0.3,0.3,0.04],'#991b1b',[2.9,2.5,2.94],{vc:false}),
]));
// door (keep pivots)
{const t=read('architecture/door.json');const g=n=>t.pieces.find(p=>p.name===n);const piv=[-0.69,1.36,0];
write('architecture/door.json',template('door','Puerta',C,[
 cube('FRAME_L',[0.22,3.05,0.28],'#6b4423',[-0.78,1.525,0],{faceColors:g('FRAME_L').faceColors}),
 cube('FRAME_R',[0.22,3.05,0.28],'#6b4423',[0.78,1.525,0],{faceColors:g('FRAME_R').faceColors}),
 cube('FRAME_TOP',[1.78,0.22,0.28],'#6b4423',[0,3,0],{faceColors:g('FRAME_TOP').faceColors}),
 cube('FRAME_CAP',[2.0,0.14,0.34],'#5b3a21',[0,3.18,0]),
 cube('THRESHOLD',[1.78,0.16,0.3],'#4b5563',[0,0.08,0]),
 cube('DOOR',[1.38,2.72,0.14],'#8b5a2b',[0,1.36,0],{pivot:piv,faceColors:g('DOOR').faceColors}),
 cube('PANEL_TOP',[0.92,0.74,0.06],'#6f451f',[0.12,1.93,0.08],{parent:'DOOR',pivot:piv}),
 cube('PANEL_BOTTOM',[0.92,1,0.06],'#6f451f',[0.12,0.88,0.08],{parent:'DOOR',pivot:piv}),
 cube('PANEL_INNER_TOP',[0.6,0.42,0.03],'#8b5a2b',[0.12,1.93,0.12],{parent:'DOOR',pivot:piv,vc:false}),
 cube('PANEL_INNER_BOTTOM',[0.6,0.68,0.03],'#8b5a2b',[0.12,0.88,0.12],{parent:'DOOR',pivot:piv,vc:false}),
 sphere('KNOB',[0.08,6,5],'#fbbf24',[0.48,1.36,0.12],{parent:'DOOR',pivot:piv,vc:[0.3,0.8]}),
 cube('KNOB_PLATE',[0.16,0.3,0.03],'#d97706',[0.48,1.36,0.08],{parent:'DOOR',pivot:piv,vc:false}),
 cyl('HINGE_TOP',[0.05,0.05,0.18,8],'#9ca3af',[-0.66,2.35,0.1],{parent:'DOOR',pivot:piv,vc:false}),
 cyl('HINGE_BOTTOM',[0.05,0.05,0.18,8],'#9ca3af',[-0.66,0.55,0.1],{parent:'DOOR',pivot:piv,vc:false}),
 cube('HINGE_STRAP_TOP',[0.5,0.08,0.03],'#6b7280',[-0.4,2.35,0.08],{parent:'DOOR',pivot:piv,vc:false}),
 cube('HINGE_STRAP_BOTTOM',[0.5,0.08,0.03],'#6b7280',[-0.4,0.55,0.08],{parent:'DOOR',pivot:piv,vc:false}),
],A('architecture/door.json')));}
// fence
write('architecture/fence.json',template('fence','Valla',C,[
 ...[-2,0,2].map((x,i)=>tbox(`POST_${i+1}`,{wb:0.26,wt:0.22,h:2},'#8b4513',[x,1,0])),
 ...[-2,0,2].map((x,i)=>pyramid(`POST_CAP_${i+1}`,[0.3,0.2],'#6b4423',[x,2.1,0])),
 cube('RAIL_TOP',[4.2,0.15,0.15],'#a0522d',[0,1.6,0]),cube('RAIL_BOT',[4.2,0.15,0.15],'#a0522d',[0,0.6,0]),
 ...[-1.5,-1,-0.5,0.5,1,1.5].map((x,i)=>cube(`PICKET_${i+1}`,[0.16,1.5,0.06],'#b5651d',[x,1.1,0.1])),
 ...[-1.5,-1,-0.5,0.5,1,1.5].map((x,i)=>pyramid(`PICKET_TIP_${i+1}`,[0.16,0.14],'#b5651d',[x,1.92,0.1],{scale:[1,1,0.4]})),
 sphere('GRASS',[0.3,5,4],'#4d7c0f',[-1.2,0.08,0.3],{scale:[1.5,0.35,1]}),
]));
// floating_platform
write('architecture/floating_platform.json',template('floating_platform','Plataforma Flotante',C,[
 tbox('PLATFORM',{wb:4.0,wt:4.8,h:0.58},'#a16207',[0,1.1,0],{faceColors:read('architecture/floating_platform.json').pieces[0].faceColors}),
 cube('TOP_TILE',[4.2,0.08,4.2],'#facc15',[0,1.42,0],{opacity:0.84,vc:[0.2,0.85]}),
 cube('TILE_LINE_1',[4.2,0.02,0.08],'#d97706',[0,1.47,0],{vc:false}),cube('TILE_LINE_2',[0.08,0.02,4.2],'#d97706',[0,1.47,0],{vc:false}),
 ...[[-1.9,-1.9],[1.9,-1.9],[-1.9,1.9],[1.9,1.9]].map((p,i)=>cube(`CORNER_${i+1}`,[0.5,0.7,0.5],'#78350f',[p[0],1.1,p[1]])),
 pyramid('UNDERSIDE',[3.4,1.2],'#78350f',[0,0.2,0],{rotation:[PI,0,0]}),
 cyl('CORE',[0.56,0.64,0.44,10],'#0ea5e9',[0,0.56,0],{opacity:0.82,vc:[0.3,0.85]}),
 torus('AURA',[1.24,0.08,4,14],'#67e8f9',[0,0.42,0],{rotation:[PI/2,0,0],opacity:0.76,vc:false}),
 sphere('ROCK_1',[0.3,5,4],'#78350f',[-1.2,-0.1,0.6],{opacity:0.8}),sphere('ROCK_2',[0.22,5,4],'#78350f',[1.1,-0.3,-0.5],{opacity:0.7}),
],A('architecture/floating_platform.json')));
// floor_tile
write('architecture/floor_tile.json',template('floor_tile','Losa de Suelo',C,[
 cube('BASE',[3,0.18,3],'#64748b',[0,0.09,0]),
 cube('BORDER_1',[3,0.04,0.14],'#475569',[0,0.19,1.43],{vc:false}),cube('BORDER_2',[3,0.04,0.14],'#475569',[0,0.19,-1.43],{vc:false}),
 cube('BORDER_3',[0.14,0.04,3],'#475569',[1.43,0.19,0],{vc:false}),cube('BORDER_4',[0.14,0.04,3],'#475569',[-1.43,0.19,0],{vc:false}),
 cube('INLAY_H',[2.3,0.04,0.22],'#cbd5e1',[0,0.19,0]),cube('INLAY_V',[0.22,0.04,2.3],'#cbd5e1',[0,0.19,0]),
 cube('INLAY_D1',[1.6,0.04,0.12],'#94a3b8',[0,0.19,0],{rotation:[0,0.785,0],vc:false}),cube('INLAY_D2',[1.6,0.04,0.12],'#94a3b8',[0,0.19,0],{rotation:[0,-0.785,0],vc:false}),
 pyramid('CENTER',[0.5,0.1],'#f8fafc',[0,0.22,0]),
 ...[[-1.1,-1.1],[1.1,-1.1],[-1.1,1.1],[1.1,1.1]].map((p,i)=>cube(`CORNER_STUD_${i+1}`,[0.2,0.06,0.2],'#94a3b8',[p[0],0.2,p[1]],{rotation:[0,0.785,0],vc:false})),
]));
// gatehouse
write('architecture/gatehouse.json',template('gatehouse','Casa Puerta',C,[
 tbox('TOWER_L',{wb:2.9,db:3.1,wt:2.6,dt:2.8,h:5.6},STONE,[-2.9,2.8,0]),
 tbox('TOWER_R',{wb:2.9,db:3.1,wt:2.6,dt:2.8,h:5.6},STONE,[2.9,2.8,0]),
 cube('TOWER_L_TOP',[3.0,0.4,3.2],'#64748b',[-2.9,5.8,0]),cube('TOWER_R_TOP',[3.0,0.4,3.2],'#64748b',[2.9,5.8,0]),
 ...[[-4.1,1.2],[-2.9,1.2],[-1.7,1.2],[-4.1,-1.2],[-2.9,-1.2],[-1.7,-1.2]].map((p,i)=>cube(`MERLON_L${i+1}`,[0.5,0.6,0.5],'#64748b',[p[0],6.3,p[1]])),
 ...[[4.1,1.2],[2.9,1.2],[1.7,1.2],[4.1,-1.2],[2.9,-1.2],[1.7,-1.2]].map((p,i)=>cube(`MERLON_R${i+1}`,[0.5,0.6,0.5],'#64748b',[p[0],6.3,p[1]])),
 cube('TOP',[4.2,1.8,2.8],'#64748b',[0,4.98,0]),
 cube('TOP_WALK',[4.2,0.3,3.2],'#475569',[0,6.0,0]),
 ...[-1.2,0,1.2].map((x,i)=>cube(`MERLON_C${i+1}`,[0.5,0.6,0.4],'#64748b',[x,6.45,1.4])),
 cube('ARCH',[3.2,4.1,2.2],'#cbd5e1',[0,2.05,0]),
 cube('ARCH_OPENING',[2.5,3.4,2.3],'#1e293b',[0,1.7,0],{vc:false}),
 wedge('ARCH_TOP_L',[0.5,0.5,2.3],'#cbd5e1',[-1.0,3.15,0],{rotation:[0,0,-PI/2]}),wedge('ARCH_TOP_R',[0.5,0.5,2.3],'#cbd5e1',[1.0,3.15,0],{rotation:[0,0,PI/2]}),
 cube('PORTCULLIS',[2.6,3.4,0.12],'#475569',[0,1.7,1.14],{pivot:[0,3.4,1.14]}),
 ...[-0.9,-0.3,0.3,0.9].map((x,i)=>cube(`PORT_BAR_V${i+1}`,[0.12,3.4,0.16],'#334155',[x,1.7,1.14],{parent:'PORTCULLIS',pivot:[0,3.4,1.14],vc:false})),
 ...[0.6,1.6,2.6].map((y,i)=>cube(`PORT_BAR_H${i+1}`,[2.6,0.12,0.16],'#334155',[0,y,1.14],{parent:'PORTCULLIS',pivot:[0,3.4,1.14],vc:false})),
 ...[-0.9,-0.3,0.3,0.9].map((x,i)=>pyramid(`PORT_SPIKE${i+1}`,[0.14,0.3],'#334155',[x,-0.1,1.14],{rotation:[PI,0,0],parent:'PORTCULLIS',pivot:[0,3.4,1.14],vc:false})),
 cube('BANNER_L',[0.5,1.4,0.08],'#dc2626',[-1.34,4.82,1.44]),cube('BANNER_R',[0.5,1.4,0.08],'#2563eb',[1.34,4.82,1.44]),
 pyramid('BANNER_L_TIP',[0.5,0.3],'#dc2626',[-1.34,3.97,1.44],{rotation:[PI,0,0],scale:[1,1,0.16]}),pyramid('BANNER_R_TIP',[0.5,0.3],'#2563eb',[1.34,3.97,1.44],{rotation:[PI,0,0],scale:[1,1,0.16]}),
 cube('BANNER_ROD',[3.2,0.08,0.08],'#374151',[0,5.55,1.44],{vc:false}),
 ...win('WINDOW_L',[0.5,0.9],[-2.9,3.6,1.56],{sill:false}),...win('WINDOW_R',[0.5,0.9],[2.9,3.6,1.56],{sill:false}),
],A('architecture/gatehouse.json')));
// gate
{const t=read('architecture/gate.json');const g=n=>t.pieces.find(p=>p.name===n);
write('architecture/gate.json',template('gate','Porton',C,[
 tbox('FRAME_L',{wb:0.5,db:0.6,wt:0.3,dt:0.4,h:3.5},'#475569',[-1.62,1.75,0]),tbox('FRAME_R',{wb:0.5,db:0.6,wt:0.3,dt:0.4,h:3.5},'#475569',[1.62,1.75,0]),
 cube('FRAME_TOP',[3.55,0.34,0.45],'#64748b',[0,3.42,0]),cube('FRAME_CAP',[3.8,0.18,0.55],'#475569',[0,3.68,0]),
 pyramid('CAP_L',[0.5,0.3],'#64748b',[-1.62,3.92,0]),pyramid('CAP_R',[0.5,0.3],'#64748b',[1.62,3.92,0]),
 cube('DOOR_L',[1.5,3,0.16],WOODD,[-0.75,1.5,0],{pivot:[-1.5,1.5,0],faceColors:g('DOOR_L').faceColors}),
 cube('DOOR_R',[1.5,3,0.16],WOODD,[0.75,1.5,0],{pivot:[1.5,1.5,0],faceColors:g('DOOR_R').faceColors}),
 cube('BAND_L',[1.4,0.14,0.08],'#374151',[-0.75,1.5,0.1],{parent:'DOOR_L',pivot:[-1.5,1.5,0],vc:false}),cube('BAND_R',[1.4,0.14,0.08],'#374151',[0.75,1.5,0.1],{parent:'DOOR_R',pivot:[1.5,1.5,0],vc:false}),
 cube('BAND_L2',[1.4,0.14,0.08],'#374151',[-0.75,2.5,0.1],{parent:'DOOR_L',pivot:[-1.5,1.5,0],vc:false}),cube('BAND_R2',[1.4,0.14,0.08],'#374151',[0.75,2.5,0.1],{parent:'DOOR_R',pivot:[1.5,1.5,0],vc:false}),
 cube('BAND_L3',[1.4,0.14,0.08],'#374151',[-0.75,0.5,0.1],{parent:'DOOR_L',pivot:[-1.5,1.5,0],vc:false}),cube('BAND_R3',[1.4,0.14,0.08],'#374151',[0.75,0.5,0.1],{parent:'DOOR_R',pivot:[1.5,1.5,0],vc:false}),
 ...[-1.2,-0.8,-0.4].flatMap((x,i)=>[cube(`PLANK_L${i+1}`,[0.04,2.9,0.04],shade(WOODD,0.7),[x,1.5,0.09],{parent:'DOOR_L',pivot:[-1.5,1.5,0],vc:false}),cube(`PLANK_R${i+1}`,[0.04,2.9,0.04],shade(WOODD,0.7),[-x,1.5,0.09],{parent:'DOOR_R',pivot:[1.5,1.5,0],vc:false})]),
 cube('RING_L',[0.24,0.24,0.06],'#1f2937',[-0.3,1.5,0.16],{rotation:[0,0,0.785],parent:'DOOR_L',pivot:[-1.5,1.5,0],vc:false}),
 cube('RING_R',[0.24,0.24,0.06],'#1f2937',[0.3,1.5,0.16],{rotation:[0,0,0.785],parent:'DOOR_R',pivot:[1.5,1.5,0],vc:false}),
 cube('THRESHOLD',[3.6,0.12,0.6],'#64748b',[0,0.06,0]),
],A('architecture/gate.json')));}
// guard_tower
write('architecture/guard_tower.json',template('guard_tower','Torre Guardia',C,[
 tbox('TOWER',{wb:3.4,wt:3.0,h:7.2},STONE,[0,3.6,0]),
 cube('TOWER_BASE',[3.8,0.5,3.8],'#64748b',[0,0.25,0]),
 cube('TOP_RING',[3.6,0.36,3.6],'#64748b',[0,7.58,0]),
 ...[[-1.55,1.55],[1.55,1.55],[-1.55,-1.55],[1.55,-1.55]].map((p,i)=>cube(`CORBEL_${i+1}`,[0.5,0.5,0.5],'#64748b',[p[0],7.2,p[1]])),
 cube('PARAPET_F',[3.6,0.5,0.3],'#64748b',[0,8.0,1.65]),cube('PARAPET_B',[3.6,0.5,0.3],'#64748b',[0,8.0,-1.65]),
 cube('PARAPET_L',[0.3,0.5,3.6],'#64748b',[-1.65,8.0,0]),cube('PARAPET_R',[0.3,0.5,3.6],'#64748b',[1.65,8.0,0]),
 ...[[-1.1,1.1],[1.1,1.1],[-1.1,-1.1],[1.1,-1.1]].map((p,i)=>cube(`ROOF_POST_${i+1}`,[0.2,1.2,0.2],'#6b4423',[p[0],8.6,p[1]])),
 pyramid('ROOF',[4.1,1.6],'#7c2d12',[0,10.0,0]),cube('ROOF_EAVE',[4.2,0.14,4.2],'#5a1f0c',[0,9.15,0]),
 ...door('DOOR',[0.92,1.92],[0,0.96,1.56],{arch:true}),
 ...win('WINDOW',[0.5,0.9],[0,5.02,1.56]),
 cube('ARROW_SLIT_L',[0.08,0.9,0.1],'#1e293b',[-1.52,3.2,0.4],{vc:false}),cube('ARROW_SLIT_R',[0.08,0.9,0.1],'#1e293b',[1.52,3.2,-0.4],{vc:false}),
 cyl('FLAG_POLE',[0.05,0.05,1.4,6],'#374151',[0.12,11.2,0],{vc:false}),
 cube('FLAG',[1.2,0.66,0.06],'#dc2626',[0.72,11.5,0],{pivot:[0.12,11.5,0]}),
 cube('FLAG_EMBLEM',[0.3,0.3,0.04],'#fde047',[0.72,11.5,0.04],{pivot:[0.12,11.5,0],parent:'FLAG',rotation:[0,0,0.785],vc:false}),
],{animations:[anim('idle',2.2,true,[track('FLAG','rotation',[kf(0,[0,0,0]),kf(1.1,[0,0.35,0.05]),kf(2.2,[0,0,0])])])]}));
// house (gable w/ chimney)
write('architecture/house.json',template('house','Casa',C,[
 ...walls(6,3,5,'#d2b48c',{posts:'#6b4423'}),
 cube('BEAM_MID',[6.1,0.14,0.2],'#6b4423',[0,1.95,2.5]),
 ...gable(6,2.5,5,3,'#8b0000',{chimney:[1.8,-1.0,2.0]}),
 cube('GABLE_TRIM_F',[0.2,0.14,0.14],'#6b4423',[0,5.4,2.9],{vc:false}),
 ...door('DOOR',[1.2,2],[0,1,2.5]),
 ...win('WINDOW_L',[1,1],[-1.8,2,2.5],{color:'#87ceeb'}),...win('WINDOW_R',[1,1],[1.8,2,2.5],{color:'#87ceeb'}),
 ...win('WINDOW_SIDE',[0.9,0.9],[3.0,2,0],{color:'#87ceeb',axis:'x'}),
 cube('SHUTTER_L1',[0.3,1.0,0.08],'#6b4423',[-2.55,2,2.56]),cube('SHUTTER_L2',[0.3,1.0,0.08],'#6b4423',[-1.05,2,2.56]),
 cube('SHUTTER_R1',[0.3,1.0,0.08],'#6b4423',[1.05,2,2.56]),cube('SHUTTER_R2',[0.3,1.0,0.08],'#6b4423',[2.55,2,2.56]),
 cube('PATH',[1.6,0.06,1.4],'#a8a29e',[0,0.03,3.5]),
 sphere('BUSH_L',[0.5,6,4],'#2e8b2e',[-2.6,0.45,3.0]),sphere('BUSH_R',[0.42,6,4],'#3cb371',[2.7,0.4,3.0]),
]));
// house_kit_* : keep structures, add gradients & small detail
{const kit=(file,extra=[])=>{const t=relTemplateColors(read(file));const names=new Set(extra.map(e=>e.name));t.pieces=t.pieces.filter(p=>!names.has(p.name));t.pieces.forEach(p=>{if(!p.vertexColors&&!p.faceColors&&p.opacity==null&&p.geometry?.type!=='plane')p.vertexColors=vc(p.color);});t.pieces.push(...extra);write(file,t);};
 kit('architecture/house_kit_corner.json',[cube('BEAM_MID_N',[3.6,0.14,0.34],'#7c4a28',[0,1.78,1.9]),cube('BEAM_MID_E',[0.34,0.14,3.6],'#7c4a28',[1.9,1.78,0]),cube('BRACE_N2',[0.16,1.45,0.16],'#8b5a2b',[0.82,2.08,1.95],{rotation:[0,0,-0.72]}),cube('BRACE_E2',[0.16,1.45,0.16],'#8b5a2b',[1.95,2.08,0.82],{rotation:[-0.72,0,0]})]);
 kit('architecture/house_kit_door.json',[cube('DOOR_PANEL',[0.8,0.8,0.04],shade(WOODD,0.82),[0,1.6,2.03],{vc:false}),cube('DOOR_PANEL_2',[0.8,0.9,0.04],shade(WOODD,0.82),[0,0.62,2.03],{vc:false}),cube('STEP',[1.8,0.14,0.6],'#78716c',[0,0.25,2.3]),cube('LANTERN',[0.22,0.3,0.22],'#fde68a',[-1.0,2.3,2.1],{opacity:0.85,vc:false}),cube('LANTERN_CAP',[0.3,0.08,0.3],'#374151',[-1.0,2.5,2.1],{vc:false})]);
 kit('architecture/house_kit_roof.json',[...[-1.6,-0.8,0,0.8,1.6].map((z,i)=>cube(`TILE_LINE_${i+1}`,[4.7,0.06,0.08],'#5b1f1f',[0,4.06,z],{rotation:[0,0,0],vc:false})),cube('CHIMNEY',[0.6,1.4,0.6],'#78716c',[1.4,4.6,-1.0]),cube('CHIMNEY_CAP',[0.74,0.14,0.74],'#57534e',[1.4,5.35,-1.0])]);
 kit('architecture/house_kit_wall.json',[cube('WALL_PLASTER_CRACK',[0.06,0.8,0.04],shade('#dbc7aa',0.8),[1.2,1.3,2.01],{rotation:[0,0,0.2],vc:false})]);
 kit('architecture/house_kit_window.json',[cube('FLOWERBOX',[1.5,0.22,0.28],'#78350f',[0,1.22,2.1]),sphere('FLOWERS',[0.3,5,4],'#ef4444',[-0.3,1.4,2.1],{scale:[1.4,0.6,0.8],vc:[0.3,0.8]}),sphere('FLOWERS_2',[0.3,5,4],'#fde047',[0.35,1.4,2.1],{scale:[1.4,0.6,0.8],vc:[0.3,0.8]})]);}
// inn
write('architecture/inn.json',template('inn','Posada',C,[
 ...walls(5.2,2.8,4.2,'#cbd5e1',{name:'BODY_LOW',foundation:true}),
 cube('BODY_TOP',[5.8,1.9,4.8],'#e5e7eb',[0,3.78,0]),
 ...[[-2.9,2.4],[2.9,2.4],[-2.9,-2.4],[2.9,-2.4]].map((p,i)=>cube(`TOP_POST_${i+1}`,[0.26,1.9,0.26],'#6b4423',[p[0],3.78,p[1]])),
 cube('TOP_BEAM',[5.9,0.18,4.9],'#6b4423',[0,2.9,0]),
 cube('TOP_BRACE_1',[0.14,1.4,0.14],'#8b5a2b',[-1.4,3.7,2.46],{rotation:[0,0,0.6],vc:false}),cube('TOP_BRACE_2',[0.14,1.4,0.14],'#8b5a2b',[1.4,3.7,2.46],{rotation:[0,0,-0.6],vc:false}),
 ...gable(5.8,1.7,4.8,4.73,'#7c2d12',{chimney:[-1.8,-1.2,1.6]}),
 ...door('DOOR',[1,1.92],[0,0.96,2.16]),
 ...win('WINDOW_L',[0.9,0.78],[-1.56,1.72,2.16]),...win('WINDOW_R',[0.9,0.78],[1.56,1.72,2.16]),
 ...win('WINDOW_TOP_L',[0.7,0.7],[-1.6,3.8,2.42],{sill:false}),...win('WINDOW_TOP_R',[0.7,0.7],[1.6,3.8,2.42],{sill:false}),
 cube('DORMER',[1.4,1.1,1.0],'#9a3412',[0,5.1,1.6]),wedge('DORMER_ROOF',[1.7,0.6,1.1],'#5a1f0c',[0,5.95,1.6]),
 cube('DORMER_WINDOW',[0.6,0.6,0.08],GLASS,[0,5.1,2.12],{opacity:0.72,vc:[0.25,0.85]}),
 cube('SIGN_ARM',[0.9,0.1,0.1],'#374151',[-2.2,3.0,2.5],{vc:false}),cube('SIGN',[0.9,0.6,0.08],'#fde047',[-2.2,2.55,2.9],{vc:[0.2,0.85]}),
 cube('SIGN_MUG',[0.3,0.36,0.04],'#92400e',[-2.2,2.55,2.95],{vc:false}),
 cube('BARREL_1',[0.6,0.7,0.6],'#8b4513',[2.9,0.35,2.9]),cube('BARREL_2',[0.6,0.7,0.6],'#8b4513',[3.5,0.35,2.4]),
]));
// library
write('architecture/library.json',template('library','Biblioteca',C,[
 ...walls(5.6,3.4,4.6,'#cbd5e1',{foundation:true}),
 cube('CORNICE',[5.8,0.3,4.8],'#94a3b8',[0,3.45,0]),
 ...hip(5.6,1.7,4.6,3.6,'#7c2d12'),
 cube('STEPS_1',[3.2,0.18,1.2],'#94a3b8',[0,0.09,2.9]),cube('STEPS_2',[2.8,0.18,0.8],'#a1a9b5',[0,0.27,2.7]),
 cube('PORTICO',[2.6,0.26,1.2],'#94a3b8',[0,2.5,2.5]),wedge('PORTICO_PED',[2.8,0.5,1.3],'#cbd5e1',[0,2.88,2.5]),
 cyl('COLUMN_L',[0.17,0.2,2.1,8],'#e2e8f0',[-0.9,1.4,2.8]),cyl('COLUMN_R',[0.17,0.2,2.1,8],'#e2e8f0',[0.9,1.4,2.8]),
 cube('COLUMN_L_CAP',[0.44,0.14,0.44],'#e2e8f0',[-0.9,2.42,2.8]),cube('COLUMN_R_CAP',[0.44,0.14,0.44],'#e2e8f0',[0.9,2.42,2.8]),
 ...door('DOOR',[1,1.92],[0,1.32,2.36],{color:'#78350f',step:false,arch:true}),
 ...win('WINDOW_L',[1.02,1.02],[-1.82,1.86,2.36]),...win('WINDOW_R',[1.02,1.02],[1.82,1.86,2.36]),
 ...win('WINDOW_SIDE_L',[0.8,1.2],[-2.8,1.9,0],{axis:'x'}),...win('WINDOW_SIDE_R',[0.8,1.2],[2.8,1.9,0],{axis:'x'}),
 cube('SIGN',[1.6,0.4,0.08],'#1e293b',[0,3.0,2.36]),cube('SIGN_TEXT',[1.1,0.1,0.04],'#fde047',[0,3.0,2.42],{vc:false}),
]));
// lighthouse
write('architecture/lighthouse.json',template('lighthouse','Faro',C,[
 cyl('ROCK',[2.6,3.0,0.5,10],'#6b7280',[0,0.25,0]),
 cyl('BASE',[2,2.4,1.1,10],'#e5e7eb',[0,0.8,0]),
 loft('TOWER',{sides:10,sections:[{y:-3.6,radiusX:1.62,radiusZ:1.62},{y:0,radiusX:1.3,radiusZ:1.3},{y:3.6,radiusX:1.08,radiusZ:1.08}]},'#f8fafc',[0,4.95,0]),
 ...[3.0,6.0].map((y,i)=>cyl(`STRIPE_${i+1}`,[1.62-((y-1.35)/7.2)*0.54+0.02,1.62-((y-0.65)/7.2)*0.54+0.02,0.7,10],'#dc2626',[0,y,0])),
 cyl('GALLERY',[1.5,1.2,0.3,12],'#374151',[0,8.5,0]),
 torus('RAILING',[1.4,0.04,4,12],'#1f2937',[0,8.95,0],{rotation:[PI/2,0,0],vc:false}),
 ...[0,1,2,3,4,5].map(i=>{const a=i/6*PI*2;return cube(`RAIL_POST_${i+1}`,[0.06,0.4,0.06],'#1f2937',[Math.cos(a)*1.4,8.78,Math.sin(a)*1.4],{vc:false});}),
 cube('LANTERN',[1.6,1.24,1.6],'#7dd3fc',[0,9.3,0],{opacity:0.54,vc:[0.3,0.85]}),
 ...[[-0.8,-0.8],[0.8,-0.8],[-0.8,0.8],[0.8,0.8]].map((p,i)=>cube(`LANTERN_POST_${i+1}`,[0.12,1.24,0.12],'#1f2937',[p[0],9.3,p[1]],{vc:false})),
 sphere('LAMP',[0.36,6,5],'#fef08a',[0,9.3,0],{opacity:0.95,vc:[0.2,0.9]}),
 cone('ROOF',[1.3,1.1,10],'#1f2937',[0,10.45,0]),sphere('ROOF_BALL',[0.14,6,4],'#fbbf24',[0,11.08,0],{vc:[0.3,0.8]}),
 cube('BEAM',[1.1,0.42,4.2],'#fef9c3',[0,9.3,2.18],{pivot:[0,9.3,0],opacity:0.36,vc:false}),
 ...door('DOOR',[0.92,1.8],[0,2.25,2.36]),
 ...win('WINDOW_1',[0.5,0.7],[0,5.5,1.35],{sill:false}),
],{animations:[anim('scan',5,true,[track('BEAM','rotation',[kf(0,[0,0,0]),kf(5,[0,PI*2,0])],'linear')])]}));
// manor
write('architecture/manor.json',template('manor','Mansion',C,[
 ...walls(6,3.6,4.8,'#d6d3d1',{name:'BODY_MAIN',foundation:true}),
 cube('WING_L',[2.2,2.8,3.8],'#cac5bf',[-4.1,1.4,0.2]),cube('WING_R',[2.2,2.8,3.8],'#cac5bf',[4.1,1.4,0.2]),
 cube('WING_L_FOUND',[2.4,0.4,4.0],'#6b7280',[-4.1,0.2,0.2]),cube('WING_R_FOUND',[2.4,0.4,4.0],'#6b7280',[4.1,0.2,0.2]),
 cube('CORNICE',[6.2,0.24,5.0],'#a8a29e',[0,3.65,0]),
 ...hip(6,1.8,4.8,3.75,'#7c2d12',{name:'ROOF_MAIN',chimney:[1.8,-1.2,1.6]}),
 ...hip(2.2,1.4,3.8,2.8,'#7c2d12',{name:'ROOF_L',overhang:0.6}).map(p=>({...p,position:[p.position[0]-4.1,p.position[1],p.position[2]+0.2]})),
 ...hip(2.2,1.4,3.8,2.8,'#7c2d12',{name:'ROOF_R',overhang:0.6}).map(p=>({...p,position:[p.position[0]+4.1,p.position[1],p.position[2]+0.2]})),
 cube('STEPS',[2.6,0.2,1.0],'#a8a29e',[0,0.1,2.9]),
 cyl('PILLAR_L',[0.14,0.16,2.2,8],'#f5f5f4',[-0.9,1.3,2.9]),cyl('PILLAR_R',[0.14,0.16,2.2,8],'#f5f5f4',[0.9,1.3,2.9]),
 cube('PORCH_ROOF',[2.6,0.2,1.2],'#a8a29e',[0,2.5,2.9]),
 ...door('DOOR',[1.12,2.08],[0,1.24,2.46],{color:'#78350f',step:false}),
 ...win('WINDOW_L',[0.86,1],[-1.84,2.02,2.46],{color:GLASS}),...win('WINDOW_R',[0.86,1],[1.84,2.02,2.46]),
 ...win('WINDOW_WL',[0.8,0.9],[-4.1,1.6,2.12]),...win('WINDOW_WR',[0.8,0.9],[4.1,1.6,2.12]),
 cube('HEDGE_L',[1.6,0.5,0.5],'#2e8b2e',[-2.2,0.25,3.2]),cube('HEDGE_R',[1.6,0.5,0.5],'#2e8b2e',[2.2,0.25,3.2]),
]));
// observatory
write('architecture/observatory.json',template('observatory','Observatorio',C,[
 cyl('BASE',[2.8,3.2,2.8,12],'#cbd5e1',[0,1.4,0]),
 cyl('BASE_RING',[2.95,2.95,0.3,12],'#94a3b8',[0,2.85,0]),
 cyl('BASE_STEP',[3.4,3.5,0.3,12],'#94a3b8',[0,0.15,0]),
 sphere('DOME',[2.4,12,8],'#94a3b8',[0,4.02,0],{scale:[1.06,0.82,1.06]}),
 ...[0,1,2,3].map(i=>{const a=i/4*PI;return torus(`DOME_RIB_${i+1}`,[2.46,0.06,4,12],'#64748b',[0,4.02,0],{rotation:[PI/2,0,0],scale:[1.06,1.06,0.82],vc:false});}).slice(0,1),
 cube('SLIT',[0.56,2.1,0.18],'#0f172a',[0,4.44,2.24],{rotation:[-0.3,0,0],vc:false}),
 cube('SLIT_DOOR_L',[0.3,2.1,0.1],'#64748b',[-0.45,4.44,2.3],{rotation:[-0.3,0,0]}),cube('SLIT_DOOR_R',[0.3,2.1,0.1],'#64748b',[0.45,4.44,2.3],{rotation:[-0.3,0,0]}),
 loft('TELESCOPE_BODY',{sides:8,sections:[{y:-1.1,radiusX:0.34,radiusZ:0.34},{y:0.3,radiusX:0.28,radiusZ:0.28},{y:1.1,radiusX:0.3,radiusZ:0.3}]},'#64748b',[0.82,3.56,0.42],{rotation:[0.92,0.38,0]}),
 cyl('TELESCOPE_LENS',[0.26,0.26,0.06,8],'#38bdf8',[1.05,4.4,1.35],{rotation:[0.92,0.38,0],vc:[0.3,0.85]}),
 cube('TELESCOPE_MOUNT',[0.52,0.72,0.52],'#475569',[0.18,2.92,-0.18]),
 ...door('DOOR',[1,1.88],[0,0.94,3.16],{color:'#78350f'}),
 ...win('WINDOW_L',[0.6,0.8],[-2.2,1.8,2.2],{sill:false}),...win('WINDOW_R',[0.6,0.8],[2.2,1.8,2.2],{sill:false}),
 pyramid('STAR',[0.3,0.3],'#fde047',[0,6.2,0],{vc:[0.3,0.8]}),cyl('STAR_POLE',[0.04,0.04,0.5,4],'#374151',[0,5.85,0],{vc:false}),
]));
// roads
{const road=(file,id,name,pieces)=>write(file,template(id,name,C,pieces));
 const G='#567d46',R='#374151',SH='#8b6b4a',Y='#facc15';
 const ground=()=>cube('GROUND',[6,0.24,6],G,[0,0.12,0]);
 const lamp=(n,pos)=>[cyl(n,[0.06,0.08,1.6,6],'#4b5563',[pos[0],1.04,pos[1]]),cube(n+'_HEAD',[0.26,0.14,0.26],'#fde68a',[pos[0],1.9,pos[1]],{opacity:0.9,vc:false})];
 const tuft=(n,pos)=>sphere(n,[0.28,5,4],'#4d7c0f',[pos[0],0.26,pos[1]],{scale:[1.4,0.35,1]});
 road('architecture/road_segment_straight.json','road_segment_straight','Segmento Carretera Recta',[ground(),
  cube('ROAD',[3.4,0.08,6],R,[0,0.28,0]),cube('SHOULDER_L',[0.55,0.05,6],SH,[-1.98,0.28,0]),cube('SHOULDER_R',[0.55,0.05,6],SH,[1.98,0.28,0]),
  cube('CURB_L',[0.14,0.1,6],'#9ca3af',[-1.7,0.3,0]),cube('CURB_R',[0.14,0.1,6],'#9ca3af',[1.7,0.3,0]),
  ...[-2,0,2].map((z,i)=>cube(`STRIPE_${i+1}`,[0.2,0.02,0.9],Y,[0,0.33,z],{vc:false})),
  cube('EDGE_LINE_L',[0.08,0.02,6],'#e5e7eb',[-1.5,0.33,0],{vc:false}),cube('EDGE_LINE_R',[0.08,0.02,6],'#e5e7eb',[1.5,0.33,0],{vc:false}),
  ...lamp('LAMP',[-2.6,-1.5]),tuft('TUFT_1',[2.6,1.8]),tuft('TUFT_2',[-2.5,2.4])]);
 road('architecture/road_segment_corner.json','road_segment_corner','Segmento Carretera Curva',[ground(),
  cube('ROAD_SOUTH',[3.4,0.08,3.1],R,[0,0.28,1.45]),cube('ROAD_EAST',[3.1,0.08,3.4],R,[1.45,0.28,0]),
  cube('SHOULDER_SOUTH_W',[0.55,0.05,3.1],SH,[-1.98,0.28,1.45]),cube('SHOULDER_EAST_N',[3.1,0.05,0.55],SH,[1.45,0.28,-1.98]),
  cube('SHOULDER_INNER_1',[0.55,0.05,1.5],SH,[1.98,0.28,-2.25]).constructor===Object?cube('SHOULDER_INNER_1',[0.55,0.05,1.5],SH,[1.98,0.28,-2.25]):null,
  cube('CURB_W',[0.14,0.1,3.1],'#9ca3af',[-1.7,0.3,1.45]),cube('CURB_N',[3.1,0.1,0.14],'#9ca3af',[1.45,0.3,-1.7]),
  cube('STRIPE_SOUTH',[0.2,0.02,0.9],Y,[0,0.33,2],{vc:false}),cube('STRIPE_MID',[0.78,0.02,0.2],Y,[0.58,0.33,0.58],{rotation:[0,0.785,0],vc:false}),cube('STRIPE_EAST',[0.9,0.02,0.2],Y,[2,0.33,0],{vc:false}),
  ...lamp('LAMP',[-2.5,-2.5]),tuft('TUFT_1',[-1.8,-1.8]),tuft('TUFT_2',[2.4,2.4])].filter(Boolean));
 road('architecture/road_segment_crossroad.json','road_segment_crossroad','Segmento Cruce Carretera',[ground(),
  cube('ROAD_MAIN',[3.4,0.08,6],R,[0,0.28,0]),cube('ROAD_CROSS',[6,0.08,3.4],R,[0,0.28,0]),
  cube('SHOULDER_N',[6,0.05,0.55],SH,[0,0.28,-1.98]),cube('SHOULDER_S',[6,0.05,0.55],SH,[0,0.28,1.98]),cube('SHOULDER_W',[0.55,0.05,6],SH,[-1.98,0.28,0]),cube('SHOULDER_E',[0.55,0.05,6],SH,[1.98,0.28,0]),
  ...['N','S','W','E'].map((k,i)=>{const p=[[0,-2.1],[0,2.1],[-2.1,0],[2.1,0]][i];const v=i<2;return cube(`MARK_${k}`,v?[0.2,0.02,0.8]:[0.8,0.02,0.2],Y,[p[0],0.33,p[1]],{vc:false});}),
  ...[[-1.7,-1.7],[1.7,-1.7],[-1.7,1.7],[1.7,1.7]].map((p,i)=>cube(`CORNER_CURB_${i+1}`,[0.3,0.1,0.3],'#9ca3af',[p[0],0.3,p[1]])),
  ...[[-0.6,-1.5],[0,-1.5],[0.6,-1.5],[-0.6,1.5],[0,1.5],[0.6,1.5]].map((p,i)=>cube(`ZEBRA_${i+1}`,[0.3,0.02,0.6],'#e5e7eb',[p[0],0.33,p[1]],{vc:false})),
  ...lamp('LAMP',[-2.6,-2.6]),...lamp('LAMP_2',[2.6,2.6])]);
 road('architecture/road_segment_t_junction.json','road_segment_t_junction','Segmento Carretera T',[ground(),
  cube('ROAD_MAIN',[3.4,0.08,6],R,[0,0.28,0]),cube('ROAD_BRANCH',[3.1,0.08,3.4],R,[1.45,0.28,0]),
  cube('SHOULDER_L',[0.55,0.05,6],SH,[-1.98,0.28,0]),cube('SHOULDER_BRANCH_N',[3.1,0.05,0.55],SH,[1.45,0.28,-1.98]),cube('SHOULDER_BRANCH_S',[3.1,0.05,0.55],SH,[1.45,0.28,1.98]),
  cube('CURB_L',[0.14,0.1,6],'#9ca3af',[-1.7,0.3,0]),
  cube('STRIPE_N',[0.2,0.02,0.9],Y,[0,0.33,-2],{vc:false}),cube('STRIPE_S',[0.2,0.02,0.9],Y,[0,0.33,2],{vc:false}),cube('STRIPE_E',[0.9,0.02,0.2],Y,[2,0.33,0],{vc:false}),
  cube('STOP_LINE',[0.1,0.02,1.4],'#e5e7eb',[1.75,0.33,0],{vc:false}),
  ...lamp('LAMP',[-2.6,-2.4]),tuft('TUFT_1',[-2.5,2.4]),cube('SIGN_POST',[0.06,1.2,0.06],'#4b5563',[2.4,0.9,-2.5],{vc:false}),cube('SIGN',[0.5,0.5,0.04],'#dc2626',[2.4,1.6,-2.5],{rotation:[0,0,0.785],vc:false})]);}
// rotating_bridge
{const t=read('architecture/rotating_bridge.json');const fc=t.pieces.find(p=>p.name==='ARM').faceColors;const piv=[0,1.1,0];
write('architecture/rotating_bridge.json',template('rotating_bridge','Puente Giratorio',C,[
 cyl('HUB_BASE',[1.0,1.1,0.3,10],'#475569',[0,0.15,0]),
 cyl('HUB',[0.62,0.72,0.8,10],'#64748b',[0,0.55,0]),
 torus('HUB_RING',[0.66,0.06,4,10],'#374151',[0,0.95,0],{rotation:[PI/2,0,0],vc:false}),
 cube('ARM',[7.6,0.34,1.34],'#8b5a2b',[0,1.1,0],{pivot:piv,faceColors:fc}),
 ...[-3,-2,-1,0,1,2,3].map((x,i)=>cube(`PLANK_${i+1}`,[0.05,0.05,1.36],shade('#8b5a2b',0.7),[x+0.5,1.28,0],{parent:'ARM',pivot:piv,vc:false})),
 cube('GUARD_L',[0.24,0.82,1.34],'#a86d3b',[-3.62,1.55,0],{parent:'ARM',pivot:piv}),cube('GUARD_R',[0.24,0.82,1.34],'#a86d3b',[3.62,1.55,0],{parent:'ARM',pivot:piv}),
 cube('RAIL_F',[7.0,0.08,0.08],'#6b4423',[0,1.7,0.6],{parent:'ARM',pivot:piv,vc:false}),cube('RAIL_B',[7.0,0.08,0.08],'#6b4423',[0,1.7,-0.6],{parent:'ARM',pivot:piv,vc:false}),
 ...[-2.4,-1.2,1.2,2.4].flatMap((x,i)=>[cube(`RAIL_POST_F${i+1}`,[0.08,0.5,0.08],'#6b4423',[x,1.5,0.6],{parent:'ARM',pivot:piv,vc:false}),cube(`RAIL_POST_B${i+1}`,[0.08,0.5,0.08],'#6b4423',[x,1.5,-0.6],{parent:'ARM',pivot:piv,vc:false})]),
 cube('CENTER_MARK',[0.92,0.08,0.92],'#facc15',[0,1.32,0],{parent:'ARM',pivot:piv,vc:[0.2,0.85]}),
 cube('ARROW',[0.5,0.02,0.1],'#1f2937',[0,1.37,0],{parent:'ARM',pivot:piv,vc:false}),
],A('architecture/rotating_bridge.json')));}
// shop
write('architecture/shop.json',template('shop','Tienda',C,[
 ...walls(4.6,2.9,4,'#fde68a',{posts:'#92400e'}),
 ...hip(4.6,1.6,4,2.9,'#7c2d12'),
 ...[-1.3,-0.65,0,0.65,1.3].map((x,i)=>cube(`AWNING_STRIPE_${i+1}`,[0.62,0.2,1.1],i%2?'#f8fafc':'#2563eb',[x,2.42,2.05],{rotation:[0.25,0,0]})),
 cube('AWNING',[3.4,0.06,1.1],'#1d4ed8',[0,2.32,2.05],{rotation:[0.25,0,0]}),
 cube('AWNING_POLE_L',[0.08,2.0,0.08],'#374151',[-1.6,1.3,2.55],{vc:false}),cube('AWNING_POLE_R',[0.08,2.0,0.08],'#374151',[1.6,1.3,2.55],{vc:false}),
 ...door('DOOR',[0.96,1.92],[-1.18,0.96,2.06]),
 ...win('WINDOW',[1.6,1.1],[0.92,1.68,2.06],{color:'#7dd3fc'}),
 cube('DISPLAY_SHELF',[1.5,0.08,0.3],'#92400e',[0.92,1.2,2.2]),
 sphere('GOODS_1',[0.14,5,4],'#ef4444',[0.6,1.36,2.2],{vc:[0.3,0.8]}),sphere('GOODS_2',[0.14,5,4],'#22c55e',[0.95,1.36,2.2],{vc:[0.3,0.8]}),sphere('GOODS_3',[0.14,5,4],'#facc15',[1.3,1.36,2.2],{vc:[0.3,0.8]}),
 cube('SIGN',[1.42,0.54,0.12],'#f59e0b',[0,3.2,2.3]),cube('SIGN_TEXT',[1.0,0.12,0.04],'#7c2d12',[0,3.2,2.38],{vc:false}),
 cube('CRATE',[0.7,0.7,0.7],'#a16207',[2.6,0.35,2.4]),
]));
// stairs
write('architecture/stairs.json',template('stairs','Escalera',C,[
 ...[0,1,2,3,4].map(i=>cube(`STEP_${i+1}`,[3,0.4,1],'#808080',[0,0.2+i*0.4,-i])),
 ...[0,1,2,3,4].map(i=>cube(`NOSING_${i+1}`,[3.04,0.08,0.12],'#9a9a9a',[0,0.36+i*0.4,0.5-i],{vc:false})),
 cube('SIDE_L',[0.3,2.0,5],'#6b6b6b',[-1.55,1.0,-2]),cube('SIDE_R',[0.3,2.0,5],'#6b6b6b',[1.55,1.0,-2]),
 wedge('SIDE_L_TOP',[0.3,2.0,5],'#6b6b6b',[-1.55,3.0,-2],{rotation:[0,0,0],scale:[1,1,1]}).constructor===Object?cube('RAIL_L',[0.12,0.12,5.2],'#4b5563',[-1.55,2.9,-2],{rotation:[0.38,0,0],vc:false}):null,
 cube('RAIL_R',[0.12,0.12,5.2],'#4b5563',[1.55,2.9,-2],{rotation:[0.38,0,0],vc:false}),
 ...[0,2,4].flatMap(i=>[cube(`BALUSTER_L${i+1}`,[0.1,0.9,0.1],'#4b5563',[-1.55,0.85+i*0.4,-i],{vc:false}),cube(`BALUSTER_R${i+1}`,[0.1,0.9,0.1],'#4b5563',[1.55,0.85+i*0.4,-i],{vc:false})]),
].filter(Boolean)));
// star_door
{const t=read('architecture/star_door.json');const g=n=>t.pieces.find(p=>p.name===n);const pl=[-1.46,1.5,0],pr=[1.46,1.5,0];
write('architecture/star_door.json',template('star_door','Puerta Estrella',C,[
 tbox('FRAME_L',{wb:0.36,db:0.44,wt:0.26,dt:0.34,h:3.3},'#8b5e34',[-1.58,1.65,0]),tbox('FRAME_R',{wb:0.36,db:0.44,wt:0.26,dt:0.34,h:3.3},'#8b5e34',[1.58,1.65,0]),
 cube('FRAME_TOP',[3.42,0.28,0.38],'#a86d3b',[0,3.26,0]),
 pyramid('FRAME_CREST',[0.9,0.5],'#fde047',[0,3.65,0],{vc:[0.3,0.8]}),
 cube('THRESHOLD',[3.4,0.12,0.5],'#78716c',[0,0.06,0]),
 cube('DOOR_L',[1.46,3,0.14],'#d97706',[-0.73,1.5,0],{pivot:pl,faceColors:g('DOOR_L').faceColors}),
 cube('DOOR_R',[1.46,3,0.14],'#d97706',[0.73,1.5,0],{pivot:pr,faceColors:g('DOOR_R').faceColors}),
 cube('DOOR_L_PANEL',[1.1,2.5,0.04],'#b45309',[-0.73,1.5,0.08],{parent:'DOOR_L',pivot:pl,vc:false}),cube('DOOR_R_PANEL',[1.1,2.5,0.04],'#b45309',[0.73,1.5,0.08],{parent:'DOOR_R',pivot:pr,vc:false}),
 pyramid('STAR_L',[0.52,0.28],'#fde047',[-0.36,1.6,0.12],{parent:'DOOR_L',pivot:pl,vc:[0.3,0.8]}),
 pyramid('STAR_R',[0.52,0.28],'#fde047',[0.36,1.6,0.12],{rotation:[0,0,PI],parent:'DOOR_R',pivot:pr,vc:[0.3,0.8]}),
 pyramid('STAR_L_UP',[0.3,0.3],'#fde047',[-0.36,1.9,0.12],{parent:'DOOR_L',pivot:pl,vc:[0.3,0.8]}),pyramid('STAR_L_DOWN',[0.3,0.3],'#fde047',[-0.36,1.3,0.12],{rotation:[PI,0,0],parent:'DOOR_L',pivot:pl,vc:[0.3,0.8]}),
 pyramid('STAR_R_UP',[0.3,0.3],'#fde047',[0.36,1.9,0.12],{parent:'DOOR_R',pivot:pr,vc:[0.3,0.8]}),pyramid('STAR_R_DOWN',[0.3,0.3],'#fde047',[0.36,1.3,0.12],{rotation:[PI,0,0],parent:'DOOR_R',pivot:pr,vc:[0.3,0.8]}),
 sphere('KNOB_L',[0.08,6,5],'#fef08a',[-0.1,1.2,0.14],{parent:'DOOR_L',pivot:pl,vc:[0.3,0.8]}),sphere('KNOB_R',[0.08,6,5],'#fef08a',[0.1,1.2,0.14],{parent:'DOOR_R',pivot:pr,vc:[0.3,0.8]}),
 ...[0.6,2.4].flatMap((y,i)=>[cube(`HINGE_L${i+1}`,[0.3,0.1,0.04],'#4b5563',[-1.3,y,0.1],{parent:'DOOR_L',pivot:pl,vc:false}),cube(`HINGE_R${i+1}`,[0.3,0.1,0.04],'#4b5563',[1.3,y,0.1],{parent:'DOOR_R',pivot:pr,vc:false})]),
],A('architecture/star_door.json')));}
// tavern
write('architecture/tavern.json',template('tavern','Taberna',C,[
 ...walls(5.6,3.1,4.4,'#d4b483',{posts:'#6b4423'}),
 cube('BEAM_MID',[5.7,0.14,0.2],'#6b4423',[0,2.0,2.2]),cube('BRACE_1',[0.14,1.2,0.14],'#8b5a2b',[-2.3,2.5,2.26],{rotation:[0,0,0.7],vc:false}),cube('BRACE_2',[0.14,1.2,0.14],'#8b5a2b',[2.3,2.5,2.26],{rotation:[0,0,-0.7],vc:false}),
 ...gable(5.6,1.8,4.4,3.1,'#7c2d12',{chimney:[-1.8,-1.0,1.6]}),
 cube('AWNING',[3.2,0.1,1.0],'#b91c1c',[0,2.5,2.6],{rotation:[0.3,0,0]}),
 cube('AWNING_POLE_L',[0.08,1.9,0.08],'#6b4423',[-1.5,1.35,3.05],{vc:false}),cube('AWNING_POLE_R',[0.08,1.9,0.08],'#6b4423',[1.5,1.35,3.05],{vc:false}),
 ...door('DOOR',[1.02,1.9],[0,0.95,2.26],{color:'#6b4423'}),
 ...win('WINDOW_L',[1,0.82],[-1.76,1.74,2.26],{color:'#fde68a'}),...win('WINDOW_R',[1,0.82],[1.76,1.74,2.26],{color:'#fde68a'}),
 cube('SIGN_ARM',[0.8,0.1,0.1],'#374151',[-2.95,3.1,2.0],{vc:false}),cube('SIGN',[0.9,0.6,0.08],'#fbbf24',[-2.95,2.65,2.35],{vc:[0.2,0.85]}),
 cube('SIGN_MUG',[0.3,0.36,0.04],'#92400e',[-2.95,2.65,2.4],{vc:false}),cube('SIGN_FOAM',[0.34,0.1,0.04],'#f8fafc',[-2.95,2.85,2.4],{vc:false}),
 cyl('BARREL_1',[0.34,0.3,0.7,8],'#8b4513',[2.5,0.35,2.9]),cyl('BARREL_2',[0.34,0.3,0.7,8],'#8b4513',[3.2,0.35,2.5]),
 cube('BENCH',[1.6,0.12,0.4],'#a0522d',[-2.2,0.5,2.9]),cube('BENCH_LEG_1',[0.12,0.5,0.4],'#6f451f',[-2.9,0.25,2.9]),cube('BENCH_LEG_2',[0.12,0.5,0.4],'#6f451f',[-1.5,0.25,2.9]),
 cube('LANTERN',[0.2,0.3,0.2],'#fde68a',[1.1,2.1,2.4],{opacity:0.9,vc:false}),cube('LANTERN_CAP',[0.28,0.08,0.28],'#374151',[1.1,2.3,2.4],{vc:false}),
]));
// temple
write('architecture/temple.json',template('temple','Templo',C,[
 cube('STAIRS',[7.2,0.56,5.6],'#cbd5e1',[0,0.28,0]),cube('STAIRS_2',[6.8,0.2,5.3],'#d9dee5',[0,0.66,-0.1]),
 cube('PLATFORM',[6.2,0.42,4.8],'#e2e8f0',[0,0.97,-0.12]),
 cube('BODY',[5.2,2.4,3.8],'#f8fafc',[0,2.38,-0.22]),
 cube('ENTABLATURE',[6.4,0.4,5.0],'#cbd5e1',[0,3.78,-0.12]),
 cube('FRIEZE',[6.3,0.18,4.9],'#94a3b8',[0,3.98,-0.12]),
 pyramid('ROOF',[6.6,1.4],'#94a3b8',[0,4.77,-0.12],{scale:[1,1,0.8]}),
 ...[-2.4,-1.2,0,1.2,2.4].map((x,i)=>cyl(`COLUMN_${i+1}`,[0.2,0.24,2.6,8],'#e5e7eb',[x,2.47,2.1])),
 ...[-2.4,-1.2,0,1.2,2.4].map((x,i)=>cube(`COLUMN_CAP_${i+1}`,[0.5,0.14,0.5],'#e5e7eb',[x,3.7,2.1])),
 ...[-2.4,-1.2,0,1.2,2.4].map((x,i)=>cube(`COLUMN_BASE_${i+1}`,[0.5,0.14,0.5],'#e5e7eb',[x,1.25,2.1])),
 ...[-2.4,2.4].map((x,i)=>cyl(`SIDE_COLUMN_${i+1}`,[0.2,0.24,2.6,8],'#e5e7eb',[x,2.47,-1.9])),
 wedge('PEDIMENT',[5.4,1.0,1.1],'#cbd5e1',[0,4.4,1.8],{rotation:[0,PI/2,0]}),
 cube('PEDIMENT_RELIEF',[1.2,0.4,0.08],'#94a3b8',[0,4.2,2.36],{vc:false}),
 ...door('DOOR',[1.2,1.8],[0,2.08,1.7],{color:'#92400e',step:false,knob:false}),
 cyl('BRAZIER_L',[0.2,0.14,0.5,6],'#374151',[-3.0,1.43,2.4]),cone('FIRE_L',[0.18,0.5,6],'#f97316',[-3.0,1.9,2.4],{opacity:0.85,vc:[0.3,0.8]}),
 cyl('BRAZIER_R',[0.2,0.14,0.5,6],'#374151',[3.0,1.43,2.4]),cone('FIRE_R',[0.18,0.5,6],'#f97316',[3.0,1.9,2.4],{opacity:0.85,vc:[0.3,0.8]}),
]));
// tower
write('architecture/tower.json',template('tower','Torre',C,[
 tbox('BASE',{wb:4.6,wt:4.2,h:6.2},STONE,[0,3.1,0]),
 cube('BASE_FOOT',[5.0,0.5,5.0],'#64748b',[0,0.25,0]),
 cube('STRING_COURSE',[4.5,0.2,4.5],'#64748b',[0,3.6,0]),
 cube('TOP_WALK',[4.6,0.3,4.6],'#64748b',[0,6.35,0]),
 ...[[-1.55,-1.95],[0,-1.95],[1.55,-1.95],[-1.55,1.95],[0,1.95],[1.55,1.95],[-1.95,0],[1.95,0]].map((p,i)=>cube(i<3?['BATTLEMENT_L','BATTLEMENT_C','BATTLEMENT_R'][i]:`BATTLEMENT_${i+1}`,i<6?[1,0.6,0.7]:[0.7,0.6,1],'#64748b',[p[0],6.8,p[1]])),
 ...door('DOOR',[1.1,1.9],[0,0.95,2.08],{arch:true}),
 ...win('WINDOW_1',[0.5,0.9],[0,3.0,2.1],{sill:false}),...win('WINDOW_2',[0.5,0.9],[0,5.0,2.1],{sill:false}),
 cube('ARROW_SLIT_L',[0.1,0.9,0.08],'#1e293b',[-2.12,4.2,0.6],{vc:false}),cube('ARROW_SLIT_R',[0.1,0.9,0.08],'#1e293b',[2.12,4.2,-0.6],{vc:false}),
 cyl('FLAG_POLE',[0.06,0.06,1.8,8],'#374151',[0,7.4,0],{vc:false}),
 cube('FLAG',[1.2,0.65,0.08],'#b91c1c',[0.65,7.65,0],{pivot:[0.05,7.65,0]}),
 cube('FLAG_EMBLEM',[0.3,0.3,0.04],'#fde047',[0.65,7.65,0.05],{parent:'FLAG',pivot:[0.05,7.65,0],rotation:[0,0,0.785],vc:false}),
 sphere('POLE_TOP',[0.1,5,4],'#fbbf24',[0,8.35,0],{vc:[0.3,0.8]}),
 sphere('IVY',[0.5,6,4],'#2e8b2e',[-2.0,1.4,1.6],{scale:[0.4,1.6,1.0]}),
],{animations:[anim('idle',2.4,true,[track('FLAG','rotation',[kf(0,[0,0,0]),kf(1.2,[0,0.3,0.06]),kf(2.4,[0,0,0])])])]}));
// townhouse
write('architecture/townhouse.json',template('townhouse','Casa Alta',C,[
 ...walls(3.6,2.8,3.4,'#cbd5e1',{name:'BODY_LOW',foundation:true}),
 cube('BODY_TOP',[3.9,2.3,3.7],'#e2e8f0',[0,3.95,0]),
 cube('JETTY_BEAM',[4.0,0.2,3.8],'#6b4423',[0,2.9,0]),
 ...[[-1.95,1.85],[1.95,1.85],[-1.95,-1.85],[1.95,-1.85]].map((p,i)=>cube(`TOP_POST_${i+1}`,[0.24,2.3,0.24],'#6b4423',[p[0],3.95,p[1]])),
 cube('TOP_BEAM_MID',[3.95,0.14,0.2],'#6b4423',[0,4.6,1.85]),
 ...gable(3.9,1.6,3.7,5.1,'#7c2d12',{chimney:[1.2,-0.9,1.3],overhang:0.5}),
 ...door('DOOR',[0.86,1.86],[0,0.93,1.76]),
 ...win('WIN_LOW_L',[0.72,0.72],[-0.96,1.72,1.76]),...win('WIN_LOW_R',[0.72,0.72],[0.96,1.72,1.76]),
 ...win('WIN_TOP_L',[0.66,0.66],[-0.86,4.1,1.85],{color:'#7dd3fc',sill:false}),...win('WIN_TOP_R',[0.66,0.66],[0.86,4.1,1.85],{color:'#7dd3fc',sill:false}),
 cube('FLOWERBOX_L',[0.8,0.18,0.24],'#78350f',[-0.86,3.7,1.95]),cube('FLOWERBOX_R',[0.8,0.18,0.24],'#78350f',[0.86,3.7,1.95]),
 sphere('FLOWERS_L',[0.22,5,4],'#ec4899',[-0.86,3.84,1.95],{scale:[1.6,0.6,0.8],vc:[0.3,0.8]}),sphere('FLOWERS_R',[0.22,5,4],'#ef4444',[0.86,3.84,1.95],{scale:[1.6,0.6,0.8],vc:[0.3,0.8]}),
 cube('LANTERN',[0.18,0.26,0.18],'#fde68a',[0.75,2.2,1.9],{opacity:0.9,vc:false}),
]));
// wall
write('architecture/wall.json',template('wall','Muro',C,[
 cube('BODY',[4.4,3,0.7],STONE,[0,1.5,0]),
 cube('TOP_TRIM',[4.7,0.25,0.85],'#64748b',[0,3.05,0]),cube('BOTTOM_TRIM',[4.7,0.28,0.85],'#64748b',[0,0.14,0]),
 cube('CENTER_BAND',[4.55,0.16,0.78],'#475569',[0,1.6,0.02]),
 ...[[-1.6,0.9],[-0.5,0.9],[0.6,0.9],[1.7,0.9],[-1.1,2.3],[0.0,2.3],[1.1,2.3]].map((p,i)=>cube(`BLOCK_${i+1}`,[0.9,0.5,0.06],tint(STONE,0.08),[p[0],p[1],0.36],{vc:false})),
 ...[[-1.1,0.9],[0.0,0.9],[1.1,0.9],[-1.6,2.3],[-0.5,2.3],[0.6,2.3],[1.7,2.3]].map((p,i)=>cube(`BLOCK_B${i+1}`,[0.9,0.5,0.06],tint(STONE,0.08),[p[0],p[1],-0.36],{vc:false})),
 ...[-1.5,0,1.5].map((x,i)=>cube(`MERLON_${i+1}`,[0.7,0.5,0.75],'#64748b',[x,3.4,0])),
 sphere('MOSS',[0.3,5,4],'#4d7c0f',[-1.8,0.4,0.42],{scale:[1.4,0.6,0.4]}),
]));
// wall_kit_*: gradients + stone block detail + arrow slits
{const kit=(file,extra=[])=>{const t=relTemplateColors(read(file));const names=new Set(extra.map(e=>e.name));t.pieces=t.pieces.filter(p=>!names.has(p.name));t.pieces.forEach(p=>{if(!p.vertexColors&&!p.faceColors&&p.opacity==null&&p.geometry?.type!=='plane')p.vertexColors=vc(p.color);});t.pieces.push(...extra);write(file,t);};
 const blocks=(prefix,z,xs,ys)=>xs.flatMap((x,i)=>ys.map((y,j)=>cube(`${prefix}_${i}_${j}`,[0.8,0.42,0.06],tint('#9aa5b1',0.1),[x+(j%2)*0.4,y,z],{vc:false})));
 kit('architecture/wall_kit_straight.json',[...blocks('BLOCK',1.82,[-1.4,-0.4,0.6],[1.0,1.7,2.4]),cube('ARROW_SLIT',[0.1,0.8,0.08],'#1e293b',[0,2.2,1.84],{vc:false}),sphere('MOSS',[0.3,5,4],'#4d7c0f',[-1.5,0.55,1.85],{scale:[1.3,0.6,0.3]})]);
 kit('architecture/wall_kit_corner.json',[...blocks('BLOCK_X',1.82,[-1.4,-0.4],[1.0,1.7,2.4]),cube('TOWER_CAP',[1.5,0.2,1.5],'#64748b',[1.35,3.8,1.35]),pyramid('TOWER_ROOF',[1.5,0.9],'#7c2d12',[1.35,4.35,1.35]),cube('ARROW_SLIT',[0.1,0.7,0.08],'#1e293b',[1.35,2.6,2.02],{vc:false})]);
 kit('architecture/wall_kit_tower.json',[cube('TOWER_CAP',[2.7,0.2,2.7],'#64748b',[0,4.25,1.1]),cube('ARROW_SLIT_F',[0.1,0.8,0.08],'#1e293b',[0,2.8,2.33],{vc:false}),cube('ARROW_SLIT_L',[0.08,0.8,0.1],'#1e293b',[-1.23,2.8,1.1],{vc:false}),cube('ARROW_SLIT_R',[0.08,0.8,0.1],'#1e293b',[1.23,2.8,1.1],{vc:false}),cube('ENTRY_FRAME',[1.2,2.0,0.1],'#64748b',[0,1.0,2.26]),cube('FLAG_POLE',[0.06,1.4,0.06],'#374151',[0,5.6,1.1],{vc:false}),cube('FLAG',[0.8,0.45,0.06],'#b91c1c',[0.43,6.05,1.1])]);
 kit('architecture/wall_kit_gate.json',[pyramid('TOWER_L_ROOF',[2.4,1.2],'#7c2d12',[-2.7,4.7,1.1]),pyramid('TOWER_R_ROOF',[2.4,1.2],'#7c2d12',[2.7,4.7,1.1]),cube('TOWER_L_CAP',[2.4,0.2,2.2],'#64748b',[-2.7,4.2,1.1]),cube('TOWER_R_CAP',[2.4,0.2,2.2],'#64748b',[2.7,4.2,1.1]),cube('ARCH_KEYSTONE',[0.5,0.5,0.3],'#cbd5e1',[0,3.1,1.95],{rotation:[0,0,0.785],vc:false}),cube('BANNER',[0.5,1.2,0.06],'#dc2626',[0,3.95,2.0],{vc:false}),cube('TORCH_L',[0.1,0.5,0.1],'#6b4423',[-1.5,2.4,1.95],{vc:false}),cone('TORCH_L_FIRE',[0.14,0.3,6],'#f97316',[-1.5,2.8,1.95],{opacity:0.85,vc:[0.3,0.8]}),cube('TORCH_R',[0.1,0.5,0.1],'#6b4423',[1.5,2.4,1.95],{vc:false}),cone('TORCH_R_FIRE',[0.14,0.3,6],'#f97316',[1.5,2.8,1.95],{opacity:0.85,vc:[0.3,0.8]})]);}
// warehouse
write('architecture/warehouse.json',template('warehouse','Almacen',C,[
 ...walls(6.8,3.6,5.2,'#b0bac6',{foundation:true}),
 ...[-2.2,0,2.2].map((x,i)=>cube(`PILASTER_${i+1}`,[0.3,3.6,0.3],'#64748b',[x,1.8,2.62])),
 ...gable(6.8,1.6,5.2,3.6,'#5b6b7e',{trim:'#334155'}),
 cube('SKYLIGHT',[1.6,0.1,1.0],'#7dd3fc',[0,4.4,0.6],{rotation:[0.6,0,0],opacity:0.7,vc:[0.3,0.85]}),
 cube('SHUTTER',[2.4,2.4,0.12],WOODD,[0,1.2,2.66]),
 ...[0.5,1.0,1.5,2.0].map((y,i)=>cube(`SHUTTER_SLAT_${i+1}`,[2.4,0.06,0.06],shade(WOODD,0.7),[0,y,2.73],{vc:false})),
 cube('SHUTTER_RAIL',[2.8,0.14,0.2],'#374151',[0,2.5,2.7]),
 ...door('DOOR',[0.84,1.78],[-2.3,0.89,2.66],{color:'#78350f'}),
 ...win('WINDOW',[1.1,0.92],[2.1,2.12,2.66]),
 cube('CRATE_STACK',[1.36,1.1,1.02],'#a16207',[-2.6,0.55,3.7]),cube('CRATE_2',[0.9,0.9,0.9],'#a16207',[-2.4,1.55,3.75]),cube('CRATE_STRAP',[1.38,0.1,1.04],'#facc15',[-2.6,0.55,3.7],{vc:false}),
 cyl('BARREL',[0.36,0.32,0.8,8],'#8b4513',[3.0,0.4,3.6]),
 cube('SIGN',[1.4,0.4,0.08],'#1e293b',[0,3.2,2.7]),cube('SIGN_TEXT',[1.0,0.1,0.04],'#f8fafc',[0,3.2,2.76],{vc:false}),
]));
// warp_pipe
{const t=read('architecture/warp_pipe.json');
write('architecture/warp_pipe.json',template('warp_pipe','Tuberia Warp',C,[
 cyl('BASE',[1.06,1.12,1.9,12],'#16a34a',[0,0.95,0]),
 cube('BASE_HIGHLIGHT',[0.2,1.9,0.06],'#4ade80',[-0.7,0.95,0.78],{rotation:[0,0.72,0],vc:false}),
 cube('BASE_SHADOW',[0.2,1.9,0.06],'#14532d',[0.75,0.95,-0.75],{rotation:[0,-0.78,0],vc:false}),
 cyl('RIM',[1.3,1.2,0.34,12],'#22c55e',[0,2.02,0],{faceColors:t.pieces[1].faceColors}),
 cyl('RIM_LIP',[1.32,1.32,0.08,12],'#4ade80',[0,2.2,0]),
 cyl('INNER_WALL',[0.88,0.88,0.48,12],'#166534',[0,1.96,0]),
 cyl('HOLE',[0.78,0.78,0.08,12],'#0f172a',[0,2.2,0],{vc:false}),
 cube('GROUND_SHADOW',[2.6,0.04,2.6],'#14532d',[0,0.02,0],{opacity:0.5,vc:false}),
 sphere('GRASS_1',[0.26,5,4],'#4d7c0f',[1.2,0.1,0.6],{scale:[1.4,0.4,1]}),sphere('GRASS_2',[0.22,5,4],'#4d7c0f',[-1.1,0.1,-0.7],{scale:[1.4,0.4,1]}),
]));}
// watermill
{const piv=[2.54,1.48,0];
write('architecture/watermill.json',template('watermill','Molino Agua',C,[
 ...walls(4.8,3.2,4.2,'#d6c3a1',{posts:'#6b4423'}),
 cube('BEAM_MID',[4.9,0.14,0.2],'#6b4423',[0,2.0,2.1]),
 ...gable(4.8,1.8,4.2,3.2,'#7c2d12',{chimney:[-1.4,-1.0,1.5]}),
 ...door('DOOR',[0.92,1.86],[-0.92,0.93,2.16]),
 ...win('WINDOW',[0.8,0.8],[1.0,1.9,2.16]),
 cube('WHEEL_RIG',[0.01,0.01,0.01],'#111827',[2.54,1.48,0],{pivot:piv,opacity:0,vc:false}),
 torus('WHEEL_RING',[1.02,0.12,4,10],'#8b5a2b',[2.54,1.48,0],{rotation:[0,PI/2,0],parent:'WHEEL_RIG',pivot:piv}),
 torus('WHEEL_RING_2',[1.02,0.12,4,10],'#8b5a2b',[2.84,1.48,0],{rotation:[0,PI/2,0],parent:'WHEEL_RIG',pivot:piv}),
 cube('WHEEL_SPOKE_V',[0.16,2.04,0.16],'#6b4423',[2.69,1.48,0],{parent:'WHEEL_RIG',pivot:piv}),
 cube('WHEEL_SPOKE_H',[0.16,2.04,0.16],'#6b4423',[2.69,1.48,0],{rotation:[PI/2,0,0],parent:'WHEEL_RIG',pivot:piv}),
 cube('WHEEL_SPOKE_D1',[0.16,2.04,0.16],'#6b4423',[2.69,1.48,0],{rotation:[0.785,0,0],parent:'WHEEL_RIG',pivot:piv}),
 cube('WHEEL_SPOKE_D2',[0.16,2.04,0.16],'#6b4423',[2.69,1.48,0],{rotation:[-0.785,0,0],parent:'WHEEL_RIG',pivot:piv}),
 ...[0,1,2,3,4,5,6,7].map(i=>{const a=i/8*PI*2;return cube(`PADDLE_${i+1}`,[0.5,0.14,0.34],'#a0522d',[2.69,1.48+Math.cos(a)*1.02,Math.sin(a)*1.02],{rotation:[-a,0,0],parent:'WHEEL_RIG',pivot:piv});}),
 cyl('AXLE',[0.1,0.1,0.8,6],'#374151',[2.6,1.48,0],{rotation:[0,0,PI/2],vc:false}),
 cube('CHANNEL',[1.4,0.3,2.4],'#7dd3fc',[1.95,2.4,-0.3],{opacity:0.74,vc:[0.25,0.85]}),
 cube('CHANNEL_SIDE_L',[0.1,0.4,2.4],'#6b4423',[1.3,2.45,-0.3]),cube('CHANNEL_SIDE_R',[0.1,0.4,2.4],'#6b4423',[2.6,2.45,-0.3]),
 cube('CHANNEL_POST',[0.16,2.4,0.16],'#6b4423',[2.6,1.2,-1.4]),
 cube('STREAM',[2.4,0.08,1.6],'#38bdf8',[2.9,0.06,0.3],{opacity:0.65,vc:[0.25,0.85]}),
 sphere('SPLASH',[0.18,5,4],'#e0f2fe',[2.7,0.3,0.2],{opacity:0.7,vc:false}),
],{animations:[anim('spin',3.6,true,[track('WHEEL_RIG','rotation',[kf(0,[0,0,0]),kf(3.6,[PI*2,0,0])],'linear')])]}));}
// well
write('architecture/well.json',template('well','Pozo',C,[
 cube('GROUND_RING',[3.6,0.12,3.6],'#78716c',[0,0.06,0]),
 cyl('BASE',[1.5,1.6,1.2,10],STONE,[0,0.6,0]),
 ...[0,1,2,3,4,5,6,7,8,9].map(i=>{const a=i/10*PI*2;return cube(`STONE_${i+1}`,[0.5,0.4,0.1],tint(STONE,0.1),[Math.cos(a)*1.5,0.45+(i%2)*0.35,Math.sin(a)*1.5],{rotation:[0,-a+PI/2,0],vc:false});}),
 torus('RIM',[1.5,0.14,4,10],'#64748b',[0,1.2,0],{rotation:[PI/2,0,0]}),
 cyl('WATER',[1.2,1.2,0.1,10],'#38bdf8',[0,1.0,0],{opacity:0.6,vc:[0.3,0.85]}),
 cube('POST_L',[0.2,2.4,0.2],WOODD,[-1.05,2.4,0]),cube('POST_R',[0.2,2.4,0.2],WOODD,[1.05,2.4,0]),
 cube('BRACE_L',[0.1,0.9,0.1],'#8b5a2b',[-0.8,2.0,0],{rotation:[0,0,-0.5],vc:false}),cube('BRACE_R',[0.1,0.9,0.1],'#8b5a2b',[0.8,2.0,0],{rotation:[0,0,0.5],vc:false}),
 cube('CROSSBEAM',[2.5,0.18,0.2],WOODD,[0,3.6,0]),
 wedge('ROOF',[2.9,1.1,2.0],'#7c2d12',[0,4.15,0],{rotation:[0,PI/2,0]}),
 cube('ROOF_RIDGE',[0.2,0.14,3.0],shade('#7c2d12',0.7),[0,4.72,0],{rotation:[0,PI/2,0]}),
 cyl('AXLE',[0.08,0.08,2.2,8],'#4b5563',[0,3.1,0],{rotation:[0,0,PI/2],vc:false}),
 cyl('CRANK',[0.05,0.05,0.4,6],'#4b5563',[1.2,3.3,0],{rotation:[0,0,0],vc:false}),cube('CRANK_HANDLE',[0.3,0.06,0.06],'#6b4423',[1.33,3.5,0],{vc:false}),
 cyl('ROPE',[0.03,0.03,1.0,4],'#d6b37a',[0,2.6,0],{vc:false}),
 cyl('BUCKET',[0.3,0.24,0.5,8],'#8b5a2b',[0,1.9,0]),torus('BUCKET_RING',[0.3,0.03,4,8],'#4b5563',[0,2.1,0],{rotation:[PI/2,0,0],vc:false}),
 cube('BUCKET_HANDLE',[0.6,0.05,0.05],'#4b5563',[0,2.3,0],{vc:false}),
]));
// windmill
{const piv=[0,4.5,1.58];
 const sail=(name,rot)=>[cube(name,[0.22,2.5,0.1],'#6b4423',[0,5.75,1.58],{rotation:[0,0,rot],pivot:piv,parent:'SAIL_RIG'}),
   cube(name+'_CLOTH',[1.0,2.0,0.06],'#f5f5f4',[0.5,5.9,1.6],{rotation:[0,0,rot],pivot:piv,parent:'SAIL_RIG',vc:[0.05,0.9]}),
   cube(name+'_LATH',[1.0,0.06,0.08],'#6b4423',[0.5,6.6,1.62],{rotation:[0,0,rot],pivot:piv,parent:'SAIL_RIG',vc:false})];
write('architecture/windmill.json',template('windmill','Molino Viento',C,[
 cyl('BASE_STEP',[2.2,2.4,0.4,10],'#78716c',[0,0.2,0]),
 loft('TOWER',{sides:8,sections:[{y:-2.9,radiusX:1.8,radiusZ:1.8},{y:0,radiusX:1.55,radiusZ:1.55},{y:2.9,radiusX:1.4,radiusZ:1.4}]},'#e7dcc7',[0,3.3,0]),
 ...[3.0].map((y,i)=>torus(`BAND_${i+1}`,[1.8-(y-0.4)/5.8*0.4,0.05,4,8],'#6b4423',[0,y,0],{rotation:[PI/2,0,0],vc:false})),
 cyl('ROOF_RING',[1.55,1.45,0.3,10],'#5a1f0c',[0,6.35,0]),
 cone('ROOF',[1.72,1.8,10],'#7c2d12',[0,7.4,0]),
 sphere('ROOF_BALL',[0.14,5,4],'#fbbf24',[0,8.36,0],{vc:[0.3,0.8]}),
 ...door('DOOR',[0.92,1.82],[0,1.31,1.76]),
 ...win('WINDOW',[0.6,0.7],[0,3.6,1.45],{sill:false}),...win('WINDOW_2',[0.5,0.6],[0,5.4,1.25],{sill:false}),
 cube('BALCONY',[1.6,0.14,0.8],'#6b4423',[0,2.9,1.9]),cube('BALCONY_RAIL',[1.6,0.08,0.08],'#6b4423',[0,3.4,2.26],{vc:false}),
 ...[-0.7,-0.23,0.23,0.7].map((x,i)=>cube(`BALCONY_POST_${i+1}`,[0.06,0.5,0.06],'#6b4423',[x,3.15,2.26],{vc:false})),
 cube('SAIL_RIG',[0.01,0.01,0.01],'#111827',[0,4.5,1.58],{pivot:piv,opacity:0,vc:false}),
 cube('SAIL_V',[0.28,4.8,0.12],'#cbd5e1',[0,4.5,1.58],{parent:'SAIL_RIG',pivot:piv,vc:false}),
 cube('SAIL_H',[4.8,0.28,0.12],'#cbd5e1',[0,4.5,1.58],{parent:'SAIL_RIG',pivot:piv,vc:false}),
 ...sail('SAIL_1',0),...sail('SAIL_2',PI/2),...sail('SAIL_3',PI),...sail('SAIL_4',-PI/2),
 cyl('AXLE',[0.14,0.14,0.6,8],'#6b4423',[0,4.5,1.5],{rotation:[PI/2,0,0]}),
 sphere('HUB',[0.26,6,5],WOODD,[0,4.5,1.74]),
],A('architecture/windmill.json')));}
// window
{const t=read('architecture/window.json');const g=n=>t.pieces.find(p=>p.name===n);
write('architecture/window.json',template('window','Ventana',C,[
 cube('GLASS',[1.52,1.52,0.08],GLASS,[0,0,0],{opacity:0.45,vc:[0.3,0.85]}),
 cube('GLASS_SHINE',[0.3,0.9,0.02],'#ffffff',[-0.45,0.2,0.06],{rotation:[0,0,0.3],opacity:0.35,vc:false}),
 cube('FRAME_TOP',[1.88,0.18,0.16],WOODD,[0,0.84,0]),cube('FRAME_BOTTOM',[1.88,0.18,0.16],WOODD,[0,-0.84,0]),
 cube('FRAME_L',[0.18,1.68,0.16],WOODD,[-0.85,0,0]),cube('FRAME_R',[0.18,1.68,0.16],WOODD,[0.85,0,0]),
 cube('LINTEL',[2.3,0.22,0.3],'#6b4423',[0,1.04,0.04]),
 cube('CROSS_V',[0.1,1.55,0.1],'#8b5a2b',[0,0,0.02]),cube('CROSS_H',[1.55,0.1,0.1],'#8b5a2b',[0,0,0.02]),
 cube('SILL',[2.02,0.16,0.4],'#6b4423',[0,-0.98,0.08]),
 cube('SILL_BRACKET_L',[0.12,0.3,0.3],'#5b3a21',[-0.8,-1.2,0.1],{vc:false}),cube('SILL_BRACKET_R',[0.12,0.3,0.3],'#5b3a21',[0.8,-1.2,0.1],{vc:false}),
 cube('SHUTTER_L',[0.56,1.52,0.12],WOODD,[-1.25,0,0.02],{pivot:[-0.97,0,0.02],faceColors:g('SHUTTER_L').faceColors}),
 cube('SHUTTER_R',[0.56,1.52,0.12],WOODD,[1.25,0,0.02],{pivot:[0.97,0,0.02],faceColors:g('SHUTTER_R').faceColors}),
 ...[-0.4,0,0.4].flatMap((y,i)=>[cube(`SHUTTER_L_SLAT_${i+1}`,[0.4,0.06,0.04],shade(WOODD,0.7),[-1.25,y,0.1],{parent:'SHUTTER_L',pivot:[-0.97,0,0.02],vc:false}),cube(`SHUTTER_R_SLAT_${i+1}`,[0.4,0.06,0.04],shade(WOODD,0.7),[1.25,y,0.1],{parent:'SHUTTER_R',pivot:[0.97,0,0.02],vc:false})]),
 cube('FLOWERBOX',[1.7,0.24,0.32],'#78350f',[0,-1.2,0.3]),
 sphere('FLOWERS_1',[0.22,5,4],'#ef4444',[-0.5,-1.0,0.3],{scale:[1.4,0.7,0.8],vc:[0.3,0.8]}),sphere('FLOWERS_2',[0.22,5,4],'#fde047',[0,-1.0,0.3],{scale:[1.4,0.7,0.8],vc:[0.3,0.8]}),sphere('FLOWERS_3',[0.22,5,4],'#ec4899',[0.5,-1.0,0.3],{scale:[1.4,0.7,0.8],vc:[0.3,0.8]}),
],A('architecture/window.json')));}
// wizard_tower
write('architecture/wizard_tower.json',template('wizard_tower','Torre Mago',C,[
 cyl('BASE_STEP',[2.4,2.6,0.4,12],'#6d28d9',[0,0.2,0]),
 loft('TOWER',{sides:10,sections:[{y:-3.7,radiusX:2.08,radiusZ:2.08},{y:0,radiusX:1.8,radiusZ:1.8},{y:3.7,radiusX:1.72,radiusZ:1.72}]},'#c4b5fd',[0,4.1,0]),
 ...[2.5,5.5].map((y,i)=>torus(`BAND_${i+1}`,[2.08-(y-0.4)/7.4*0.36,0.08,4,8],'#7c3aed',[0,y,0],{rotation:[PI/2,0,0],vc:false})),
 cyl('TOP_RING',[2.24,2.02,0.4,12],'#7c3aed',[0,8.0,0]),
 ...[0,1,2,3,4,5].map(i=>{const a=i/6*PI*2;return cube(`MERLON_${i+1}`,[0.5,0.5,0.4],'#6d28d9',[Math.cos(a)*2.0,8.45,Math.sin(a)*2.0],{rotation:[0,-a,0]});}),
 cone('ROOF',[2.1,2.6,12],'#4c1d95',[0,9.5,0]),
 ...[0,1,2].map(i=>{const a=i/3*PI*2;return pyramid(`STAR_${i+1}`,[0.3,0.3],'#fde047',[Math.cos(a)*1.2,9.2,Math.sin(a)*1.2],{rotation:[0.6*Math.sin(a),0,-0.6*Math.cos(a)],vc:[0.3,0.8]});}),
 ...door('DOOR',[1.02,1.98],[0,1.39,2.06],{color:'#78350f',arch:true}),
 ...win('WINDOW',[0.9,1.02],[0,4.44,1.84],{color:'#7dd3fc',sill:false}),
 ...win('WINDOW_2',[0.6,0.8],[0,6.4,1.76],{color:'#a5f3fc',sill:false}),
 cube('BALCONY',[1.8,0.14,0.8],'#6d28d9',[0,3.8,2.1]),
 pyramid('CRYSTAL',[0.78,1.1],'#22d3ee',[0,11.4,0],{opacity:0.82,vc:[0.35,0.7]}),
 torus('CRYSTAL_RING',[0.6,0.05,4,10],'#a5f3fc',[0,11.0,0],{rotation:[PI/2,0,0],opacity:0.7,vc:false}),
 sphere('ORB_1',[0.12,5,4],'#a5f3fc',[0.9,11.2,0],{opacity:0.9,vc:false}),sphere('ORB_2',[0.1,5,4],'#a5f3fc',[-0.7,11.5,0.5],{opacity:0.9,vc:false}),
],{animations:[anim('idle',2,true,[track('CRYSTAL','position',[kf(0,[0,11.4,0]),kf(1,[0,11.7,0]),kf(2,[0,11.4,0])]),track('CRYSTAL','rotation',[kf(0,[0,0,0]),kf(2,[0,PI*2,0])],'linear')])]}));

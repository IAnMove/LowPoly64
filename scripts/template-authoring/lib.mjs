import fs from 'node:fs'; import path from 'node:path';
export const ROOT='src/data/templates';
const clamp=(v)=>Math.max(0,Math.min(255,Math.round(v)));
const toRgb=(h)=>{h=h.replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16));};
const toHex=(r)=>'#'+r.map(v=>clamp(v).toString(16).padStart(2,'0')).join('');
export const shade=(c,k)=>toHex(toRgb(c).map(v=>v*k));
export const tint=(c,k)=>toHex(toRgb(c).map(v=>v+(255-v)*k));
export const mix=(a,b,k)=>{const A=toRgb(a),B=toRgb(b);return toHex(A.map((v,i)=>v+(B[i]-v)*k));};
// Vertex/face colors MULTIPLY the piece color (engine, glTF and saved scenes all agree).
// A gradient is therefore a light factor: white keeps the piece color, grey darkens it.
export const grey=(k)=>toHex([255*k,255*k,255*k]);
export const vc=(c,up=0.14,down=0.82)=>({top:'#ffffff',bottom:grey(Math.min(1,Math.max(0,down)))});
// Convert an authored ABSOLUTE color into a multiplier for base color `base`.
const relChannel=(c,b)=>b>1e-3?Math.min(1,c/b):1;
export const relColor=(abs,base)=>{const A=toRgb(abs).map(v=>v/255),B=toRgb(base).map(v=>v/255);return toHex(A.map((v,i)=>255*relChannel(v,B[i])));};
export const relVertexColors=(def,base)=>{
  if(!def||!base) return def;
  if(Array.isArray(def)) return def.map(c=>relColor(c,base));
  if(typeof def==='object'){const out={...def};if(def.top)out.top=relColor(def.top,base);if(def.bottom)out.bottom=relColor(def.bottom,base);return out;}
  return def;};
export const relFaceColors=(arr,base)=>Array.isArray(arr)&&base?arr.map(c=>relColor(c,base)):arr;
// Convert every absolute vertex/face color of a template (pieces[] or CharacterModel slots[]).
export function relTemplateColors(t){
  const conv=(p,base)=>{if(p.vertexColors)p.vertexColors=relVertexColors(p.vertexColors,base);if(p.faceColors)p.faceColors=relFaceColors(p.faceColors,base);};
  for(const p of t.pieces||[]) if(p&&!Array.isArray(p)) conv(p,p.color);
  for(const s of t.slots||[]) for(const p of s.pieces||[]) conv(p,p.material);
  return t;}
export const R=(v)=>Math.round(v*1000)/1000;
export const rv=(a)=>a.map(R);
export function piece(name,type,params,color,position,extra={}){
  const {vc:vcOpt,vertexColors,faceColors,...rest}=extra;
  const p={name,geometry:{type,params},color,position:rv(position)};
  if(rest.rotation)p.rotation=rv(rest.rotation);
  if(rest.scale)p.scale=rv(rest.scale);
  if(rest.pivot)p.pivot=rv(rest.pivot);
  if(rest.parent)p.parent=rest.parent;
  // Explicit vertexColors/faceColors passed here are authored as absolute colors.
  if(vertexColors)p.vertexColors=relVertexColors(vertexColors,color); else if(vcOpt!==false&&type!=='plane'&&type!=='label')p.vertexColors=vc(color,...(Array.isArray(vcOpt)?vcOpt:[]));
  if(faceColors)p.faceColors=relFaceColors(faceColors,color);
  if(rest.opacity!=null)p.opacity=rest.opacity;
  if(rest.texture)p.texture=rest.texture;
  if(rest.role)p.role=rest.role;
  if(rest.featureSlab)p.featureSlab=rest.featureSlab;
  if(rest.faceUVs)p.faceUVs=rest.faceUVs;
  return p;
}
export const cube=(n,[w,h,d],c,pos,x)=>piece(n,'cube',{width:w,height:h,depth:d},c,pos,x);
export const cyl=(n,[rt,rb,h,seg=8],c,pos,x)=>piece(n,'cylinder',{radiusTop:rt,radiusBottom:rb,height:h,radialSegments:seg},c,pos,x);
export const sphere=(n,[r,ws=6,hs=5],c,pos,x)=>piece(n,'sphere',{radius:r,widthSegments:ws,heightSegments:hs},c,pos,x);
export const cone=(n,[r,h,seg=8],c,pos,x)=>piece(n,'cone',{radius:r,height:h,radialSegments:seg},c,pos,x);
export const pyramid=(n,[w,h],c,pos,x)=>piece(n,'pyramid',{width:w,height:h},c,pos,x);
export const wedge=(n,[w,h,d],c,pos,x)=>piece(n,'wedge',{width:w,height:h,depth:d},c,pos,x);
export const tbox=(n,{wb,db,wt,dt,h,ox=0,oz=0},c,pos,x)=>piece(n,'taperedBox',{widthBottom:wb,depthBottom:db??wb,widthTop:wt,depthTop:dt??wt,height:h,offsetTopX:ox,offsetTopZ:oz},c,pos,x);
export const torus=(n,[r,tube,rs=4,ts=8],c,pos,x)=>piece(n,'torus',{radius:r,tube,radialSegments:rs,tubularSegments:ts},c,pos,x);
export const capsule=(n,[r,len,cap=2,rad=6],c,pos,x)=>piece(n,'capsule',{radius:r,length:len,capSegments:cap,radialSegments:rad},c,pos,x);
export const plane=(n,[w,h],c,pos,x)=>piece(n,'plane',{width:w,height:h},c,pos,x);
export const lathe=(n,{points,segments=8},c,pos,x)=>piece(n,'lathe',{points:points.map(rv),segments},c,pos,x);
export const loft=(n,{sides=6,sections,capTop=true,capBottom=true},c,pos,x)=>piece(n,'limbLoft',{sides,sections,capTop,capBottom},c,pos,x);
export const custom=(n,{vertices,faces},c,pos,x)=>piece(n,'custom',{vertices:vertices.map(rv),faces},c,pos,x);
export const kf=(time,value)=>({time,value:rv(value)});
export const track=(target,property,keyframes,interpolation='smooth')=>({target,property,interpolation,keyframes});
export const anim=(name,duration,loop,tracks)=>({name,duration,loop,tracks});
// Source templates are read from a pinned commit where every color is still absolute,
// so re-running any script is idempotent (it never converts its own output twice).
import { execFileSync } from 'node:child_process';
export const SOURCE_COMMIT='86a4665';
export function read(rel){return JSON.parse(execFileSync('git',['show',`${SOURCE_COMMIT}:${ROOT}/${rel}`],{encoding:'utf8',maxBuffer:64<<20}));}
export function readWorking(rel){return JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'));}
export function write(rel,t){const out={id:t.id,name:t.name,category:t.category,...t};fs.writeFileSync(path.join(ROOT,rel),JSON.stringify(out,null,2)+'\n');console.log('wrote',rel,(t.pieces||[]).length,'pieces');}
export function template(id,name,category,pieces,extra={}){return {id,name,category,...extra,pieces};}
// bob/sway helpers
export const PI=Math.PI, TAU=Math.PI*2;

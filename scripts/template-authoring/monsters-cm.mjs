// Full redesign of the 14 CharacterModel monsters (quadruped + prop-monster archetypes).
// Rules: bone pieces keep their names, pivot at the joint, NO rest rotation (skeleton clips
// overwrite rotation). Own attack clips are authored from the rest pose so they never pop.
import {vc,shade,tint,read,write,rv,relVertexColors,PI} from './lib.mjs';
const C='Monstruos';
// ---------- CharacterModel piece helpers ----------
let PIECES=null;
const add=(p)=>{PIECES.push(p);return p;};
function P(name,template,size,offset,material,x={}){
  const p={template,name,size:rv(size),offset:rv(offset),material};
  if(x.parent)p.parent=x.parent; if(x.pivot)p.pivot=rv(x.pivot); if(x.rotation)p.rotation=rv(x.rotation);
  if(x.params)p.params=x.params; if(x.opacity!=null)p.opacity=x.opacity;
  if(x.vertexColors)p.vertexColors=relVertexColors(x.vertexColors,material);
  else if(x.vc!==false&&template!=='PLANE')p.vertexColors=vc(material,0,x.shade??0.8);
  return add(p);
}
const box=(n,s,o,c,x)=>P(n,'CUBE',s,o,c,x);
const tb=(n,[wb,h,db],[wt,dt],o,c,x={})=>P(n,'TAPERED_BOX',[wb,h,db],o,c,{...x,params:{widthTop:wt,depthTop:dt,...(x.params||{})}});
const ell=(n,s,o,c,x={})=>P(n,'SPHERE',s,o,c,{...x,params:{widthSegments:x.ws??8,heightSegments:x.hs??6}});
const cyl=(n,[d,h],o,c,x={})=>P(n,'CYLINDER',[d,h,d],o,c,{...x,params:{radialSegments:x.seg??6,...(x.rt!=null?{radiusTop:x.rt}:{}),...(x.rb!=null?{radiusBottom:x.rb}:{})}});
const cone=(n,[d,h],o,c,x={})=>P(n,'CONE',[d,h,d],o,c,{...x,params:{radialSegments:x.seg??6}});
const pyr=(n,[w,h],o,c,x={})=>P(n,'PYRAMID',[w,h,w],o,c,x);
const wdg=(n,s,o,c,x={})=>P(n,'PRISM',s,o,c,x);
const tor=(n,[d,tube],o,c,x={})=>P(n,'TORUS',[d,tube*2,0],o,c,{...x,params:{radialSegments:4,tubularSegments:x.seg??10}});
const lathe=(n,points,o,c,x={})=>{const r=Math.max(...points.map(p=>p[0])),ys=points.map(p=>p[1]);return P(n,'LATHE',[r*2,Math.max(...ys)-Math.min(...ys),r*2],o,c,{...x,params:{points:points.map(rv),segments:x.seg??8}});};
// Limb from joint `a` (top) to end `b`, no rotation: slanted via section offsets.
function limb(n,a,b,rTop,rBot,c,x={}){
  const ctr=a.map((v,i)=>(v+b[i])/2),h=Math.max(0.05,a[1]-b[1]);
  const secs=[{y:-h/2,radiusX:rBot,radiusZ:rBot*(x.flat??1),offsetX:b[0]-ctr[0],offsetZ:b[2]-ctr[2]}];
  if(x.knee)secs.push({y:x.knee[0]*h-h/2,radiusX:x.knee[1],radiusZ:x.knee[1]*(x.flat??1),offsetX:(b[0]-ctr[0])*(1-x.knee[0])+(a[0]-ctr[0])*x.knee[0],offsetZ:(b[2]-ctr[2])*(1-x.knee[0])+(a[2]-ctr[2])*x.knee[0]});
  secs.push({y:h/2,radiusX:rTop,radiusZ:rTop*(x.flat??1),offsetX:a[0]-ctr[0],offsetZ:a[2]-ctr[2]});
  return P(n,'LIMB_LOFT',[Math.abs(a[0]-b[0])+2*Math.max(rTop,rBot),h,Math.abs(a[2]-b[2])+2*Math.max(rTop,rBot)],ctr,c,{...x,pivot:x.pivot??a,params:{sides:x.sides??6,sections:secs.map(s=>Object.fromEntries(Object.entries(s).map(([k,v])=>[k,+v.toFixed(3)])))}});
}
// ---------- animation helpers (rest-relative) ----------
const piv=(p)=>p.pivot||p.offset;
function rest(name){const p=PIECES.find(q=>q.name===name);if(!p)throw new Error('no piece '+name);const par=p.parent&&PIECES.find(q=>q.name===p.parent);const a=piv(p),b=par?piv(par):[0,0,0];return a.map((v,i)=>v-b[i]);}
const restRot=(name)=>PIECES.find(q=>q.name===name).rotation||[0,0,0];
const pos=(name,frames)=>({target:name,property:'position',interpolation:'smooth',keyframes:frames.map(([t,d])=>({time:t,value:rv(rest(name).map((v,i)=>v+(d[i]||0)))}))});
const rot=(name,frames)=>({target:name,property:'rotation',interpolation:'smooth',keyframes:frames.map(([t,d])=>({time:t,value:rv(restRot(name).map((v,i)=>v+(d[i]||0)))}))});
const scl=(name,frames)=>({target:name,property:'scale',interpolation:'smooth',keyframes:frames.map(([t,s])=>({time:t,value:rv(s)}))});
const Z=[0,0,0],ONE=[1,1,1];
// ---------- template assembly ----------
function monster(id,archetype,slots,anims){
  const base=read(`monsters/${id}.json`);
  const t={id:base.id,name:base.name,category:base.category||C,archetype,animationProfile:base.animationProfile,skeletonId:base.skeletonId};
  for(const k of ['assetRole','slotBindings','tags','description'])if(base[k]!==undefined)t[k]=base[k];
  t.slots=slots; if(anims?.length)t.animations=anims; write(`monsters/${id}.json`,t);
}
function slot(id,build){PIECES=[];build();return {slotId:id,pieces:PIECES};}
// Builds all slots with a shared PIECES registry so rest() can resolve across slots.
function build(spec){const all=[];const slots=[];for(const [sid,fn] of spec){const start=all.length;PIECES=all;fn();slots.push({slotId:sid,pieces:all.slice(start)});}PIECES=all;return slots;}
const eyes=(parent,y,z,x,size,white,pupil)=>{ell(`EYE_L`,[size,size,size*0.8],[-x,y,z],white,{parent,ws:6,hs:4,vc:false});ell(`EYE_R`,[size,size,size*0.8],[x,y,z],white,{parent,ws:6,hs:4,vc:false});box(`PUPIL_L`,[size*0.4,size*0.55,0.04],[-x,y,z-size*0.42],pupil,{parent,vc:false});box(`PUPIL_R`,[size*0.4,size*0.55,0.04],[x,y,z-size*0.42],pupil,{parent,vc:false});};
const DARK='#1c1917';
// Empty joint (LABEL) for bones whose visual piece needs a rest rotation.
const joint=(name,at,parent)=>add({template:'LABEL',name,offset:rv(at),pivot:rv(at),material:'#ffffff',...(parent?{parent}:{})});
// =============================== QUADRUPEDS ==========================
// Front of every quadruped is -Z; feet touch y=0.
{ // BONE HOUND
 const bone='#e7e5e4',bone2='#d6d3d1',dark='#44403c',glow='#ef4444';
 let slots=build([
  ['TORSO',()=>{tb('BODY_FRONT',[1.25,1.0,1.25],[1.05,1.0],[0,1.75,-0.3],bone);
    box('SPINE',[0.18,0.16,1.7],[0,2.3,0.25],bone2,{parent:'BODY_FRONT'});
    for(const [i,z] of [[1,-0.55],[2,-0.25],[3,0.05]]){box(`RIB_GAP_L${i}`,[0.04,0.55,0.12],[-0.62,1.7,z],dark,{parent:'BODY_FRONT',vc:false});box(`RIB_GAP_R${i}`,[0.04,0.55,0.12],[0.62,1.7,z],dark,{parent:'BODY_FRONT',vc:false});}
    box('RIBS',[1.1,0.5,0.14],[0,1.62,0.32],dark,{parent:'BODY_FRONT'});
    tb('BODY_REAR',[1.05,0.7,0.85],[0.9,0.7],[0,1.72,0.78],bone,{parent:'BODY_FRONT',pivot:[0,1.8,0.35]});}],
  ['HEAD',()=>{tb('HEAD',[0.86,0.72,0.95],[0.72,0.8],[0,2.15,-1.25],bone,{parent:'BODY_FRONT',pivot:[0,2.0,-0.85]});
    tb('SNOUT',[0.56,0.36,0.75],[0.46,0.6],[0,1.98,-1.95],bone2,{parent:'HEAD'});
    box('SOCKET_L',[0.22,0.2,0.06],[-0.22,2.2,-1.73],dark,{parent:'HEAD',vc:false});box('SOCKET_R',[0.22,0.2,0.06],[0.22,2.2,-1.73],dark,{parent:'HEAD',vc:false});
    box('EYE_L',[0.1,0.1,0.04],[-0.22,2.2,-1.77],glow,{parent:'HEAD',vc:false});box('EYE_R',[0.1,0.1,0.04],[0.22,2.2,-1.77],glow,{parent:'HEAD',vc:false});
    cone('FANG_L',[0.12,0.3],[-0.16,1.73,-2.18],'#f8fafc',{parent:'HEAD',rotation:[PI,0,0],vc:false});cone('FANG_R',[0.12,0.3],[0.16,1.73,-2.18],'#f8fafc',{parent:'HEAD',rotation:[PI,0,0],vc:false});
    pyr('EAR_L',[0.24,0.38],[-0.3,2.62,-1.05],bone2,{parent:'HEAD',rotation:[0,0,0.3]});pyr('EAR_R',[0.24,0.38],[0.3,2.62,-1.05],bone2,{parent:'HEAD',rotation:[0,0,-0.3]});}],
  ['ARM_L',()=>{limb('ARM_L',[-0.5,1.5,-0.55],[-0.55,0.12,-0.7],0.13,0.09,bone,{knee:[0.45,0.15]});box('PAW_FL',[0.3,0.12,0.36],[-0.55,0.06,-0.78],bone2,{parent:'ARM_L'});}],
  ['ARM_R',()=>{limb('ARM_R',[0.5,1.5,-0.55],[0.55,0.12,-0.7],0.13,0.09,bone,{knee:[0.45,0.15]});box('PAW_FR',[0.3,0.12,0.36],[0.55,0.06,-0.78],bone2,{parent:'ARM_R'});}],
  ['LEG_L',()=>{limb('LEG_L',[-0.45,1.5,0.85],[-0.5,0.12,1.0],0.16,0.09,bone,{knee:[0.55,0.11],parent:'BODY_REAR'});box('PAW_BL',[0.3,0.12,0.38],[-0.5,0.06,0.92],bone2,{parent:'LEG_L'});}],
  ['LEG_R',()=>{limb('LEG_R',[0.45,1.5,0.85],[0.5,0.12,1.0],0.16,0.09,bone,{knee:[0.55,0.11],parent:'BODY_REAR'});box('PAW_BR',[0.3,0.12,0.38],[0.5,0.06,0.92],bone2,{parent:'LEG_R'});}],
  ['TAIL',()=>{box('TAIL_BASE',[0.16,0.16,0.55],[0,1.95,1.42],bone2,{parent:'BODY_REAR',pivot:[0,1.9,1.15]});box('TAIL_TIP',[0.12,0.12,0.5],[0,2.08,1.88],bone,{parent:'TAIL_BASE',pivot:[0,2.0,1.65]});}],
 ]);
 for(const s of slots)for(const p of s.pieces)if(['ARM_L','ARM_R'].includes(p.name))p.parent='BODY_FRONT';
 monster('bone_hound','QUADRUPED',slots,[{name:'attack',duration:0.6,loop:false,tracks:[
   pos('BODY_FRONT',[[0,Z],[0.18,[0,-0.08,0.15]],[0.32,[0,0.05,-0.45]],[0.6,Z]]),
   rot('HEAD',[[0,Z],[0.18,[-0.35,0,0]],[0.32,[0.3,0,0]],[0.6,Z]])]}]);
}
{ // BOMB SNAIL
 const slug='#a78bfa',slug2='#8b5cf6',shell='#4b5563',band='#f59e0b';
 let slots=build([
  ['TORSO',()=>{tb('BODY_FRONT',[1.0,0.5,2.5],[0.8,2.3],[0,0.25,-0.1],slug);
    box('FOOT_SKIRT',[1.15,0.08,2.6],[0,0.04,-0.1],slug2,{parent:'BODY_FRONT'});
    ell('BODY_REAR',[1.75,1.75,1.75],[0,1.28,0.45],shell,{parent:'BODY_FRONT',pivot:[0,0.5,0.45],ws:10,hs:8,shade:0.7});
    tor('SHELL_RING',[1.78,0.09],[0,1.28,0.45],band,{parent:'BODY_REAR',rotation:[0,PI/2,0],vc:false});
    tor('SHELL_SPIRAL',[0.9,0.08],[0.82,1.35,0.45],tint(shell,0.15),{parent:'BODY_REAR',rotation:[0,PI/2,0],vc:false});
    cyl('CAP',[0.45,0.2],[0,2.18,0.45],'#9ca3af',{parent:'BODY_REAR'});
    cyl('FUSE',[0.08,0.6],[0.12,2.5,0.45],'#78350f',{parent:'BODY_REAR',rotation:[0,0,-0.35]});
    ell('SPARK',[0.26,0.26,0.26],[0.25,2.82,0.45],'#fde047',{parent:'BODY_REAR',ws:6,hs:4,opacity:0.9,vc:false});
    pyr('SPARK_RAY',[0.2,0.42],[0.25,2.98,0.45],'#fb923c',{parent:'BODY_REAR',opacity:0.85,vc:false});}],
  ['HEAD',()=>{tb('HEAD',[0.72,0.75,0.7],[0.6,0.55],[0,0.78,-1.2],slug,{parent:'BODY_FRONT',pivot:[0,0.45,-1.0]});
    cyl('STALK_L',[0.08,0.55],[-0.18,1.38,-1.25],slug2,{parent:'HEAD',rotation:[0,0,0.2]});cyl('STALK_R',[0.08,0.55],[0.18,1.38,-1.25],slug2,{parent:'HEAD',rotation:[0,0,-0.2]});
    ell('EYE_L',[0.2,0.2,0.2],[-0.24,1.66,-1.27],'#f8fafc',{parent:'HEAD',ws:6,hs:4,vc:false});ell('EYE_R',[0.2,0.2,0.2],[0.24,1.66,-1.27],'#f8fafc',{parent:'HEAD',ws:6,hs:4,vc:false});
    box('PUPIL_L',[0.08,0.1,0.04],[-0.24,1.66,-1.37],DARK,{parent:'HEAD',vc:false});box('PUPIL_R',[0.08,0.1,0.04],[0.24,1.66,-1.37],DARK,{parent:'HEAD',vc:false});
    box('MOUTH',[0.3,0.05,0.04],[0,0.72,-1.56],'#4c1d95',{parent:'HEAD',vc:false});
    ell('CHEEK_L',[0.16,0.1,0.06],[-0.24,0.86,-1.55],'#f0abfc',{parent:'HEAD',ws:6,hs:4,vc:false});ell('CHEEK_R',[0.16,0.1,0.06],[0.24,0.86,-1.55],'#f0abfc',{parent:'HEAD',ws:6,hs:4,vc:false});}],
  ['ARM_L',()=>box('ARM_L',[0.3,0.1,0.75],[-0.58,0.1,-0.55],slug2,{parent:'BODY_FRONT',pivot:[-0.45,0.15,-0.55]})],
  ['ARM_R',()=>box('ARM_R',[0.3,0.1,0.75],[0.58,0.1,-0.55],slug2,{parent:'BODY_FRONT',pivot:[0.45,0.15,-0.55]})],
  ['LEG_L',()=>box('LEG_L',[0.3,0.1,0.75],[-0.58,0.1,0.5],slug2,{parent:'BODY_REAR',pivot:[-0.45,0.15,0.5]})],
  ['LEG_R',()=>box('LEG_R',[0.3,0.1,0.75],[0.58,0.1,0.5],slug2,{parent:'BODY_REAR',pivot:[0.45,0.15,0.5]})],
  ['TAIL',()=>{tb('TAIL_BASE',[0.6,0.3,0.6],[0.3,0.3],[0,0.15,1.4],slug2,{parent:'BODY_FRONT',pivot:[0,0.2,1.1]});}],
 ]);
 monster('bomb_snail','QUADRUPED',slots,[{name:'attack',duration:0.72,loop:false,tracks:[
   pos('BODY_FRONT',[[0,Z],[0.24,[0,0,0.2]],[0.42,[0,0.05,-0.5]],[0.72,Z]]),
   scl('SPARK',[[0,ONE],[0.3,[2,2,2]],[0.45,[2.8,2.8,2.8]],[0.72,ONE]])]}]);
}
{ // CRAB SNAPPER
 const red='#ef4444',red2='#dc2626',claw='#f87171',pale='#fecaca';
 const legs=(side,parent,zs)=>zs.forEach((z,i)=>{const s=side==='L'?-1:1;limb(i===0?`LEG_${side}`:`LEG_${side}${i+1}`,[s*0.75,0.95,z],[s*1.45,0.05,z+0.1],0.09,0.05,red2,{knee:[0.5,0.1],parent,pivot:[s*0.75,0.95,z]});});
 let slots=build([
  ['TORSO',()=>{ell('BODY_FRONT',[2.1,0.95,1.7],[0,1.05,0],red,{ws:10,hs:6});
    ell('CARAPACE_TOP',[1.5,0.4,1.2],[0,1.45,0.05],tint(red,0.15),{parent:'BODY_FRONT',ws:8,hs:4});
    for(const [i,x] of [[1,-0.85],[2,-0.45],[3,0.45],[4,0.85]])cone(`RIM_SPIKE_${i}`,[0.14,0.3],[x,1.18,-0.72],claw,{parent:'BODY_FRONT',rotation:[-0.9,0,0]});
    tb('BODY_REAR',[1.2,0.35,0.6],[0.9,0.5],[0,0.82,0.95],red2,{parent:'BODY_FRONT',pivot:[0,0.95,0.7]});}],
  ['HEAD',()=>{tb('HEAD',[0.95,0.35,0.45],[0.8,0.35],[0,1.0,-0.85],red2,{parent:'BODY_FRONT',pivot:[0,1.0,-0.65]});
    cyl('EYE_STALK_L',[0.08,0.5],[-0.25,1.38,-0.88],pale,{parent:'HEAD'});cyl('EYE_STALK_R',[0.08,0.5],[0.25,1.38,-0.88],pale,{parent:'HEAD'});
    ell('EYE_L',[0.2,0.2,0.2],[-0.25,1.68,-0.9],'#f8fafc',{parent:'HEAD',ws:6,hs:4,vc:false});ell('EYE_R',[0.2,0.2,0.2],[0.25,1.68,-0.9],'#f8fafc',{parent:'HEAD',ws:6,hs:4,vc:false});
    box('PUPIL_L',[0.08,0.1,0.04],[-0.25,1.68,-1.0],DARK,{parent:'HEAD',vc:false});box('PUPIL_R',[0.08,0.1,0.04],[0.25,1.68,-1.0],DARK,{parent:'HEAD',vc:false});
    box('MOUTH',[0.4,0.08,0.06],[0,0.92,-1.08],'#7f1d1d',{parent:'HEAD',vc:false});}],
  ['ARM_L',()=>{limb('ARM_L',[-0.85,1.05,-0.55],[-1.45,0.75,-1.2],0.14,0.12,red2,{parent:'BODY_FRONT',knee:[0.5,0.15]});
    tb('CLAW_L_UPPER',[0.42,0.32,0.62],[0.2,0.3],[-1.55,0.98,-1.55],claw,{parent:'ARM_L'});
    tb('CLAW_L_LOWER',[0.36,0.2,0.5],[0.18,0.24],[-1.55,0.68,-1.5],claw,{parent:'ARM_L'});}],
  ['ARM_R',()=>{limb('ARM_R',[0.85,1.05,-0.55],[1.45,0.75,-1.2],0.14,0.12,red2,{parent:'BODY_FRONT',knee:[0.5,0.15]});
    tb('CLAW_R_UPPER',[0.42,0.32,0.62],[0.2,0.3],[1.55,0.98,-1.55],claw,{parent:'ARM_R'});
    tb('CLAW_R_LOWER',[0.36,0.2,0.5],[0.18,0.24],[1.55,0.68,-1.5],claw,{parent:'ARM_R'});}],
  ['LEG_L',()=>{legs('L','BODY_REAR',[-0.15,0.25,0.6]);for(const p of PIECES)if(/^LEG_L\d/.test(p.name))p.parent='LEG_L';}],
  ['LEG_R',()=>{legs('R','BODY_REAR',[-0.15,0.25,0.6]);for(const p of PIECES)if(/^LEG_R\d/.test(p.name))p.parent='LEG_R';}],
 ]);
 monster('crab_snapper','QUADRUPED',slots,[{name:'attack',duration:0.62,loop:false,tracks:[
   rot('ARM_L',[[0,Z],[0.2,[0.3,0.4,0]],[0.34,[-0.2,-0.3,0]],[0.62,Z]]),
   rot('ARM_R',[[0,Z],[0.2,[0.3,-0.4,0]],[0.34,[-0.2,0.3,0]],[0.62,Z]]),
   pos('BODY_FRONT',[[0,Z],[0.2,[0,0.05,0.12]],[0.34,[0,0,-0.3]],[0.62,Z]])]}]);
}
{ // ICE BEETLE
 const ice='#93c5fd',ice2='#60a5fa',frost='#e0f2fe',dark='#1e3a8a';
 let slots=build([
  ['TORSO',()=>{tb('BODY_FRONT',[1.15,0.6,0.95],[0.95,0.8],[0,1.05,-0.45],ice);
    ell('BODY_REAR',[1.7,1.0,2.0],[0,1.2,0.65],ice2,{parent:'BODY_FRONT',pivot:[0,1.05,0.0],ws:10,hs:6});
    box('ELYTRA_SPLIT',[0.05,0.35,1.9],[0,1.62,0.65],dark,{parent:'BODY_REAR',vc:false});
    [[-0.4,0.3,0.7],[0.35,0.6,0.9],[-0.25,0.95,0.6],[0.4,1.1,0.55]].forEach(([x,z,h],i)=>pyr(`ICE_SPIKE_${i+1}`,[0.3,h],[x,1.62+h/2,z],frost,{parent:'BODY_REAR',opacity:0.85,rotation:[0.2*(i%2?1:-1),0.4*i,0.15*(i%2?-1:1)]}));
    cone('SPIKE_TOP',[0.3,0.75],[0,2.05,0.55],'#f8fafc',{parent:'BODY_REAR'});}],
  ['HEAD',()=>{tb('HEAD',[0.8,0.55,0.6],[0.65,0.45],[0,1.05,-1.15],'#bfdbfe',{parent:'BODY_FRONT',pivot:[0,1.05,-0.88]});
    cone('HORN_L',[0.16,0.7],[-0.2,1.1,-1.65],'#f8fafc',{parent:'HEAD',rotation:[-1.2,0,0.35]});cone('HORN_R',[0.16,0.7],[0.2,1.1,-1.65],'#f8fafc',{parent:'HEAD',rotation:[-1.2,0,-0.35]});
    box('EYE_L',[0.14,0.12,0.05],[-0.25,1.18,-1.46],dark,{parent:'HEAD',vc:false});box('EYE_R',[0.14,0.12,0.05],[0.25,1.18,-1.46],dark,{parent:'HEAD',vc:false});
    cyl('ANTENNA_L',[0.04,0.6],[-0.2,1.55,-1.25],frost,{parent:'HEAD',rotation:[-0.5,0,0.4],vc:false});cyl('ANTENNA_R',[0.04,0.6],[0.2,1.55,-1.25],frost,{parent:'HEAD',rotation:[-0.5,0,-0.4],vc:false});}],
  ['ARM_L',()=>{limb('ARM_L',[-0.5,1.0,-0.6],[-1.15,0.05,-0.85],0.09,0.06,ice2,{knee:[0.55,0.11],parent:'BODY_FRONT'});limb('LEG_ML',[-0.55,1.0,-0.2],[-1.25,0.05,-0.1],0.09,0.06,ice2,{knee:[0.55,0.11],parent:'ARM_L'});}],
  ['ARM_R',()=>{limb('ARM_R',[0.5,1.0,-0.6],[1.15,0.05,-0.85],0.09,0.06,ice2,{knee:[0.55,0.11],parent:'BODY_FRONT'});limb('LEG_MR',[0.55,1.0,-0.2],[1.25,0.05,-0.1],0.09,0.06,ice2,{knee:[0.55,0.11],parent:'ARM_R'});}],
  ['LEG_L',()=>limb('LEG_L',[-0.55,1.0,0.6],[-1.2,0.05,1.0],0.09,0.06,ice2,{knee:[0.55,0.11],parent:'BODY_REAR'})],
  ['LEG_R',()=>limb('LEG_R',[0.55,1.0,0.6],[1.2,0.05,1.0],0.09,0.06,ice2,{knee:[0.55,0.11],parent:'BODY_REAR'})],
 ]);
 monster('ice_beetle','QUADRUPED',slots,[{name:'attack',duration:0.58,loop:false,tracks:[
   rot('HEAD',[[0,Z],[0.18,[0.35,0,0]],[0.3,[-0.3,0,0]],[0.58,Z]]),
   pos('BODY_FRONT',[[0,Z],[0.18,[0,-0.05,0.15]],[0.3,[0,0,-0.4]],[0.58,Z]])]}]);
}
{ // LAVA TOAD
 const lava='#ea580c',lava2='#c2410c',glow='#fde047',belly='#fdba74';
 let slots=build([
  ['TORSO',()=>{ell('BODY_FRONT',[2.0,1.25,1.7],[0,1.15,-0.2],lava,{ws:8,hs:5});
    ell('BELLY',[1.5,0.8,1.0],[0,0.88,-0.55],belly,{parent:'BODY_FRONT',ws:8,hs:4});
    ell('BODY_REAR',[1.9,1.15,1.5],[0,1.0,0.75],lava2,{parent:'BODY_FRONT',pivot:[0,1.1,0.3],ws:8,hs:5});
    box('LAVA_STRIPE',[0.36,0.1,1.6],[0,1.8,0.25],glow,{parent:'BODY_FRONT',vc:false});
    for(const [i,[x,y,z,r]] of [[-0.6,1.55,0.1,0.18],[0.55,1.6,0.4,0.16],[-0.35,1.45,0.95,0.14],[0.5,1.4,1.05,0.15],[0.0,1.62,0.85,0.12]].entries())ell(`LAVA_SPOT_${i+1}`,[r*2,r,r*2],[x,y,z],glow,{parent:i<2?'BODY_FRONT':'BODY_REAR',ws:6,hs:4,vc:false});}],
  ['HEAD',()=>{tb('HEAD',[1.7,0.62,1.0],[1.4,0.8],[0,1.45,-1.15],'#f97316',{parent:'BODY_FRONT',pivot:[0,1.3,-0.8]});
    tb('JAW',[1.6,0.25,0.95],[1.5,0.85],[0,1.06,-1.18],belly,{parent:'HEAD'});
    box('MOUTH_LINE',[1.55,0.06,0.06],[0,1.2,-1.66],'#7c2d12',{parent:'HEAD',vc:false});
    box('TONGUE',[0.22,0.08,0.4],[0,1.2,-1.5],'#f472b6',{parent:'HEAD',pivot:[0,1.2,-1.35],vc:false});
    ell('EYE_L',[0.42,0.42,0.42],[-0.5,1.85,-1.25],'#fff7ed',{parent:'HEAD',ws:6,hs:4,vc:false});ell('EYE_R',[0.42,0.42,0.42],[0.5,1.85,-1.25],'#fff7ed',{parent:'HEAD',ws:6,hs:4,vc:false});
    box('PUPIL_L',[0.12,0.2,0.04],[-0.5,1.85,-1.47],DARK,{parent:'HEAD',vc:false});box('PUPIL_R',[0.12,0.2,0.04],[0.5,1.85,-1.47],DARK,{parent:'HEAD',vc:false});
    ell('BROW_L',[0.46,0.12,0.3],[-0.5,2.08,-1.2],lava2,{parent:'HEAD',ws:6,hs:4});ell('BROW_R',[0.46,0.12,0.3],[0.5,2.08,-1.2],lava2,{parent:'HEAD',ws:6,hs:4});}],
  ['ARM_L',()=>{limb('ARM_L',[-0.7,0.95,-0.7],[-0.9,0.08,-0.95],0.2,0.13,lava2,{parent:'BODY_FRONT'});tb('HAND_L',[0.55,0.1,0.5],[0.45,0.4],[-0.95,0.05,-1.05],lava,{parent:'ARM_L'});}],
  ['ARM_R',()=>{limb('ARM_R',[0.7,0.95,-0.7],[0.9,0.08,-0.95],0.2,0.13,lava2,{parent:'BODY_FRONT'});tb('HAND_R',[0.55,0.1,0.5],[0.45,0.4],[0.95,0.05,-1.05],lava,{parent:'ARM_R'});}],
  ['LEG_L',()=>{ell('LEG_L',[0.7,0.9,1.1],[-0.95,0.6,0.85],lava2,{parent:'BODY_REAR',pivot:[-0.75,0.95,0.7],ws:6,hs:4});tb('FOOT_L',[0.7,0.12,0.8],[0.55,0.6],[-1.05,0.06,0.6],lava,{parent:'LEG_L'});}],
  ['LEG_R',()=>{ell('LEG_R',[0.7,0.9,1.1],[0.95,0.6,0.85],lava2,{parent:'BODY_REAR',pivot:[0.75,0.95,0.7],ws:6,hs:4});tb('FOOT_R',[0.7,0.12,0.8],[0.55,0.6],[1.05,0.06,0.6],lava,{parent:'LEG_R'});}],
 ]);
 monster('lava_toad','QUADRUPED',slots,[{name:'attack',duration:0.7,loop:false,tracks:[
   pos('BODY_FRONT',[[0,Z],[0.2,[0,-0.15,0.1]],[0.38,[0,0.5,-0.5]],[0.7,Z]]),
   pos('BODY_REAR',[[0,Z],[0.2,[0,-0.1,0]],[0.38,[0,0.1,0]],[0.7,Z]]),
   scl('TONGUE',[[0,ONE],[0.38,[1,1,1]],[0.48,[1,1,5]],[0.6,[1,1,1]],[0.7,ONE]])]}]);
}
{ // MOLE DRILLER
 const fur='#7c3f18',fur2='#6b3415',hand='#f9a8d4',steel='#cbd5e1',hat='#facc15';
 let slots=build([
  ['TORSO',()=>{tb('BODY_FRONT',[1.6,1.15,1.35],[1.35,1.15],[0,1.25,-0.25],fur);
    tb('BELLY',[1.1,0.8,0.1],[0.9,0.1],[0,1.15,-0.95],'#a16207',{parent:'BODY_FRONT'});
    ell('BODY_REAR',[1.6,1.2,1.6],[0,1.15,0.75],fur2,{parent:'BODY_FRONT',pivot:[0,1.2,0.3],ws:10,hs:6});
    box('BELT',[1.65,0.18,1.4],[0,0.8,-0.25],'#44403c',{parent:'BODY_FRONT'});box('BUCKLE',[0.22,0.16,0.04],[0,0.8,-0.97],'#fbbf24',{parent:'BODY_FRONT',vc:false});}],
  ['HEAD',()=>{tb('HEAD',[1.1,0.85,0.95],[0.9,0.75],[0,1.95,-1.0],'#8b451f',{parent:'BODY_FRONT',pivot:[0,1.75,-0.7]});
    cone('DRILL',[0.6,1.15],[0,1.85,-1.95],steel,{parent:'HEAD',rotation:[-PI/2,0,0],pivot:[0,1.85,-1.5]});
    tor('DRILL_RING_1',[0.5,0.04],[0,1.85,-1.8],'#94a3b8',{parent:'DRILL',vc:false});tor('DRILL_RING_2',[0.32,0.04],[0,1.85,-2.1],'#94a3b8',{parent:'DRILL',vc:false});
    box('GOGGLE_BAND',[1.15,0.14,0.98],[0,2.15,-1.0],'#292524',{parent:'HEAD'});
    cyl('GOGGLE_L',[0.28,0.08],[-0.25,2.15,-1.5],'#fde68a',{parent:'HEAD',rotation:[PI/2,0,0],vc:false});cyl('GOGGLE_R',[0.28,0.08],[0.25,2.15,-1.5],'#fde68a',{parent:'HEAD',rotation:[PI/2,0,0],vc:false});
    lathe('HARD_HAT',[[0,0.25],[0.4,0.22],[0.55,0.0],[0.65,-0.05],[0.65,-0.1]],[0,2.5,-0.95],hat,{parent:'HEAD',seg:10});
    cyl('HAT_LAMP',[0.2,0.14],[0,2.6,-1.5],'#fef9c3',{parent:'HEAD',rotation:[PI/2,0,0],vc:false});
    box('WHISKER_L',[0.4,0.03,0.03],[-0.45,1.7,-1.45],DARK,{parent:'HEAD',rotation:[0,0,0.2],vc:false});box('WHISKER_R',[0.4,0.03,0.03],[0.45,1.7,-1.45],DARK,{parent:'HEAD',rotation:[0,0,-0.2],vc:false});}],
  ['ARM_L',()=>{limb('ARM_L',[-0.85,1.5,-0.55],[-1.0,0.4,-0.85],0.22,0.18,fur2,{parent:'BODY_FRONT'});tb('CLAW_L',[0.62,0.18,0.6],[0.5,0.5],[-1.05,0.28,-1.0],hand,{parent:'ARM_L'});
    for(const [i,x] of [[1,-0.85],[2,-1.05],[3,-1.25]])cone(`CLAW_L_TIP_${i}`,[0.1,0.3],[x,0.25,-1.38],'#f8fafc',{parent:'ARM_L',rotation:[-PI/2,0,0],vc:false});}],
  ['ARM_R',()=>{limb('ARM_R',[0.85,1.5,-0.55],[1.0,0.4,-0.85],0.22,0.18,fur2,{parent:'BODY_FRONT'});tb('CLAW_R',[0.62,0.18,0.6],[0.5,0.5],[1.05,0.28,-1.0],hand,{parent:'ARM_R'});
    for(const [i,x] of [[1,0.85],[2,1.05],[3,1.25]])cone(`CLAW_R_TIP_${i}`,[0.1,0.3],[x,0.25,-1.38],'#f8fafc',{parent:'ARM_R',rotation:[-PI/2,0,0],vc:false});}],
  ['LEG_L',()=>{limb('LEG_L',[-0.6,0.8,0.85],[-0.65,0.1,0.9],0.2,0.16,fur2,{parent:'BODY_REAR'});tb('FOOT_L',[0.42,0.14,0.62],[0.36,0.5],[-0.65,0.07,0.75],hand,{parent:'LEG_L'});}],
  ['LEG_R',()=>{limb('LEG_R',[0.6,0.8,0.85],[0.65,0.1,0.9],0.2,0.16,fur2,{parent:'BODY_REAR'});tb('FOOT_R',[0.42,0.14,0.62],[0.36,0.5],[0.65,0.07,0.75],hand,{parent:'LEG_R'});}],
  ['TAIL',()=>{joint('TAIL_BASE',[0,1.0,1.45],'BODY_REAR');cone('TAIL_NUB',[0.18,0.5],[0,1.0,1.65],hand,{parent:'TAIL_BASE',rotation:[PI/2,0,0]});}],
 ]);
 monster('mole_driller','QUADRUPED',slots,[{name:'attack',duration:0.64,loop:false,tracks:[
   pos('HEAD',[[0,Z],[0.2,[0,0,0.2]],[0.34,[0,-0.05,-0.45]],[0.64,Z]]),
   pos('BODY_FRONT',[[0,Z],[0.2,[0,0,0.1]],[0.34,[0,0,-0.25]],[0.64,Z]]),
   rot('DRILL',[[0,Z],[0.64,[0,PI*4,0]]])]}]);
}
{ // SHELL RUNNER
 const skin='#34d399',skin2='#10b981',shell='#2563eb',plate='#1d4ed8',shoe='#f8fafc',shoeRed='#ef4444';
 let slots=build([
  ['TORSO',()=>{tb('BODY_FRONT',[1.15,0.55,1.0],[1.0,0.9],[0,1.05,-0.45],skin2);
    tb('PLASTRON',[1.3,0.18,1.9],[1.2,1.8],[0,0.95,0.3],'#fde68a',{parent:'BODY_FRONT'});
    lathe('BODY_REAR',[[0,0.75],[0.6,0.68],[0.95,0.35],[1.08,0.0],[1.1,-0.05]],[0,1.12,0.35],shell,{parent:'BODY_FRONT',pivot:[0,1.1,0.0],seg:10});
    tor('SHELL_RING',[2.15,0.07],[0,1.1,0.35],'#facc15',{parent:'BODY_REAR',rotation:[PI/2,0,0],vc:false});
    for(const [i,[x,z]] of [[0,0.35],[-0.45,0.0],[0.45,0.0],[-0.45,0.7],[0.45,0.7]].entries())cyl(`SHELL_PLATE_${i+1}`,[0.42,0.06],[x,i?1.62:1.88,z],plate,{parent:'BODY_REAR',rotation:i?[x<0?0.0:0,0,x<0?0.5:-0.5]:[0,0,0],seg:6});}],
  ['HEAD',()=>{ell('HEAD',[0.72,0.62,0.85],[0,1.4,-1.3],skin,{parent:'BODY_FRONT',pivot:[0,1.2,-0.85],ws:8,hs:6});
    cyl('NECK_SKIN',[0.4,0.45],[0,1.22,-0.95],skin2,{parent:'HEAD',rotation:[-0.9,0,0]});
    pyr('BEAK',[0.3,0.25],[0,1.32,-1.72],'#f59e0b',{parent:'HEAD',rotation:[-PI/2,0,0]});
    eyes('HEAD',1.55,-1.6,0.18,0.18,'#f8fafc',DARK);
    box('HEADBAND',[0.76,0.12,0.88],[0,1.66,-1.28],shoeRed,{parent:'HEAD'});box('HEADBAND_TAIL',[0.1,0.3,0.06],[0.1,1.55,-0.86],shoeRed,{parent:'HEAD',rotation:[0.6,0,0.2],vc:false});}],
  ['ARM_L',()=>{limb('ARM_L',[-0.55,0.95,-0.65],[-0.65,0.22,-0.75],0.17,0.14,skin2,{parent:'BODY_FRONT'});tb('SHOE_FL',[0.36,0.22,0.55],[0.3,0.45],[-0.65,0.11,-0.88],shoe,{parent:'ARM_L'});box('SHOE_FL_STRIPE',[0.38,0.06,0.3],[-0.65,0.16,-0.85],shoeRed,{parent:'ARM_L',vc:false});}],
  ['ARM_R',()=>{limb('ARM_R',[0.55,0.95,-0.65],[0.65,0.22,-0.75],0.17,0.14,skin2,{parent:'BODY_FRONT'});tb('SHOE_FR',[0.36,0.22,0.55],[0.3,0.45],[0.65,0.11,-0.88],shoe,{parent:'ARM_R'});box('SHOE_FR_STRIPE',[0.38,0.06,0.3],[0.65,0.16,-0.85],shoeRed,{parent:'ARM_R',vc:false});}],
  ['LEG_L',()=>{limb('LEG_L',[-0.6,0.95,0.75],[-0.68,0.22,0.85],0.18,0.15,skin2,{parent:'BODY_REAR'});tb('SHOE_BL',[0.38,0.22,0.58],[0.32,0.48],[-0.68,0.11,0.72],shoe,{parent:'LEG_L'});box('SHOE_BL_STRIPE',[0.4,0.06,0.3],[-0.68,0.16,0.75],shoeRed,{parent:'LEG_L',vc:false});}],
  ['LEG_R',()=>{limb('LEG_R',[0.6,0.95,0.75],[0.68,0.22,0.85],0.18,0.15,skin2,{parent:'BODY_REAR'});tb('SHOE_BR',[0.38,0.22,0.58],[0.32,0.48],[0.68,0.11,0.72],shoe,{parent:'LEG_R'});box('SHOE_BR_STRIPE',[0.4,0.06,0.3],[0.68,0.16,0.75],shoeRed,{parent:'LEG_R',vc:false});}],
  ['TAIL',()=>{joint('TAIL_BASE',[0,0.95,1.3],'BODY_REAR');cone('TAIL_NUB',[0.22,0.4],[0,0.95,1.5],skin2,{parent:'TAIL_BASE',rotation:[PI/2,0,0]});}],
 ]);
 monster('shell_runner','QUADRUPED',slots,[{name:'attack',duration:0.56,loop:false,tracks:[
   pos('BODY_FRONT',[[0,Z],[0.16,[0,0,0.15]],[0.3,[0,0.05,-0.55]],[0.56,Z]]),
   rot('BODY_REAR',[[0,Z],[0.3,[0,PI,0]],[0.56,[0,PI*2,0]]])]}]);
}
// =============================== PROP MONSTERS =======================
// BODY_CORE is an invisible root; the skeleton's idle/hurt/die move the whole object.
const core=(y)=>box('BODY_CORE',[0.01,0.01,0.01],[0,y,0],'#111827',{opacity:0,vc:false});
const BODY=(fn)=>build([['BODY',fn]]);
{ // JELLY FLOATER
 const bell='#67e8f9',bell2='#22d3ee',coreC='#a78bfa';
 let slots=BODY(()=>{core(1.55);
  lathe('BELL',[[0,0.75],[0.55,0.68],[0.9,0.35],[1.0,0.0],[0.92,-0.12],[0.75,-0.1]],[0,1.95,0],bell,{parent:'BODY_CORE',opacity:0.74,seg:10});
  tor('BELL_RIM',[1.85,0.07],[0,1.85,0],bell2,{parent:'BODY_CORE',rotation:[PI/2,0,0],opacity:0.85,vc:false});
  ell('CORE',[0.72,0.72,0.72],[0,2.15,0],coreC,{parent:'BODY_CORE',ws:8,hs:6,opacity:0.9});
  ell('CORE_SPARK',[0.25,0.25,0.25],[0.15,2.25,-0.2],'#f5f3ff',{parent:'CORE',ws:6,hs:4,opacity:0.9,vc:false});
  box('EYE_L',[0.12,0.18,0.06],[-0.22,2.0,-0.92],'#0f172a',{parent:'BODY_CORE',vc:false});box('EYE_R',[0.12,0.18,0.06],[0.22,2.0,-0.92],'#0f172a',{parent:'BODY_CORE',vc:false});
  ell('BLUSH_L',[0.16,0.08,0.04],[-0.36,1.88,-0.88],'#f9a8d4',{parent:'BODY_CORE',ws:6,hs:4,vc:false});ell('BLUSH_R',[0.16,0.08,0.04],[0.36,1.88,-0.88],'#f9a8d4',{parent:'BODY_CORE',ws:6,hs:4,vc:false});
  limb('TENTACLE_L',[-0.45,1.82,-0.15],[-0.6,0.35,-0.1],0.08,0.04,bell,{parent:'BODY_CORE',knee:[0.5,0.07],opacity:0.6});
  limb('TENTACLE_C',[0,1.82,0.1],[0.05,0.15,0.15],0.09,0.04,'#a5f3fc',{parent:'BODY_CORE',knee:[0.5,0.08],opacity:0.62});
  limb('TENTACLE_R',[0.45,1.82,-0.15],[0.6,0.35,-0.1],0.08,0.04,bell,{parent:'BODY_CORE',knee:[0.5,0.07],opacity:0.6});
  limb('TENTACLE_BL',[-0.3,1.82,0.45],[-0.4,0.55,0.6],0.07,0.03,bell,{parent:'BODY_CORE',opacity:0.55});
  limb('TENTACLE_BR',[0.3,1.82,0.45],[0.4,0.55,0.6],0.07,0.03,bell,{parent:'BODY_CORE',opacity:0.55});
  tb('ORAL_ARM',[0.5,0.9,0.3],[0.2,0.2],[0,1.35,0],'#c4b5fd',{parent:'BODY_CORE',opacity:0.7});
 });
 monster('jelly_floater','PROP',slots,[{name:'attack',duration:0.74,loop:false,tracks:[
  pos('BODY_CORE',[[0,Z],[0.22,[0,0.35,0]],[0.4,[0,-0.15,-0.3]],[0.74,Z]]),
  scl('CORE',[[0,ONE],[0.3,[1.5,1.5,1.5]],[0.42,[0.85,0.85,0.85]],[0.74,ONE]]),
  scl('TENTACLE_C',[[0,ONE],[0.3,[1,1.4,1]],[0.74,ONE]])]}]);
}
{ // LANTERN WISP
 const metal='#475569',flame='#fde68a',glow='#67e8f9';
 let slots=BODY(()=>{core(1.45);
  ell('FLAME_CORE',[1.0,1.15,1.0],[0,1.65,0],flame,{parent:'BODY_CORE',ws:8,hs:6,opacity:0.92});
  cone('FLAME_TIP',[0.6,0.8],[0,2.35,0],'#fbbf24',{parent:'BODY_CORE',opacity:0.85});
  ell('AURA',[1.7,1.85,1.7],[0,1.7,0],glow,{parent:'BODY_CORE',ws:8,hs:6,opacity:0.3,vc:false});
  tor('HALO',[1.15,0.08],[0,2.95,0],'#e0f2fe',{parent:'BODY_CORE',rotation:[PI/2,0,0],opacity:0.75,vc:false});
  cone('FLAME_TAIL',[0.55,1.1],[0,0.75,0],'#fb7185',{parent:'BODY_CORE',rotation:[PI,0,0],opacity:0.78});
  cyl('LANTERN_TOP',[1.25,0.22],[0,2.65,0],metal,{parent:'BODY_CORE',seg:8,rt:0.35,rb:0.62});
  cyl('LANTERN_BASE',[1.15,0.16],[0,0.95,0],metal,{parent:'BODY_CORE',seg:8});
  for(let i=0;i<4;i++){const a=i/4*PI*2+PI/4;box(`CAGE_BAR_${i+1}`,[0.08,1.6,0.08],[Math.cos(a)*0.58,1.8,Math.sin(a)*0.58],metal,{parent:'BODY_CORE'});}
  tor('HANDLE',[0.55,0.06],[0,2.95,0],metal,{parent:'BODY_CORE',vc:false});
  box('EYE_L',[0.12,0.2,0.06],[-0.18,1.72,-0.5],'#0f172a',{parent:'BODY_CORE',vc:false});box('EYE_R',[0.12,0.2,0.06],[0.18,1.72,-0.5],'#0f172a',{parent:'BODY_CORE',vc:false});
  box('SMILE',[0.24,0.05,0.05],[0,1.5,-0.5],'#9a3412',{parent:'BODY_CORE',vc:false});
 });
 monster('lantern_wisp','PROP',slots,[{name:'attack',duration:0.68,loop:false,tracks:[
  pos('BODY_CORE',[[0,Z],[0.2,[0,0.2,0.1]],[0.36,[0,-0.1,-0.35]],[0.68,Z]]),
  scl('AURA',[[0,ONE],[0.3,[1.5,1.5,1.5]],[0.68,ONE]]),
  scl('HALO',[[0,ONE],[0.3,[1.3,1.3,1.3]],[0.68,ONE]])]}]);
}
{ // MUSHROOM HOPPER
 const cap='#dc2626',stem='#f5e6bb',spot='#fff7ed';
 let slots=BODY(()=>{core(0.9);
  lathe('STEM',[[0.45,-0.6],[0.5,-0.3],[0.42,0.2],[0.38,0.6]],[0,0.95,0],stem,{parent:'BODY_CORE',seg:8});
  lathe('CAP',[[0,0.75],[0.65,0.68],[1.05,0.35],[1.2,0.0],[1.05,-0.08],[0.4,-0.1]],[0,1.85,0],cap,{parent:'BODY_CORE',pivot:[0,1.4,0],seg:10});
  cyl('GILLS',[2.0,0.08],[0,1.76,0],'#fde68a',{parent:'CAP',seg:10,rt:1.0,rb:0.5});
  for(const [n,[x,y,z,r]] of [['SPOT_C',[0,2.6,-0.15,0.22]],['SPOT_L',[-0.7,2.3,-0.25,0.18]],['SPOT_R',[0.7,2.28,-0.2,0.18]],['SPOT_B',[0.1,2.45,0.6,0.18]],['SPOT_BL',[-0.55,2.25,0.55,0.14]]])ell(n,[r*2,r*0.6,r*2],[x,y,z],spot,{parent:'CAP',ws:6,hs:4});
  box('EYE_L',[0.16,0.24,0.08],[-0.2,1.15,-0.44],'#1f2937',{parent:'BODY_CORE',vc:false});box('EYE_R',[0.16,0.24,0.08],[0.2,1.15,-0.44],'#1f2937',{parent:'BODY_CORE',vc:false});
  box('EYE_SHINE_L',[0.05,0.07,0.03],[-0.18,1.22,-0.49],'#ffffff',{parent:'BODY_CORE',vc:false});box('EYE_SHINE_R',[0.05,0.07,0.03],[0.22,1.22,-0.49],'#ffffff',{parent:'BODY_CORE',vc:false});
  ell('CHEEK_L',[0.16,0.08,0.04],[-0.33,1.0,-0.42],'#fca5a5',{parent:'BODY_CORE',ws:6,hs:4,vc:false});ell('CHEEK_R',[0.16,0.08,0.04],[0.33,1.0,-0.42],'#fca5a5',{parent:'BODY_CORE',ws:6,hs:4,vc:false});
  tb('FOOT_L',[0.38,0.18,0.62],[0.3,0.5],[-0.3,0.09,-0.05],'#7c3f00',{parent:'BODY_CORE'});tb('FOOT_R',[0.38,0.18,0.62],[0.3,0.5],[0.3,0.09,-0.05],'#7c3f00',{parent:'BODY_CORE'});
 });
 monster('mushroom_hopper','PROP',slots,[{name:'attack',duration:0.72,loop:false,tracks:[
  pos('BODY_CORE',[[0,Z],[0.18,[0,-0.15,0]],[0.38,[0,0.9,-0.4]],[0.56,[0,0.1,-0.5]],[0.72,Z]]),
  scl('CAP',[[0,ONE],[0.18,[1.15,0.75,1.15]],[0.38,[0.92,1.12,0.92]],[0.56,[1.1,0.85,1.1]],[0.72,ONE]])]}]);
}
{ // ROCK MIMIC
 const rock='#6b7280',rock2='#71717a',moss='#4d7c0f',crystal='#a78bfa';
 let slots=BODY(()=>{core(0.75);
  tb('ROCK_BOTTOM',[2.3,0.8,2.0],[2.0,1.8],[0,0.4,0],rock,{parent:'BODY_CORE'});
  ell('ROCK_TOP',[2.3,1.25,2.1],[0,1.25,0.05],rock2,{parent:'BODY_CORE',pivot:[0,0.85,0.95],ws:7,hs:5});
  ell('BOULDER_BUMP_1',[0.8,0.5,0.7],[-0.6,1.78,0.3],tint(rock2,0.08),{parent:'ROCK_TOP',ws:6,hs:4});
  ell('BOULDER_BUMP_2',[0.6,0.4,0.6],[0.65,1.7,0.5],shade(rock2,0.92),{parent:'ROCK_TOP',ws:6,hs:4});
  box('MOUTH_GAP',[1.8,0.32,0.9],[0,0.86,-0.55],'#0f172a',{parent:'BODY_CORE',vc:false});
  box('TONGUE',[0.8,0.1,0.6],[0,0.78,-0.55],'#be185d',{parent:'BODY_CORE',vc:false});
  for(const [i,x] of [[1,-0.65],[2,-0.22],[3,0.22],[4,0.65]].entries())cone(`TOOTH_UP_${i+1}`,[0.16,0.3],[x[1],0.98,-0.92],'#f8fafc',{parent:'ROCK_TOP',rotation:[PI,0,0],vc:false});
  cone('FANG_L',[0.18,0.42],[-0.45,0.95,-0.95],'#f8fafc',{parent:'BODY_CORE',vc:false});cone('FANG_R',[0.18,0.42],[0.45,0.95,-0.95],'#f8fafc',{parent:'BODY_CORE',vc:false});
  box('EYE_L',[0.16,0.12,0.06],[-0.35,1.25,-0.97],'#facc15',{parent:'ROCK_TOP',vc:false});box('EYE_R',[0.16,0.12,0.06],[0.35,1.25,-0.97],'#facc15',{parent:'ROCK_TOP',vc:false});
  ell('MOSS_TOP',[1.1,0.18,0.9],[0.2,1.88,-0.1],moss,{parent:'ROCK_TOP',ws:6,hs:3});
  pyr('CRYSTAL_1',[0.3,0.6],[-0.8,1.9,0.55],crystal,{parent:'ROCK_TOP',rotation:[0.2,0,0.3],opacity:0.9});pyr('CRYSTAL_2',[0.22,0.45],[-0.62,1.92,0.75],crystal,{parent:'ROCK_TOP',rotation:[-0.2,0,-0.2],opacity:0.9});
 });
 monster('rock_mimic','PROP',slots,[{name:'attack',duration:0.74,loop:false,tracks:[
  rot('ROCK_TOP',[[0,Z],[0.22,[-0.55,0,0]],[0.36,[0.08,0,0]],[0.74,Z]]),
  pos('BODY_CORE',[[0,Z],[0.22,[0,0.08,0.1]],[0.36,[0,0,-0.3]],[0.74,Z]])]}]);
}
{ // SPORE BLOB
 const blob='#84cc16',blob2='#65a30d',spore='#fde047';
 let slots=BODY(()=>{core(0.95);
  ell('BLOB_BASE',[2.1,1.2,2.0],[0,0.62,0],blob,{parent:'BODY_CORE',pivot:[0,0.05,0],ws:10,hs:6,opacity:0.9});
  ell('BLOB_TOP',[1.5,1.15,1.45],[0,1.35,0.05],blob2,{parent:'BODY_CORE',ws:8,hs:6,opacity:0.9});
  for(const [n,[x,y,z,r,c]] of [['SPORE_L',[-0.55,2.05,-0.1,0.17,'#facc15']],['SPORE_C',[0,2.2,-0.2,0.2,spore]],['SPORE_R',[0.55,2.0,-0.05,0.17,'#facc15']]]){cyl(n+'_STALK',[0.08,0.45],[x,y-0.32,z],'#ecfccb',{parent:'BODY_CORE',vc:false});ell(n,[r*2,r*2,r*2],[x,y,z],c,{parent:'BODY_CORE',ws:6,hs:4,opacity:0.92});}
  lathe('MINI_CAP_1',[[0,0.12],[0.22,0.06],[0.26,-0.04],[0.1,-0.05]],[-0.75,1.15,0.45],'#f97316',{parent:'BODY_CORE',seg:6});
  lathe('MINI_CAP_2',[[0,0.1],[0.18,0.05],[0.2,-0.03],[0.08,-0.04]],[0.8,1.0,0.35],'#f97316',{parent:'BODY_CORE',seg:6});
  box('EYE_L',[0.14,0.2,0.06],[-0.24,1.4,-0.72],'#1f2937',{parent:'BODY_CORE',vc:false});box('EYE_R',[0.14,0.2,0.06],[0.24,1.4,-0.72],'#1f2937',{parent:'BODY_CORE',vc:false});
  box('MOUTH',[0.46,0.08,0.06],[0,1.12,-0.74],'#365314',{parent:'BODY_CORE',vc:false});
  ell('DRIP_1',[0.18,0.3,0.18],[-0.8,0.2,-0.6],blob,{parent:'BODY_CORE',ws:6,hs:4,opacity:0.85,vc:false});ell('DRIP_2',[0.14,0.22,0.14],[0.85,0.15,-0.4],blob,{parent:'BODY_CORE',ws:6,hs:4,opacity:0.85,vc:false});
 });
 monster('spore_blob','PROP',slots,[{name:'attack',duration:0.76,loop:false,tracks:[
  scl('BLOB_BASE',[[0,ONE],[0.22,[1.16,0.7,1.08]],[0.4,[0.9,1.15,0.92]],[0.76,ONE]]),
  scl('SPORE_C',[[0,ONE],[0.3,[2.2,2.2,2.2]],[0.5,[0.6,0.6,0.6]],[0.76,ONE]]),
  pos('BODY_CORE',[[0,Z],[0.22,[0,-0.1,0]],[0.4,[0,0.2,-0.2]],[0.76,Z]])]}]);
}
{ // THORN POD
 const pod='#65a30d',leaf='#84cc16',thorn='#f8fafc',lip='#be123c';
 let slots=BODY(()=>{core(1.2);
  cyl('STEM',[0.3,1.0],[0,0.55,0],'#3f6212',{parent:'BODY_CORE',rt:0.12,rb:0.2});
  ell('POD_BODY',[1.8,1.65,1.7],[0,1.5,0],pod,{parent:'BODY_CORE',ws:8,hs:6});
  cone('THORN_TOP',[0.3,0.72],[0,2.55,0],thorn,{parent:'POD_BODY'});
  for(const [i,[x,y,z,rx,rz]] of [[-0.85,1.6,0.3,0,1.2],[0.85,1.6,0.3,0,-1.2],[0,1.75,0.9,1.2,0],[-0.6,2.1,0.4,0.5,0.7],[0.6,2.1,0.4,0.5,-0.7]].entries())cone(`THORN_${i+1}`,[0.16,0.4],[x,y,z],thorn,{parent:'POD_BODY',rotation:[rx,0,rz]});
  wdg('PETAL_L',[0.9,0.12,0.6],[-0.75,1.55,-0.15],leaf,{parent:'BODY_CORE',pivot:[-0.2,1.4,-0.05],rotation:[0,0,0.5]});
  wdg('PETAL_R',[0.9,0.12,0.6],[0.75,1.55,-0.15],leaf,{parent:'BODY_CORE',pivot:[0.2,1.4,-0.05],rotation:[0,0,-0.5]});
  wdg('PETAL_TOP',[0.8,0.12,0.6],[0,2.25,-0.3],leaf,{parent:'BODY_CORE',pivot:[0,1.85,-0.1],rotation:[-0.6,0,0]});
  box('MAW',[0.9,0.5,0.1],[0,1.45,-0.86],'#3f0d12',{parent:'BODY_CORE',vc:false});
  box('LIP_TOP',[1.0,0.1,0.12],[0,1.72,-0.88],lip,{parent:'BODY_CORE'});box('LIP_BOTTOM',[1.0,0.1,0.12],[0,1.18,-0.88],lip,{parent:'BODY_CORE'});
  for(const [i,x] of [-0.3,0,0.3].entries()){cone(`TOOTH_TOP_${i+1}`,[0.1,0.18],[x,1.62,-0.9],thorn,{parent:'BODY_CORE',rotation:[PI,0,0],vc:false});cone(`TOOTH_BOT_${i+1}`,[0.1,0.18],[x+0.15,1.28,-0.9],thorn,{parent:'BODY_CORE',vc:false});}
  ell('SEED_CORE',[0.36,0.36,0.36],[0,1.45,-0.8],'#facc15',{parent:'BODY_CORE',ws:6,hs:4});
  box('ROOT_L',[0.22,0.45,0.22],[-0.35,0.22,0.15],'#713f12',{parent:'BODY_CORE',rotation:[0.2,0,0.5]});box('ROOT_R',[0.22,0.45,0.22],[0.35,0.22,0.15],'#713f12',{parent:'BODY_CORE',rotation:[0.2,0,-0.5]});
  box('ROOT_B',[0.22,0.45,0.22],[0,0.22,0.4],'#713f12',{parent:'BODY_CORE',rotation:[-0.5,0,0]});
 });
 monster('thorn_pod','PROP',slots,[{name:'attack',duration:0.78,loop:false,tracks:[
  rot('PETAL_L',[[0,Z],[0.24,[0,0,0.6]],[0.4,[0,0,-0.4]],[0.78,Z]]),
  rot('PETAL_R',[[0,Z],[0.24,[0,0,-0.6]],[0.4,[0,0,0.4]],[0.78,Z]]),
  rot('PETAL_TOP',[[0,Z],[0.24,[-0.5,0,0]],[0.4,[0.4,0,0]],[0.78,Z]]),
  scl('SEED_CORE',[[0,ONE],[0.3,[1.6,1.6,1.6]],[0.45,[0.7,0.7,0.7]],[0.78,ONE]])]}]);
}
{ // TOTEM IDOL
 const wood='#a16207',wood2='#92400e',wood3='#8b5a2b',paint='#dc2626',teal='#14b8a6';
 let slots=BODY(()=>{core(1.6);
  tb('BASE',[1.9,0.75,1.2],[1.7,1.05],[0,0.38,0],wood3,{parent:'BODY_CORE'});
  box('BASE_BAND',[1.95,0.12,1.25],[0,0.62,0],paint,{parent:'BODY_CORE'});
  tb('MID',[1.55,0.85,1.0],[1.45,0.92],[0,1.18,0],wood,{parent:'BODY_CORE'});
  box('MID_MOUTH',[0.9,0.22,0.06],[0,1.1,-0.53],DARK,{parent:'BODY_CORE',vc:false});
  for(const [i,x] of [-0.3,-0.1,0.1,0.3].entries())box(`MID_TOOTH_${i+1}`,[0.12,0.12,0.04],[x,1.18,-0.56],'#fef3c7',{parent:'BODY_CORE',vc:false});
  box('MID_BROW_L',[0.4,0.12,0.06],[-0.35,1.42,-0.53],paint,{parent:'BODY_CORE',rotation:[0,0,0.2],vc:false});box('MID_BROW_R',[0.4,0.12,0.06],[0.35,1.42,-0.53],paint,{parent:'BODY_CORE',rotation:[0,0,-0.2],vc:false});
  wdg('WING_L',[0.9,0.6,0.25],[-1.15,1.3,0],teal,{parent:'BODY_CORE',rotation:[0,0,PI/2]});wdg('WING_R',[0.9,0.6,0.25],[1.15,1.3,0],teal,{parent:'BODY_CORE',rotation:[0,0,-PI/2]});
  tb('HEAD',[1.4,0.95,0.98],[1.2,0.85],[0,2.05,0],wood2,{parent:'BODY_CORE',pivot:[0,1.6,0]});
  box('EYE_SOCKET',[0.85,0.3,0.08],[0,2.15,-0.5],'#111827',{parent:'HEAD',vc:false});
  ell('EYE_ORB',[0.38,0.38,0.38],[0,2.15,-0.52],'#22d3ee',{parent:'HEAD',ws:6,hs:4,opacity:0.92,vc:false});
  box('NOSE_RIDGE',[0.18,0.35,0.12],[0,1.85,-0.52],wood3,{parent:'HEAD'});
  cone('HORN_L',[0.2,0.66],[-0.55,2.75,0],'#facc15',{parent:'HEAD',rotation:[0,0,0.42]});cone('HORN_R',[0.2,0.66],[0.55,2.75,0],'#facc15',{parent:'HEAD',rotation:[0,0,-0.42]});
  for(const [i,x] of [-0.4,0,0.4].entries())pyr(`FEATHER_${i+1}`,[0.2,0.6],[x,2.85,0.25],['#ef4444','#facc15','#22c55e'][i],{parent:'HEAD',rotation:[-0.3,0,x*-0.6]});
  box('HEAD_BAND',[1.25,0.1,0.9],[0,1.65,0],paint,{parent:'HEAD'});
 });
 monster('totem_idol','PROP',slots,[{name:'attack',duration:0.82,loop:false,tracks:[
  rot('HEAD',[[0,Z],[0.24,[0,0.6,0]],[0.42,[0,-0.6,0]],[0.62,[0,0.2,0]],[0.82,Z]]),
  scl('EYE_ORB',[[0,ONE],[0.3,[1.8,1.8,1.8]],[0.5,[1.2,1.2,1.2]],[0.82,ONE]]),
  pos('BODY_CORE',[[0,Z],[0.24,[0,0.15,0]],[0.5,[0,-0.05,0]],[0.82,Z]])]}]);
}

import fs from 'node:fs';
import {cube,cyl,sphere,cone,pyramid,wedge,tbox,torus,capsule,lathe,loft,vc,shade,tint,read,write,template,anim,track,kf,PI,relTemplateColors} from './lib.mjs';
const C='Monstruos';
const keep=(rel,name)=>read(rel).pieces.find(p=>p.name===name);
const A=(rel)=>({animations:read(rel).animations});
// --- CharacterModel-format monsters: gradient polish + cheaper spheres ---
for(const f of fs.readdirSync('src/data/templates/monsters')){
 const rel='monsters/'+f; const t=relTemplateColors(read(rel)); if(!t.slots) continue; let added=0;
 for(const slot of t.slots) for(const p of slot.pieces||[]){
   if(!p.vertexColors&&!p.faceColors&&p.material&&p.opacity==null){p.vertexColors=vc(p.material,0.14,0.8);added++;}
   if(p.template==='SPHERE'){p.params=p.params||{};const r=Math.max(...(p.size||[1]))/2;if(r<0.25){p.params.widthSegments=6;p.params.heightSegments=4;}else if(!p.params.widthSegments){p.params.widthSegments=8;p.params.heightSegments=6;}}
 }
 write(rel,t); console.log('  polished',rel,'+vc',added);
}
// --- bat ---
{const rel='monsters/bat.json';const face=keep(rel,'FACE_DECAL');
 const body='#475569',head='#64748b',dark='#334155',wing='#1e293b';
write(rel,template('bat','Bat',C,[
 tbox('BODY',{wb:1.1,db:0.8,wt:1.35,dt:0.85,h:1.65},body,[0,1.8,0]),
 cube('BELLY',[0.8,1.0,0.1],tint(body,0.2),[0,1.65,-0.44],{vc:[0.2,0.85]}),
 cube('HEAD',[1.1,1.05,1.05],head,[0,2.95,0],{parent:'BODY',pivot:[0,1.8,0]}),
 face,
 cube('LEFT_EAR',[0.35,0.65,0.12],dark,[-0.45,3.55,0.05],{rotation:[0,0,0.6],parent:'HEAD',pivot:[0,2.95,0]}),
 cube('RIGHT_EAR',[0.35,0.65,0.12],dark,[0.45,3.55,0.05],{rotation:[0,0,-0.6],parent:'HEAD',pivot:[0,2.95,0]}),
 cube('LEFT_EAR_INNER',[0.16,0.36,0.06],'#f472b6',[-0.45,3.5,-0.02],{rotation:[0,0,0.6],parent:'HEAD',pivot:[0,2.95,0],vc:false}),
 cube('RIGHT_EAR_INNER',[0.16,0.36,0.06],'#f472b6',[0.45,3.5,-0.02],{rotation:[0,0,-0.6],parent:'HEAD',pivot:[0,2.95,0],vc:false}),
 cube('LEFT_WING',[2.1,0.12,1.35],wing,[-1.45,2.1,0],{rotation:[0,0,1.2],parent:'BODY',pivot:[-0.75,2.1,0]}),
 cube('RIGHT_WING',[2.1,0.12,1.35],wing,[1.45,2.1,0],{rotation:[0,0,-1.2],parent:'BODY',pivot:[0.75,2.1,0]}),
 cube('LEFT_WING_BONE',[2.1,0.16,0.14],dark,[-1.45,2.14,-0.62],{rotation:[0,0,1.2],parent:'LEFT_WING',pivot:[-0.75,2.1,0]}),
 cube('RIGHT_WING_BONE',[2.1,0.16,0.14],dark,[1.45,2.14,-0.62],{rotation:[0,0,-1.2],parent:'RIGHT_WING',pivot:[0.75,2.1,0]}),
 pyramid('LEFT_WING_TIP',[0.5,0.5],wing,[-2.55,2.1,0.4],{rotation:[0,0,1.2+PI/2],parent:'LEFT_WING',pivot:[-0.75,2.1,0],scale:[1,1,0.2]}),
 pyramid('RIGHT_WING_TIP',[0.5,0.5],wing,[2.55,2.1,0.4],{rotation:[0,0,-1.2-PI/2],parent:'RIGHT_WING',pivot:[0.75,2.1,0],scale:[1,1,0.2]}),
 cube('LEFT_LEG',[0.22,0.65,0.22],dark,[-0.45,0.95,0.1],{parent:'BODY',pivot:[0,1.8,0]}),
 cube('RIGHT_LEG',[0.22,0.65,0.22],dark,[0.45,0.95,0.1],{parent:'BODY',pivot:[0,1.8,0]}),
 cube('LEFT_CLAW',[0.3,0.12,0.36],'#94a3b8',[-0.45,0.58,0.0],{parent:'LEFT_LEG',pivot:[0,1.8,0]}),
 cube('RIGHT_CLAW',[0.3,0.12,0.36],'#94a3b8',[0.45,0.58,0.0],{parent:'RIGHT_LEG',pivot:[0,1.8,0]}),
],A(rel)));}
// --- eye_turret ---
{const rel='monsters/eye_turret.json';const face=keep(rel,'FACE_DECAL');
write(rel,template('eye_turret','Torre Ojo',C,[
 cyl('BASE',[0.92,1.08,0.46,12],'#334155',[0,0.23,0]),
 cyl('BASE_RING',[1.0,1.0,0.1,12],'#475569',[0,0.5,0]),
 ...[0,1,2,3].map(i=>{const a=i/4*PI*2+0.4;return cube(`BOLT_${i+1}`,[0.12,0.08,0.12],'#94a3b8',[Math.cos(a)*0.92,0.5,Math.sin(a)*0.92],{vc:false});}),
 tbox('COLUMN',{wb:0.72,wt:0.56,h:1.24},'#475569',[0,1.08,0]),
 cube('COLUMN_VENT',[0.4,0.08,0.06],'#1e293b',[0,1.0,0.3],{vc:false}),cube('COLUMN_VENT_2',[0.4,0.08,0.06],'#1e293b',[0,0.8,0.3],{vc:false}),
 cyl('NECK',[0.3,0.36,0.3,8],'#64748b',[0,1.78,0]),
 sphere('HEAD',[0.86,10,8],'#64748b',[0,2.18,0],{scale:[1.08,0.94,1],pivot:[0,2.18,0]}),
 torus('HEAD_RING',[0.86,0.06,4,12],'#475569',[0,2.18,0],{rotation:[0,0,0],parent:'HEAD',pivot:[0,2.18,0],scale:[1.08,0.94,1],vc:false}),
 face,
 sphere('IRIS',[0.2,8,6],'#ef4444',[0,2.2,0.98],{parent:'HEAD',pivot:[0,2.18,0],vc:[0.3,0.8]}),
 sphere('IRIS_GLOW',[0.08,5,4],'#fecaca',[0,2.24,1.14],{parent:'HEAD',pivot:[0,2.18,0],opacity:0.9,vc:false}),
 cone('SPIKE_TOP',[0.12,0.34,6],'#cbd5e1',[0,2.98,0],{parent:'HEAD',pivot:[0,2.18,0]}),
 cone('SPIKE_L',[0.1,0.3,6],'#cbd5e1',[-0.8,2.5,0],{rotation:[0,0,0.9],parent:'HEAD',pivot:[0,2.18,0]}),
 cone('SPIKE_R',[0.1,0.3,6],'#cbd5e1',[0.8,2.5,0],{rotation:[0,0,-0.9],parent:'HEAD',pivot:[0,2.18,0]}),
 cube('CABLE',[0.08,0.6,0.08],'#1e293b',[0.3,1.9,-0.3],{rotation:[0.4,0,-0.3],vc:false}),
],(()=>{const a=A(rel);const idle=a.animations.find(x=>x.name==='idle');if(idle){const tr=idle.tracks.find(t=>t.target==='HEAD'&&t.property==='rotation');if(tr){const d=idle.duration;tr.keyframes=[{time:0,value:[0,0,0]},{time:d*0.25,value:[0,-0.42,0]},{time:d*0.75,value:[0,0.42,0]},{time:d,value:[0,0,0]}];}}return a;})()));}
// --- ghost ---
{const rel='monsters/ghost.json';const face=keep(rel,'FACE_DECAL');
write(rel,template('ghost','Fantasma',C,[
 sphere('BODY',[0.92,10,8],'#f8fafc',[0,1.9,0],{scale:[1.08,1.28,1],opacity:0.9,vc:[0.05,0.88]}),
 face,
 cone('TAIL',[0.72,1.1,8],'#f8fafc',[0,0.98,0],{rotation:[PI,0,0],opacity:0.86,vc:[0.05,0.85]}),
 cone('TAIL_WISP_L',[0.26,0.6,6],'#f1f5f9',[-0.5,0.6,0.1],{rotation:[PI,0,0.3],opacity:0.8,vc:[0.05,0.85]}),
 cone('TAIL_WISP_R',[0.26,0.6,6],'#f1f5f9',[0.5,0.6,-0.1],{rotation:[PI,0,-0.3],opacity:0.8,vc:[0.05,0.85]}),
 sphere('TAIL_DROP',[0.1,5,4],'#e2e8f0',[0.1,0.2,0.2],{opacity:0.6,vc:false}),
 cube('ARM_L',[0.34,1.04,0.34],'#e2e8f0',[-1.02,1.92,0.08],{rotation:[0,0,0.62],pivot:[-0.82,2.24,0.08],opacity:0.88,vc:[0.05,0.88]}),
 cube('ARM_R',[0.34,1.04,0.34],'#e2e8f0',[1.02,1.92,0.08],{rotation:[0,0,-0.62],pivot:[0.82,2.24,0.08],opacity:0.88,vc:[0.05,0.88]}),
 sphere('HAND_L',[0.22,6,4],'#f1f5f9',[-1.32,1.5,0.1],{parent:'ARM_L',pivot:[-0.82,2.24,0.08],opacity:0.9,vc:false}),
 sphere('HAND_R',[0.22,6,4],'#f1f5f9',[1.32,1.5,0.1],{parent:'ARM_R',pivot:[0.82,2.24,0.08],opacity:0.9,vc:false}),
 cube('HOOD_FOLD',[1.2,0.12,0.5],'#e2e8f0',[0,2.9,0.5],{rotation:[0.3,0,0],opacity:0.85,vc:false}),
 sphere('GLOW',[0.3,6,4],'#a5f3fc',[0,1.7,0.3],{opacity:0.25,vc:false}),
],A(rel)));}
// --- masked_critter ---
{const rel='monsters/masked_critter.json';const face=keep(rel,'FACE_DECAL');
 const body='#dc2626',head='#b91c1c',arm='#facc15',leg='#1e293b';
write(rel,template('masked_critter','Critter Enmascarado',C,[
 tbox('BODY',{wb:1.2,db:0.95,wt:1.34,dt:1.02,h:1.42},body,[0,1.34,0]),
 cube('BELLY',[0.8,0.8,0.08],'#fca5a5',[0,1.25,0.52],{vc:[0.1,0.9]}),
 cube('HEAD',[1.16,1.04,1.08],head,[0,2.58,0],{parent:'BODY',pivot:[0,1.34,0]}),
 face,
 cube('MASK',[1.0,0.72,0.08],'#f8fafc',[0,2.58,0.58],{parent:'HEAD',pivot:[0,2.58,0],vc:[0.05,0.9]}),
 cube('MASK_STRAP',[1.2,0.1,0.06],'#1e293b',[0,2.8,0.4],{parent:'HEAD',pivot:[0,2.58,0],vc:false}),
 cube('MASK_MARK_L',[0.12,0.2,0.04],'#b91c1c',[-0.32,2.42,0.63],{parent:'HEAD',pivot:[0,2.58,0],vc:false}),
 cube('MASK_MARK_R',[0.12,0.2,0.04],'#b91c1c',[0.32,2.42,0.63],{parent:'HEAD',pivot:[0,2.58,0],vc:false}),
 cone('HORN_L',[0.14,0.4,5],'#fde047',[-0.4,3.2,0],{rotation:[0,0,0.4],parent:'HEAD',pivot:[0,2.58,0],vc:[0.3,0.8]}),
 cone('HORN_R',[0.14,0.4,5],'#fde047',[0.4,3.2,0],{rotation:[0,0,-0.4],parent:'HEAD',pivot:[0,2.58,0],vc:[0.3,0.8]}),
 cube('ARM_L',[0.26,0.96,0.26],arm,[-0.92,1.42,0],{rotation:[0,0,0.22],pivot:[-0.72,1.82,0]}),
 cube('ARM_R',[0.26,0.96,0.26],arm,[0.92,1.42,0],{rotation:[0,0,-0.22],pivot:[0.72,1.82,0]}),
 cube('HAND_L',[0.3,0.3,0.3],'#eab308',[-1.02,0.9,0],{parent:'ARM_L',pivot:[-0.72,1.82,0]}),
 cube('HAND_R',[0.3,0.3,0.3],'#eab308',[1.02,0.9,0],{parent:'ARM_R',pivot:[0.72,1.82,0]}),
 cube('LEG_L',[0.28,0.94,0.28],leg,[-0.28,0.34,0],{pivot:[-0.28,0.82,0]}),
 cube('LEG_R',[0.28,0.94,0.28],leg,[0.28,0.34,0],{pivot:[0.28,0.82,0]}),
 cube('FOOT_L',[0.32,0.16,0.46],'#0f172a',[-0.28,0.08,0.08],{parent:'LEG_L',pivot:[-0.28,0.82,0]}),
 cube('FOOT_R',[0.32,0.16,0.46],'#0f172a',[0.28,0.08,0.08],{parent:'LEG_R',pivot:[0.28,0.82,0]}),
 cube('TAIL',[0.16,0.16,0.7],body,[0,1.0,-0.7],{rotation:[0.5,0,0],parent:'BODY',pivot:[0,1.34,0]}),
],A(rel)));}
// --- skeleton (rig-backed playable: polish only) ---
{const rel='monsters/skeleton.json';const t=relTemplateColors(read(rel));
 for(const p of t.pieces){if(p.geometry?.type!=='label'&&p.geometry?.type!=='plane'&&!p.vertexColors&&!p.faceColors&&!p.texture)p.vertexColors=vc(p.color,0.12,0.84);}
 const par=(n)=>t.pieces.find(p=>p.name===n);
 const ADDED=new Set(['RIB_1','RIB_2','RIB_3','CHIN_BONE','SHOULDER_PAD_L','SHOULDER_PAD_R','CLUB_KNOB']);
 t.pieces=t.pieces.filter(p=>!ADDED.has(p.name));
 t.pieces.push(
  cube('RIB_1',[1.1,0.1,0.5],'#94a3b8',[0,3.6,0],{parent:'CHEST',pivot:par('CHEST').position}),
  cube('RIB_2',[1.08,0.1,0.48],'#94a3b8',[0,3.3,0],{parent:'CHEST',pivot:par('CHEST').position}),
  cube('RIB_3',[1.0,0.1,0.44],'#94a3b8',[0,3.0,0],{parent:'CHEST',pivot:par('CHEST').position}),
  cube('CHIN_BONE',[0.9,0.3,0.9],'#cbd5e1',[0,3.98,0.05],{parent:'HEAD',pivot:[0,4.55,0]}),
  cube('SHOULDER_PAD_L',[0.46,0.3,0.46],'#64748b',[-1.05,4.3,0],{parent:'CLAVICLE_L',pivot:[-0.82,4.22,0]}),
  cube('SHOULDER_PAD_R',[0.46,0.3,0.46],'#64748b',[1.05,4.3,0],{parent:'CLAVICLE_R',pivot:[0.82,4.22,0]}),
  sphere('CLUB_KNOB',[0.2,6,4],'#cbd5e1',[1.95,2.55,0.6],{parent:'BONE_CLUB',pivot:[1.05,1.25,0]}),
 );
 write(rel,t);}
// --- slime ---
{const rel='monsters/slime.json';const face=keep(rel,'FACE_DECAL');
write(rel,template('slime','Slime',C,[
 tbox('BODY',{wb:2.6,db:2.6,wt:2.2,dt:2.2,h:1.45},'#22c55e',[0,1,0],{opacity:0.92,vc:[0.25,0.75]}),
 tbox('BODY_TOP',{wb:2.0,wt:1.5,h:0.85},'#4ade80',[0,1.85,0],{parent:'BODY',pivot:[0,1.85,0],opacity:0.92,vc:[0.25,0.75]}),
 sphere('BODY_PEAK',[0.5,6,4],'#86efac',[0.1,2.4,-0.05],{parent:'BODY_TOP',pivot:[0,1,0],scale:[1,0.8,1],opacity:0.9,vc:false}),
 face,
 sphere('BUBBLE_1',[0.16,5,4],'#bbf7d0',[-0.7,1.4,0.5],{parent:'BODY',pivot:[0,1,0],opacity:0.8,vc:false}),
 sphere('BUBBLE_2',[0.11,5,4],'#bbf7d0',[0.75,1.0,-0.4],{parent:'BODY',pivot:[0,1,0],opacity:0.8,vc:false}),
 sphere('BUBBLE_3',[0.13,5,4],'#bbf7d0',[0.3,1.95,0.6],{parent:'BODY_TOP',pivot:[0,1,0],opacity:0.8,vc:false}),
 sphere('SHINE',[0.2,5,4],'#dcfce7',[-0.6,2.1,-0.6],{parent:'BODY_TOP',pivot:[0,1,0],scale:[1.4,0.6,1],opacity:0.7,vc:false}),
 cube('PUDDLE',[2.9,0.06,2.9],'#16a34a',[0,0.03,0],{opacity:0.6,vc:false}),
 sphere('DROP_1',[0.12,5,4],'#4ade80',[1.5,0.1,0.9],{opacity:0.8,vc:false}),sphere('DROP_2',[0.09,5,4],'#4ade80',[-1.4,0.08,-1.0],{opacity:0.8,vc:false}),
],A(rel)));}
// --- spiked_beetle ---
{const rel='monsters/spiked_beetle.json';const face=keep(rel,'FACE_DECAL');const shellFc=keep(rel,'SHELL').faceColors;
write(rel,template('spiked_beetle','Escarabajo Pinchos',C,[
 tbox('BODY',{wb:1.6,db:2.0,wt:1.8,dt:2.2,h:0.72},'#78350f',[0,0.66,0]),
 face,
 sphere('SHELL',[1,10,8],'#dc2626',[0,1.16,0.08],{scale:[1.08,0.76,1.22],faceColors:shellFc,vc:[0.2,0.8]}),
 cube('SHELL_SPLIT',[0.06,0.3,2.3],'#7f1d1d',[0,1.6,0.08],{vc:false}),
 cube('SHELL_RIM',[2.3,0.16,2.6],'#991b1b',[0,0.98,0.08]),
 cone('SPIKE_TOP',[0.18,0.5,6],'#f8fafc',[0,1.94,0.14],{vc:[0.1,0.85]}),
 cone('SPIKE_L',[0.16,0.42,6],'#f8fafc',[-0.48,1.72,0.44],{rotation:[0,0,0.34],vc:[0.1,0.85]}),
 cone('SPIKE_R',[0.16,0.42,6],'#f8fafc',[0.48,1.72,0.44],{rotation:[0,0,-0.34],vc:[0.1,0.85]}),
 cone('SPIKE_BL',[0.14,0.38,6],'#f8fafc',[-0.5,1.66,-0.5],{rotation:[-0.3,0,0.34],vc:[0.1,0.85]}),
 cone('SPIKE_BR',[0.14,0.38,6],'#f8fafc',[0.5,1.66,-0.5],{rotation:[-0.3,0,-0.34],vc:[0.1,0.85]}),
 cone('SPIKE_BACK',[0.14,0.4,6],'#f8fafc',[0,1.5,-1.1],{rotation:[-0.9,0,0],vc:[0.1,0.85]}),
 tbox('HEAD',{wb:0.9,db:0.8,wt:1.02,dt:0.86,h:0.58},'#92400e',[0,0.72,1.18]),
 cube('MANDIBLE_L',[0.1,0.1,0.4],'#451a03',[-0.3,0.5,1.75],{rotation:[0,0.4,0],vc:false}),
 cube('MANDIBLE_R',[0.1,0.1,0.4],'#451a03',[0.3,0.5,1.75],{rotation:[0,-0.4,0],vc:false}),
 cyl('ANTENNA_L',[0.03,0.03,0.6,4],'#451a03',[-0.3,1.2,1.5],{rotation:[-0.6,0,0.4],vc:false}),
 cyl('ANTENNA_R',[0.03,0.03,0.6,4],'#451a03',[0.3,1.2,1.5],{rotation:[-0.6,0,-0.4],vc:false}),
 cube('LEG_FL',[0.22,0.76,0.22],'#451a03',[-0.62,0.3,0.74],{rotation:[0,0,0.34],pivot:[-0.62,0.68,0.74]}),
 cube('LEG_FR',[0.22,0.76,0.22],'#451a03',[0.62,0.3,0.74],{rotation:[0,0,-0.34],pivot:[0.62,0.68,0.74]}),
 cube('LEG_BL',[0.22,0.76,0.22],'#451a03',[-0.62,0.3,-0.74],{rotation:[0,0,0.24],pivot:[-0.62,0.68,-0.74]}),
 cube('LEG_BR',[0.22,0.76,0.22],'#451a03',[0.62,0.3,-0.74],{rotation:[0,0,-0.24],pivot:[0.62,0.68,-0.74]}),
 cube('LEG_ML',[0.2,0.7,0.2],'#451a03',[-0.7,0.3,0.0],{rotation:[0,0,0.4],pivot:[-0.7,0.66,0]}),
 cube('LEG_MR',[0.2,0.7,0.2],'#451a03',[0.7,0.3,0.0],{rotation:[0,0,-0.4],pivot:[0.7,0.66,0]}),
 ...['LEG_FL','LEG_FR','LEG_BL','LEG_BR'].map((n,i)=>cube(`FOOT_${n.slice(4)}`,[0.26,0.1,0.3],'#1c0a02',[(i%2?0.62:-0.62)+(i%2?0.12:-0.12),0.05,i<2?0.74:-0.74],{parent:n,pivot:[(i%2?0.62:-0.62),0.68,i<2?0.74:-0.74],vc:false})),
],A(rel)));}

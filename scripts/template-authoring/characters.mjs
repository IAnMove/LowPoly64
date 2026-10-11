// Character pass: shape upgrade (cube limbs -> lofts, V torsos, mitten hands, boots that point
// at the face side), class extras parented to existing parts, cape side fix, clip start fixes.
// Rig/label pieces, names, parents, pivots and FACE_DECAL are never renamed or moved.
import {vc,shade,tint,rv,read,write,relTemplateColors,relVertexColors,cube,tbox,cyl,sphere,cone,pyramid,wedge,torus,loft,piece,PI} from './lib.mjs';
const PIECE_IDS=['archer','bomber','guard','hero','knight','mage','merchant','old-sage','psx_dragoon','psx_revenant','psx_warrior','star_ranger','starlight_princess','villager','mocap_human','cat','dog','mouse','rat','squirrel','knight_horse'];
const CM_IDS=['archer_cm','swordsman_cm','chicken_cm','psx_guard_v2_cm','psx_hero_v2_cm','n64_cover_mascot_v1_cm','n64_cover_mascot_v2_cm','psx_drake_pup_cm','n64_fenix_chick_cm','n64_chibi_ninja_cm','n64_skull_knight_cm','psx_black_mage_cm','psx_cloud_ff7_kimi_cm','psx_mecha_unit_cm','psx_slim_guard_cm'];
if(process.argv.includes('--list')){console.log([...PIECE_IDS,...CM_IDS].join(' '));process.exit(0);}
const R={UPPER:/^(LEFT|RIGHT)_ARM_UPPER$|^ARM_[LR]$|^(LEFT|RIGHT)_ARM$/,LOWER:/^(LEFT|RIGHT)_ARM_LOWER$|^FOREARM_[LR]$/,HAND:/^(LEFT|RIGHT)_HAND$|^HAND_[LR]$/,
 THIGH:/^(LEFT|RIGHT)_LEG_THIGH$|^LEG_[LR]$|^(LEFT|RIGHT)_LEG$/,SHIN:/^(LEFT|RIGHT)_LEG_SHIN$/,FOOT:/^(LEFT|RIGHT)_(FOOT|BOOT|SHOE)$|^BOOT_[LR]$/,
 TORSO:/^TORSO_VISUAL$|^BODY$|^TORSO$/,CAPE:/^(CAPA|CAPE)$/};
const LIMB_SCALE={UPPER:[0.56,0.46],LOWER:[0.5,0.42],THIGH:[0.58,0.46],SHIN:[0.52,0.44]}; // radius factor of footprint: [top,bottom]
const sec=(h,w,d,[ft,fb])=>[{y:-h/2,radiusX:+(w*fb).toFixed(3),radiusZ:+(d*fb).toFixed(3),offsetX:0,offsetZ:0},{y:+(h/2).toFixed(3),radiusX:+(w*ft).toFixed(3),radiusZ:+(d*ft).toFixed(3),offsetX:0,offsetZ:0}];
const roleOf=(n)=>Object.keys(R).find(k=>R[k].test(n));
// ---------- piece-format humanoids & companions ----------
function frontSign(pieces){const h=pieces.find(p=>p.name==='HEAD'),d=pieces.find(p=>p.name==='FACE_DECAL');if(!h||!d)return -1;return Math.sign(d.position[2]-h.position[2])||-1;}
function upgradeShapes(t,{quadruped=false}={}){
 const P=t.pieces,fz=frontSign(P),torso=P.find(p=>/^TORSO_VISUAL$|^BODY$/.test(p.name)&&p.geometry.type!=='label')||P.find(p=>p.name==='TORSO'&&p.geometry.type!=='label');
 for(const p of P){const g=p.geometry;if(g.type!=='cube')continue;const role=roleOf(p.name);if(!role)continue;const {width:w=1,height:h=1,depth:d=1}=g.params;
  if(quadruped&&role!=='CAPE')continue;
  if(LIMB_SCALE[role]){p.geometry={type:'limbLoft',params:{sides:6,sections:sec(h,w,d,LIMB_SCALE[role]),capTop:true,capBottom:true}};}
  else if(role==='HAND'){p.geometry={type:'taperedBox',params:{widthBottom:+(w*1.05).toFixed(3),depthBottom:+(d*1.05).toFixed(3),widthTop:+(w*0.82).toFixed(3),depthTop:+(d*0.86).toFixed(3),height:h,offsetTopX:0,offsetTopZ:0}};}
  else if(role==='FOOT'){p.geometry={type:'taperedBox',params:{widthBottom:+w.toFixed(3),depthBottom:+(d*1.12).toFixed(3),widthTop:+(w*0.82).toFixed(3),depthTop:+(d*0.6).toFixed(3),height:h,offsetTopX:0,offsetTopZ:+(-fz*d*0.2).toFixed(3)}};
    const ankle=p.pivot||p.position; p.position=rv([p.position[0],p.position[1],ankle[2]+fz*d*0.22]);}
  else if(role==='TORSO'&&p===torso){p.geometry={type:'taperedBox',params:{widthBottom:+(w*0.86).toFixed(3),depthBottom:+(d*0.9).toFixed(3),widthTop:+(w*1.03).toFixed(3),depthTop:+d.toFixed(3),height:h,offsetTopX:0,offsetTopZ:0}};}
 }
 // Capes hang at the back: mirror any cape authored on the face side.
 if(torso)for(const p of P){if(!R.CAPE.test(p.name))continue;const tz=torso.position[2];if((p.position[2]-tz)*fz>0){p.position=rv([p.position[0],p.position[1],tz-(p.position[2]-tz)]);if(p.rotation)p.rotation=rv([-p.rotation[0],p.rotation[1],p.rotation[2]]);}}
 return fz;
}
// helpers to place extras relative to an existing piece (absolute root-space positions)
const byName=(t,n)=>t.pieces.find(p=>p.name===n);
const dims=(p)=>{const g=p.geometry.params||{};if(p.geometry.type==='limbLoft'){const s=g.sections;return [Math.max(...s.map(x=>x.radiusX))*2,Math.abs(s[s.length-1].y-s[0].y),Math.max(...s.map(x=>x.radiusZ))*2];}if(p.geometry.type==='taperedBox')return [Math.max(g.widthBottom,g.widthTop),g.height,Math.max(g.depthBottom,g.depthTop)];return [g.width??g.radius*2??1,g.height??g.radius*2??1,g.depth??g.radius*2??1];};
function addAll(t,list){const names=new Set(t.pieces.map(p=>p.name));for(const p of list){if(!p||names.has(p.name))continue;t.pieces.push(p);names.add(p.name);}}
// Common extras for standard-named humanoids: boot cuffs, glove cuffs, collar, belt buckle.
function commonExtras(t,fz,{cuffColor,gloveColor,collarColor,buckle='#fbbf24'}={}){
 const out=[];
 for(const s of ['LEFT','RIGHT']){
  const shin=byName(t,`${s}_LEG_SHIN`)||byName(t,s==='LEFT'?'LEG_L':'LEG_R'),foot=byName(t,`${s}_FOOT`)||byName(t,s==='LEFT'?'BOOT_L':'BOOT_R');
  if(shin&&foot){const [w,h]=dims(shin);const c=cuffColor||foot.color;out.push(tbox(`${s}_BOOT_CUFF`,{wb:w*1.08,wt:w*1.28,h:0.24},c,[shin.position[0],shin.position[1]-h/2+0.32,shin.position[2]],{parent:shin.name}));}
  const low=byName(t,`${s}_ARM_LOWER`)||byName(t,s==='LEFT'?'FOREARM_L':'FOREARM_R'),hand=byName(t,`${s}_HAND`)||byName(t,s==='LEFT'?'HAND_L':'HAND_R');
  if(low&&hand){const [w,h]=dims(low);out.push(tbox(`${s}_GLOVE_CUFF`,{wb:w*1.08,wt:w*1.3,h:0.2},gloveColor||hand.color,[low.position[0],low.position[1]-h/2+0.18,low.position[2]],{parent:low.name}));}
 }
 const torso=byName(t,'TORSO_VISUAL')||byName(t,'BODY');
 if(torso&&torso.geometry.type!=='label'){const [w,h,d]=dims(torso);out.push(tbox('COLLAR',{wb:w*0.62,db:d*0.86,wt:w*0.5,dt:d*0.72,h:0.22},collarColor||shade(torso.color,0.8),[torso.position[0],torso.position[1]+h/2+0.06,torso.position[2]],{parent:torso.name}));}
 const belt=byName(t,'CINTURON')||byName(t,'BELT');
 if(belt&&!byName(t,'HEBILLA')&&!byName(t,'BELT_BUCKLE')){const [w,h,d]=dims(belt);out.push(cube('BELT_BUCKLE',[0.32,h*0.85,0.06],buckle,[belt.position[0],belt.position[1],belt.position[2]+fz*(d/2+0.02)],{parent:belt.name,vc:[0.3,0.8]}));}
 addAll(t,out);
}
function pauldrons(t,color){const out=[];for(const s of ['LEFT','RIGHT']){const up=byName(t,`${s}_ARM_UPPER`);if(!up)continue;const [w,h]=dims(up);const x=up.position[0]+(s==='LEFT'?-0.06:0.06);
 out.push(piece(`${s}_PAULDRON`,'sphere',{radius:w*0.82,radiusY:w*0.55,radiusZ:w*0.82,widthSegments:6,heightSegments:4},color,[x,up.position[1]+h/2-0.08,up.position[2]],{parent:up.name}));
 out.push(cube(`${s}_PAULDRON_TRIM`,[w*1.5,0.08,w*1.5],shade(color,0.7),[x,up.position[1]+h/2-0.28,up.position[2]],{parent:up.name,vc:false}));}addAll(t,out);}
function greaves(t,color){const out=[];for(const s of ['LEFT','RIGHT']){const shin=byName(t,`${s}_LEG_SHIN`);if(!shin)continue;const [w,h,d]=dims(shin);const fz=frontSign(t.pieces);out.push(tbox(`${s}_GREAVE`,{wb:w*0.9,db:0.12,wt:w*1.05,dt:0.12,h:h*0.6},color,[shin.position[0],shin.position[1]+0.08,shin.position[2]+fz*(d/2+0.04)],{parent:shin.name}));out.push(piece(`${s}_KNEE_GUARD`,'sphere',{radius:w*0.42,radiusY:w*0.4,radiusZ:w*0.3,widthSegments:6,heightSegments:4},tint(color,0.1),[shin.position[0],shin.position[1]+h/2,shin.position[2]+fz*(d/2)],{parent:shin.name}));}addAll(t,out);}
// ---------- clip start fixes ----------
const NON_REST=/release|reset|close|return|recover/i, GAIT=/^(walk|run)/i;
function fixClips(t,{restFromIdle=[]}={}){
 const P=t.pieces,by=Object.fromEntries(P.map(p=>[p.name,p]));const piv=p=>p.pivot||p.position;
 const local=(n)=>{const p=by[n];const par=p.parent&&by[p.parent];return piv(p).map((v,i)=>v-(par?piv(par)[i]:0));};
 const idle=(t.animations||[]).find(a=>a.name==='idle');
 for(const n of restFromIdle){const tr=idle?.tracks.find(x=>x.target===n&&x.property==='rotation');if(tr&&by[n])by[n].rotation=rv(tr.keyframes[0].value);}
 const fixed=[];
 for(const a of t.animations||[]){if(NON_REST.test(a.name))continue;
  for(const tr of a.tracks){const p=by[tr.target];if(!p||!tr.keyframes?.length)continue;const k0=tr.keyframes[0].value;
   if(tr.property==='position'){const L=local(tr.target),W=piv(p);const dl=Math.max(...k0.map((v,i)=>Math.abs(v-L[i]))),dw=Math.max(...k0.map((v,i)=>Math.abs(v-W[i])));
    if(Math.min(dl,dw)>0.05){const delta=L.map((v,i)=>v-k0[i]);tr.keyframes=tr.keyframes.map(k=>({...k,value:rv(k.value.map((v,i)=>v+delta[i]))}));fixed.push(`${a.name}:${tr.target}.p`);}}
   if(tr.property==='rotation'&&!GAIT.test(a.name)){const r=p.rotation||[0,0,0];const d=Math.max(...k0.map((v,i)=>Math.abs(v-r[i])));
    if(d>0.05&&d<0.6){const delta=r.map((v,i)=>v-k0[i]);tr.keyframes=tr.keyframes.map(k=>({...k,value:rv(k.value.map((v,i)=>v+delta[i]))}));fixed.push(`${a.name}:${tr.target}.r`);}}
 }}
 return fixed;
}
// Simple rigs (villager, old-sage) pivot their one-piece limbs at the limb centre, so arms poke
// above the shoulders once lowered and legs swing from the knee. Hang them from shoulder/hip.
function jointLimbs(t,torsoName){const torso=byName(t,torsoName);if(!torso)return;const [,th]=dims(torso);const shoulderY=torso.position[1]+th/2-0.12;
 for(const n of ['LEFT_ARM','RIGHT_ARM']){const a=byName(t,n);if(!a)continue;const [,h]=dims(a);a.pivot=rv([a.position[0],shoulderY,a.position[2]]);a.position=rv([a.position[0],shoulderY-h/2+0.05,a.position[2]]);}
 for(const n of ['LEFT_LEG','RIGHT_LEG']){const l=byName(t,n);if(!l)continue;const [,h]=dims(l);l.pivot=rv([l.position[0],l.position[1]+h/2,l.position[2]]);}}
// ---------- per-character configuration ----------
const CFG={
 hero:{extras:(t,fz)=>{commonExtras(t,fz,{cuffColor:'#7c4a28',gloveColor:'#7c4a28'});const h=byName(t,'HEAD');addAll(t,[cube('HAIR_FRINGE',[1.7,0.24,0.5],'#1e293b',[0,5.78,h.position[2]+fz*0.62],{parent:'HEAD'}),cube('HAIR_SIDE_L',[0.18,0.7,1.2],'#1e293b',[-0.86,5.3,0.1],{parent:'HEAD'}),cube('HAIR_SIDE_R',[0.18,0.7,1.2],'#1e293b',[0.86,5.3,0.1],{parent:'HEAD'})]);}},
 knight:{extras:(t,fz)=>{commonExtras(t,fz);pauldrons(t,'#94a3b8');greaves(t,'#94a3b8');}},
 guard:{extras:(t,fz)=>{commonExtras(t,fz);pauldrons(t,'#64748b');greaves(t,'#64748b');}},
 archer:{extras:(t,fz)=>{commonExtras(t,fz,{cuffColor:'#5b3a1e',gloveColor:'#5b3a1e'});const q=byName(t,'QUIVER');if(q){const [w,h]=dims(q);addAll(t,[0,1,2].flatMap(i=>[cyl(`ARROW_${i+1}`,[0.03,0.03,0.6,4],'#d6b37a',[q.position[0]-0.1+i*0.1,q.position[1]+h/2+0.2,q.position[2]],{parent:'QUIVER',vc:false}),pyramid(`FLETCH_${i+1}`,[0.12,0.16],['#ef4444','#f8fafc','#22c55e'][i],[q.position[0]-0.1+i*0.1,q.position[1]+h/2+0.5,q.position[2]],{parent:'QUIVER',vc:false})]));}}},
 mage:{extras:(t,fz)=>{commonExtras(t,fz,{gloveColor:'#4c1d95',cuffColor:'#4c1d95'});const pel=byName(t,'PELVIS'),tor=byName(t,'TORSO_VISUAL');if(tor){const [w,h,d]=dims(tor);addAll(t,[tbox('ROBE_SKIRT',{wb:w*1.25,db:d*1.25,wt:w*0.92,dt:d*0.95,h:1.4},tor.color,[0,tor.position[1]-h/2-0.6,tor.position[2]],{parent:'PELVIS'})]);}}},
 merchant:{extras:(t,fz)=>{commonExtras(t,fz);const tor=byName(t,'TORSO_VISUAL');if(tor){const [w,h,d]=dims(tor);addAll(t,[cube('APRON',[w*0.75,h*0.8,0.06],'#f5f5f4',[0,tor.position[1]-0.2,tor.position[2]+fz*(d/2+0.04)],{parent:'TORSO_VISUAL'}),cube('APRON_POCKET',[w*0.4,0.3,0.04],'#d6d3d1',[0,tor.position[1]-0.6,tor.position[2]+fz*(d/2+0.08)],{parent:'TORSO_VISUAL',vc:false}),sphere('COIN_POUCH',[0.22,6,4],'#a16207',[w*0.45,tor.position[1]-h/2+0.15,tor.position[2]+fz*(d/2)],{parent:'TORSO_VISUAL'})]);}}},
 bomber:{extras:(t,fz)=>{commonExtras(t,fz,{cuffColor:'#f472b6',gloveColor:'#f472b6'});const hm=byName(t,'HELMET');if(hm){const [w,h]=dims(hm);addAll(t,[cyl('ANTENNA',[0.04,0.04,0.5,4],'#9ca3af',[hm.position[0],hm.position[1]+h/2+0.25,hm.position[2]],{parent:'HELMET',vc:false}),sphere('ANTENNA_BALL',[0.18,6,4],'#ec4899',[hm.position[0],hm.position[1]+h/2+0.55,hm.position[2]],{parent:'HELMET'})]);}}},
 star_ranger:{extras:(t,fz)=>{commonExtras(t,fz);pauldrons(t,'#0f766e');}},
 starlight_princess:{extras:(t,fz)=>{commonExtras(t,fz,{cuffColor:'#f9a8d4',gloveColor:'#f8fafc'});for(const s of ['LEFT','RIGHT']){const up=byName(t,`${s}_ARM_UPPER`);if(up){const [w,h]=dims(up);addAll(t,[piece(`${s}_SLEEVE_PUFF`,'sphere',{radius:w*0.85,radiusY:w*0.7,radiusZ:w*0.85,widthSegments:6,heightSegments:4},'#f472b6',[up.position[0],up.position[1]+h/2-0.15,up.position[2]],{parent:up.name})]);}}}},
 psx_dragoon:{extras:(t,fz)=>commonExtras(t,fz)},
 psx_revenant:{extras:(t,fz)=>commonExtras(t,fz)},
 psx_warrior:{extras:(t,fz)=>commonExtras(t,fz)},
 mocap_human:{extras:(t,fz)=>commonExtras(t,fz,{cuffColor:'#f8fafc'})},
 'old-sage':{restFromIdle:['LEFT_ARM','RIGHT_ARM'],extras:(t)=>jointLimbs(t,'TORSO_VISUAL')},
 villager:{restFromIdle:['LEFT_ARM','RIGHT_ARM'],extras:(t)=>jointLimbs(t,'TORSO')},
};
// Quadruped companions: rounder bodies, tapered legs, paws, fluffier tails (names kept).
function upgradeCompanion(t){
 const P=t.pieces;
 for(const p of P){const g=p.geometry;if(g.type!=='cube')continue;const {width:w=1,height:h=1,depth:d=1}=g.params;
  if(/^LEG_(FL|FR|BL|BR)$/.test(p.name)){p.geometry={type:'limbLoft',params:{sides:6,sections:sec(h,w,d,[0.56,0.42]),capTop:true,capBottom:true}};}
  else if(/^(BODY|BACK)$/.test(p.name)){p.geometry={type:'taperedBox',params:{widthBottom:+(w*0.9).toFixed(3),depthBottom:+(d*0.95).toFixed(3),widthTop:+(w*0.96).toFixed(3),depthTop:+(d*0.9).toFixed(3),height:h,offsetTopX:0,offsetTopZ:0}};}
  else if(/^TAIL/.test(p.name)){p.geometry={type:'limbLoft',params:{sides:6,sections:[{y:-h/2,radiusX:+(w*0.5).toFixed(3),radiusZ:+(d*0.5).toFixed(3),offsetX:0,offsetZ:0},{y:+(h/2).toFixed(3),radiusX:+(w*0.36).toFixed(3),radiusZ:+(d*0.36).toFixed(3),offsetX:0,offsetZ:0}],capTop:true,capBottom:true}};}
 }
 const paws=[];for(const n of ['LEG_FL','LEG_FR','LEG_BL','LEG_BR']){const l=byName(t,n);if(!l)continue;const [w,h]=dims(l);paws.push(tbox(`PAW_${n.slice(4)}`,{wb:w*1.25,db:w*1.5,wt:w*1.0,dt:w*1.1,h:0.12},tint(l.color,0.12),[l.position[0],l.position[1]-h/2+0.06,l.position[2]],{parent:n}));}
 addAll(t,paws);
}
// ---------- CharacterModel characters ----------
const DEFAULT_TRIM={LIMB_LOFT:6,LATHE:8,SPHERE:8,CYLINDER:8};
function upgradeCM(t){
 const all=t.slots.flatMap(s=>s.pieces);const head=all.find(p=>p.name==='HEAD'),decal=all.find(p=>p.name==='FACE_DECAL');const fz=head&&decal?(Math.sign(decal.offset[2]-head.offset[2])||-1):-1;
 for(const p of all){const role=roleOf(p.name);if(p.template!=='CUBE'||!role||!p.size)continue;const [w,h,d]=p.size;
  if(LIMB_SCALE[role]){p.template='LIMB_LOFT';p.params={sides:6,sections:sec(h,w,d,LIMB_SCALE[role]),capTop:true,capBottom:true};}
  else if(role==='HAND'){p.template='TAPERED_BOX';p.params={...(p.params||{}),widthTop:+(w*0.82).toFixed(3),depthTop:+(d*0.86).toFixed(3)};}
  else if(role==='FOOT'){p.template='TAPERED_BOX';p.params={...(p.params||{}),widthTop:+(w*0.82).toFixed(3),depthTop:+(d*0.62).toFixed(3),offsetTopZ:+(-fz*d*0.18).toFixed(3)};}
  else if(role==='TORSO'&&p.name==='TORSO'){p.template='TAPERED_BOX';p.size=rv([w*0.86,h,d*0.9]);p.params={...(p.params||{}),widthTop:+(w*1.03).toFixed(3),depthTop:+d.toFixed(3)};}
 }
 // segment trims keep detailed models inside the 800-triangle style budget
 for(const p of all){const prm=p.params||{};if(p.template==='LIMB_LOFT'&&(prm.sides??6)>6)prm.sides=6;if(p.template==='LATHE'&&(prm.segments??8)>8)prm.segments=8;
  if(p.template==='SPHERE'){if((prm.widthSegments??8)>8)prm.widthSegments=8;if((prm.heightSegments??6)>6)prm.heightSegments=6;}if(p.template==='CYLINDER'&&(prm.radialSegments??8)>8)prm.radialSegments=8;if(Object.keys(prm).length)p.params=prm;}
}
// A bone piece with a rest rotation loses it as soon as a skeleton clip plays (clips set absolute
// rotations). Turn the bone into an empty LABEL joint that keeps the bone name, and hang the visual
// piece (renamed NAME_PIECE, with its authored tilt) and its children under it.
function jointize(t,name){
 const all=t.slots.flatMap(s=>s.pieces);if(all.some(p=>p.name===`${name}_PIECE`))return;
 for(const s of t.slots){const i=s.pieces.findIndex(p=>p.name===name);if(i<0)continue;const p=s.pieces[i];
  const at=rv(p.pivot||p.offset);const joint={template:'LABEL',name,offset:at,pivot:at,material:'#ffffff'};if(p.parent)joint.parent=p.parent;
  for(const q of all)if(q.parent===name)q.parent=`${name}_PIECE`;
  p.name=`${name}_PIECE`;p.parent=name;s.pieces.splice(i,0,joint);return;}
}
// Skeleton bones without an exact piece fall back to the slot's FIRST piece; make that the limb
// itself, not a decorative pauldron/boot that would then get animated instead of the arm.
// An arm parented to a rotated pauldron inherits that tilt, which the humanoid rig normalizer
// bakes into the arm; clips then reset it. Hang the arm from the torso and the pauldron from the arm.
function pauldronFollowsArm(t){const all=t.slots.flatMap(s=>s.pieces);const by=Object.fromEntries(all.map(p=>[p.name,p]));
 for(const up of all){if(!/_ARM_UPPER$/.test(up.name))continue;const pa=by[up.parent];if(!pa||!/PAULDRON/.test(pa.name))continue;up.parent=pa.parent;pa.parent=up.name;}}
function limbFirst(t){for(const s of t.slots){if(!/^(ARM|LEG)_[LR]$/.test(s.slotId))continue;const i=s.pieces.findIndex(p=>/(_ARM_UPPER|_LEG_THIGH)$|^(ARM|LEG)_[LR]_UPPER$/.test(p.name));if(i>0){const [p]=s.pieces.splice(i,1);s.pieces.unshift(p);}}}
// Detailed CM characters that sit just over the 800-triangle style budget get a tighter trim.
const TIGHT=new Set(['psx_black_mage_cm','psx_cloud_ff7_kimi_cm','n64_chibi_ninja_cm','n64_skull_knight_cm']);
function tightTrim(t){for(const p of t.slots.flatMap(s=>s.pieces)){const prm=p.params=p.params||{};
 if(p.template==='LATHE')prm.segments=Math.min(prm.segments??8,6);
 if(p.template==='LIMB_LOFT')prm.sides=Math.min(prm.sides??6,5);
 if(p.template==='SPHERE'){const tiny=Math.max(...(p.size||[1]))<0.3;prm.widthSegments=Math.min(prm.widthSegments??8,tiny?5:6);prm.heightSegments=Math.min(prm.heightSegments??6,tiny?3:4);}
 if(p.template==='CONE'||p.template==='CYLINDER')prm.radialSegments=Math.min(prm.radialSegments??8,6);
 if(p.template==='TORUS'){prm.tubularSegments=Math.min(prm.tubularSegments??8,8);prm.radialSegments=Math.min(prm.radialSegments??4,4);}
 if(!Object.keys(prm).length)delete p.params;}}
// ================= run =================
for(const id of PIECE_IDS){
 const t=relTemplateColors(read(`characters/${id}.json`));const cfg=CFG[id]||{};
 if(['cat','dog','mouse','rat','squirrel'].includes(id))upgradeCompanion(t);
 else if(id!=='knight_horse'){const fz=upgradeShapes(t);cfg.extras?.(t,fz);}
 for(const p of t.pieces)if(!p.vertexColors&&!p.faceColors&&!p.texture&&p.opacity==null&&!['label','plane'].includes(p.geometry.type))p.vertexColors=vc(p.color,0,0.84);
 const names=new Set(t.pieces.map(x=>x.name));for(const a of t.animations||[])a.tracks=a.tracks.map(tr=>names.has(tr.target)?tr:(tr.target==='NOSE'&&names.has('SNOUT')?{...tr,target:'SNOUT'}:null)).filter(Boolean);
 if(id==='mocap_human')for(const pc of t.pieces)if(pc.geometry.type==='capsule'){pc.geometry.params.radialSegments=6;pc.geometry.params.capSegments=2;}
 const fixed=fixClips(t,cfg);write(`characters/${id}.json`,t);if(fixed.length)console.log('  clips',id,fixed.join(' '));
}
for(const id of CM_IDS){
 const t=relTemplateColors(read(`characters/${id}.json`));upgradeCM(t);
 if(t.archetype!=='HUMANOID'){limbFirst(t);pauldronFollowsArm(t);}
 if(id==='psx_drake_pup_cm')jointize(t,'TAIL_BASE');
 if(id==='n64_fenix_chick_cm'){jointize(t,'TAIL');jointize(t,'WING_L');jointize(t,'WING_R');}
 for(const s of t.slots)for(const p of s.pieces)if(!p.vertexColors&&!p.faceColors&&!p.texture&&!p.decal&&p.opacity==null&&!['PLANE','LABEL'].includes(p.template))p.vertexColors=vc(p.material,0,0.84);
 if(TIGHT.has(id))tightTrim(t);
 write(`characters/${id}.json`,t);
}

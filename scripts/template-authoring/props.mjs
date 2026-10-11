import {cube,cyl,sphere,cone,pyramid,wedge,tbox,torus,capsule,lathe,loft,vc,shade,tint,read,write,template,anim,track,kf,PI} from './lib.mjs';
const C='Props';
const keepAnims=(rel)=>({animations:read(rel).animations});
// barrel
{
 const wood='#8b4513',iron='#555555';
 write('props/barrel.json',template('barrel','Barril',C,[
  lathe('BODY',{points:[[0,-1.25],[1.0,-1.25],[1.18,-0.5],[1.2,0.3],[1.1,1.25],[0,1.25]],segments:10},wood,[0,1.25,0]),
  cyl('LID',[0.92,0.92,0.08,10],tint(wood,0.15),[0,2.52,0]),
  torus('TOP_RING',[1.12,0.08,4,10],iron,[0,2.3,0],{rotation:[PI/2,0,0]}),
  torus('MID_RING',[1.22,0.08,4,10],iron,[0,1.25,0],{rotation:[PI/2,0,0]}),
  torus('BOT_RING',[1.06,0.08,4,10],iron,[0,0.2,0],{rotation:[PI/2,0,0]}),
  cube('STAVE_LINE_1',[0.05,2.3,0.06],shade(wood,0.7),[0,1.25,1.19],{vc:false}),
  cube('STAVE_LINE_2',[0.06,2.3,0.05],shade(wood,0.7),[1.19,1.25,0],{vc:false}),
  cube('STAVE_LINE_3',[0.05,2.3,0.06],shade(wood,0.7),[0,1.25,-1.19],{vc:false}),
  cube('STAVE_LINE_4',[0.06,2.3,0.05],shade(wood,0.7),[-1.19,1.25,0],{vc:false}),
  cyl('BUNG',[0.1,0.1,0.1,6],shade(wood,0.6),[0,1.7,1.2],{rotation:[PI/2,0,0]}),
 ]));
}
// bomb
{
 const a=keepAnims('props/bomb.json');
 write('props/bomb.json',template('bomb','Bomba',C,[
  sphere('BODY',[0.78,10,8],'#111827',[0,0.82,0],{faceColors:['#1f2937','#0b0f1a','#111827','#1f2937','#0b0f1a','#111827'],vc:[0.18,0.75]}),
  sphere('HIGHLIGHT',[0.2,6,4],'#334155',[-0.28,1.2,0.42],{scale:[1.3,0.7,1],vc:false}),
  cyl('CAP',[0.24,0.28,0.22,8],'#6b7280',[0,1.48,0]),
  cyl('CAP_RING',[0.3,0.3,0.06,8],'#9ca3af',[0,1.6,0]),
  cube('FUSE',[0.08,0.62,0.08],'#8b5a2b',[0.18,1.86,0],{rotation:[0,0,-0.52]}),
  cube('FUSE_TIP',[0.09,0.16,0.09],'#1f2937',[0.37,2.1,0],{rotation:[0,0,-0.52],vc:false}),
  sphere('SPARK',[0.12,6,5],'#f97316',[0.38,2.12,0],{opacity:0.88,vc:[0.3,0.9]}),
  sphere('SPARK_2',[0.06,5,4],'#fde047',[0.5,2.24,0.06],{opacity:0.9,vc:false}),
  sphere('FLASH',[0.52,8,6],'#fde68a',[0,0.94,0],{scale:[0.01,0.01,0.01],opacity:0.78,vc:false}),
 ],a));
}
// breakable_tablet
{
 const a=keepAnims('props/breakable_tablet.json'); const t=read('props/breakable_tablet.json');
 const stone='#94a3b8';
 write('props/breakable_tablet.json',template('breakable_tablet','Tableta Rompible',C,[
  tbox('BASE',{wb:2.8,db:1.3,wt:2.6,dt:1.1,h:0.3},'#475569',[0,0.15,0]),
  cube('TABLET_LEFT',[0.95,1.65,0.38],stone,[-0.5,1.25,0],{faceColors:t.pieces[1].faceColors}),
  cube('TABLET_RIGHT',[0.95,1.65,0.38],stone,[0.5,1.25,0],{faceColors:t.pieces[2].faceColors}),
  cube('TOP_CAP',[2.1,0.22,0.48],'#64748b',[0,2.15,0]),
  cube('RUNE',[1.5,0.9,0.05],'#67e8f9',[0,1.3,0.23],{opacity:0.72,vc:[0.3,0.8]}),
  cube('RUNE_BAR',[0.9,0.1,0.05],'#a5f3fc',[0,1.62,0.24],{opacity:0.8,vc:false}),
  cube('RUNE_DOT',[0.18,0.18,0.05],'#a5f3fc',[-0.45,1.05,0.24],{opacity:0.8,vc:false}),
  cube('CRACK',[0.08,1.35,0.08],'#1e293b',[0,1.35,0.22],{rotation:[0,0,0.35],vc:false}),
  cube('CRACK_2',[0.06,0.5,0.08],'#1e293b',[-0.3,0.8,0.22],{rotation:[0,0,-0.5],vc:false}),
  pyramid('DEBRIS_L',[0.35,0.28],'#64748b',[-0.8,0.44,0.25],{rotation:[0,0.2,0]}),
  pyramid('DEBRIS_R',[0.3,0.22],'#64748b',[0.85,0.41,-0.1],{rotation:[0,-0.4,0]}),
  pyramid('DEBRIS_C',[0.22,0.18],'#64748b',[0.3,0.39,0.5],{rotation:[0,0.9,0]}),
 ],a));
}
// bumper
{
 const a=keepAnims('props/bumper.json');
 write('props/bumper.json',template('bumper','Bumper',C,[
  cyl('BASE',[0.94,1.06,0.32,12],'#334155',[0,0.16,0]),
  cyl('BASE_RIM',[1.08,1.08,0.06,12],'#475569',[0,0.03,0]),
  torus('RING',[0.92,0.18,6,14],'#ef4444',[0,0.56,0],{rotation:[PI/2,0,0],vc:[0.2,0.75]}),
  cyl('PAD',[0.58,0.64,0.32,12],'#f8fafc',[0,0.56,0]),
  cyl('PAD_STRIPE',[0.66,0.66,0.08,12],'#ef4444',[0,0.48,0]),
  cyl('CORE',[0.24,0.24,0.14,12],'#60a5fa',[0,0.82,0],{opacity:0.82,vc:[0.3,0.85]}),
  cube('BOLT_1',[0.1,0.06,0.1],'#94a3b8',[0.95,0.33,0],{vc:false}),
  cube('BOLT_2',[0.1,0.06,0.1],'#94a3b8',[-0.95,0.33,0],{vc:false}),
  cube('BOLT_3',[0.1,0.06,0.1],'#94a3b8',[0,0.33,0.95],{vc:false}),
  cube('BOLT_4',[0.1,0.06,0.1],'#94a3b8',[0,0.33,-0.95],{vc:false}),
 ],a));
}
// button
{
 const a=keepAnims('props/button.json'); const t=read('props/button.json');
 write('props/button.json',template('button','Boton',C,[
  tbox('BASE',{wb:2.1,wt:1.9,h:0.46},'#1e293b',[0,0.58,0],{faceColors:t.pieces[0].faceColors}),
  cube('PLINTH',[2.3,0.36,2.3],'#0f172a',[0,0.18,0]),
  cube('RING',[2.06,0.08,2.06],'#64748b',[0,0.86,0]),
  cube('STRIPE_1',[0.5,0.09,2.08],'#fbbf24',[-0.7,0.86,0],{vc:false}),
  cube('STRIPE_2',[0.5,0.09,2.08],'#fbbf24',[0.7,0.86,0],{vc:false}),
  cyl('BUTTON_TOP',[0.84,0.9,0.56,12],'#ef4444',[0,1.08,0],{faceColors:t.pieces[2].faceColors}),
  cyl('BUTTON_LIGHT',[0.42,0.42,0.1,12],'#67e8f9',[0,1.34,0],{opacity:0.78,vc:[0.3,0.85]}),
 ],a));
}
// campfire
{
 const a=keepAnims('props/campfire.json');
 const stone='#6b7280';
 const stones=[];const n=7;for(let i=0;i<n;i++){const ang=i/n*PI*2;stones.push(sphere(`STONE_${i+1}`,[0.2+((i%3)*0.03),6,4],stone,[Math.cos(ang)*0.78,0.16,Math.sin(ang)*0.78],{scale:[1.1,0.7,0.95],rotation:[0,ang,0]}));}
 write('props/campfire.json',template('campfire','Hoguera',C,[
  cyl('ASH',[0.6,0.6,0.06,10],'#374151',[0,0.03,0]),
  cyl('LOG_A',[0.16,0.2,1.9,7],'#7c4a28',[0,0.22,0],{rotation:[0.42,0,0.92]}),
  cyl('LOG_B',[0.16,0.2,1.9,7],'#6b4423',[0,0.22,0],{rotation:[-0.42,0,-0.92]}),
  cyl('LOG_C',[0.14,0.18,1.6,7],'#7c4a28',[0,0.32,0],{rotation:[0,0.5,1.3]}),
  cyl('LOG_END_A',[0.17,0.17,0.06,7],'#d6b37a',[0.78,0.62,0.4],{rotation:[0.42,0,0.92]}),
  ...stones,
  cone('FLAME_OUTER',[0.46,1.2,8],'#f97316',[0,0.88,0],{opacity:0.86,vc:[0.25,0.85]}),
  cone('FLAME_INNER',[0.24,0.74,8],'#fde68a',[0,0.93,0],{opacity:0.92,vc:[0.1,0.9]}),
  cone('FLAME_SIDE',[0.18,0.6,6],'#fb923c',[0.3,0.62,0.15],{rotation:[0,0,-0.3],opacity:0.84,vc:[0.25,0.85]}),
  sphere('EMBER',[0.09,6,5],'#fff7ed',[0,1.28,0],{opacity:0.82,vc:false}),
  sphere('EMBER_2',[0.05,5,4],'#fdba74',[0.2,1.5,-0.1],{opacity:0.8,vc:false}),
 ],a));
}
// cannon
{
 const a=keepAnims('props/cannon.json');
 write('props/cannon.json',template('cannon','Canon',C,[
  cyl('BASE',[0.94,1.08,0.46,12],'#6b7280',[0,0.23,0]),
  cube('CRADLE',[1.4,0.42,1.4],'#8b5a2b',[0,0.64,0]),
  cube('CRADLE_ARM_L',[0.16,0.5,0.6],'#7c4a28',[-0.62,0.95,-0.3]),
  cube('CRADLE_ARM_R',[0.16,0.5,0.6],'#7c4a28',[0.62,0.95,-0.3]),
  cyl('BARREL',[0.52,0.66,2.8,12],'#4b5563',[0,1.42,0.66],{rotation:[1.02,0,0],pivot:[0,0.9,-0.42]}),
  torus('BARREL_BAND',[0.6,0.07,4,12],'#374151',[0,1.9,1.36],{rotation:[1.02,0,0],parent:'BARREL',pivot:[0,0.9,-0.42]}),
  torus('BARREL_LIP',[0.56,0.08,4,12],'#374151',[0,2.26,1.92],{rotation:[1.02,0,0],parent:'BARREL',pivot:[0,0.9,-0.42]}),
  cyl('MOUTH',[0.34,0.34,0.1,12],'#020617',[0,2.18,1.88],{rotation:[PI/2,0,0],parent:'BARREL',pivot:[0,0.9,-0.42],vc:false}),
  sphere('BREECH',[0.3,6,5],'#374151',[0,0.8,-0.6],{parent:'BARREL',pivot:[0,0.9,-0.42]}),
  cyl('WHEEL_L',[0.3,0.3,0.16,8],'#8b5a2b',[-0.84,0.62,0],{rotation:[0,0,PI/2]}),
  cyl('WHEEL_R',[0.3,0.3,0.16,8],'#8b5a2b',[0.84,0.62,0],{rotation:[0,0,PI/2]}),
  cyl('HUB_L',[0.1,0.1,0.2,6],'#94a3b8',[-0.86,0.62,0],{rotation:[0,0,PI/2]}),
  cyl('HUB_R',[0.1,0.1,0.2,6],'#94a3b8',[0.86,0.62,0],{rotation:[0,0,PI/2]}),
  sphere('BALL',[0.22,6,5],'#374151',[0.9,0.22,0.8]),
  sphere('FLASH',[0.42,8,6],'#fde68a',[0,2.28,2.02],{scale:[0.01,0.01,0.01],opacity:0.8,vc:false}),
 ],a));
}
// checkpoint
{
 const a=keepAnims('props/checkpoint.json'); const t=read('props/checkpoint.json');
 write('props/checkpoint.json',template('checkpoint','Punto Control',C,[
  cyl('BASE',[0.82,0.94,0.36,10],'#475569',[0,0.18,0]),
  cyl('PLATE',[0.66,0.72,0.18,10],'#64748b',[0,0.44,0]),
  cyl('PLATE_GLOW',[0.5,0.5,0.06,10],'#67e8f9',[0,0.56,0],{opacity:0.6,vc:false}),
  cube('POLE',[0.18,3.5,0.18],'#8b5a2b',[0,2.1,0]),
  cube('FLAG',[1.3,0.82,0.06],'#ef4444',[0.72,3.02,0],{pivot:[0.08,3.02,0],faceColors:t.pieces[3].faceColors}),
  cube('FLAG_STRIPE',[1.3,0.2,0.07],'#f8fafc',[0.72,3.02,0],{parent:'FLAG',pivot:[0.08,3.02,0],vc:false}),
  wedge('FLAG_TAIL',[0.5,0.82,0.06],'#ef4444',[1.62,3.02,0],{rotation:[0,PI/2,0],parent:'FLAG',pivot:[0.08,3.02,0]}),
  pyramid('CRYSTAL',[0.56,0.86],'#22d3ee',[0,4.1,0],{opacity:0.84,vc:[0.35,0.7]}),
  torus('AURA',[0.92,0.07,4,14],'#67e8f9',[0,0.62,0],{rotation:[PI/2,0,0],opacity:0.72,vc:false}),
 ],a));
}
// chest
{
 const a=keepAnims('props/chest.json'); const t=read('props/chest.json');
 const wood='#8b5a2b',lid='#9c6a34',iron='#4b5563',gold='#fbbf24';
 const piv=[0,1.23,-0.78];
 write('props/chest.json',template('chest','Cofre',C,[
  cube('BODY',[2.2,1.25,1.6],wood,[0,0.625,0],{faceColors:t.pieces[0].faceColors}),
  cube('BODY_PLANK_LINE',[2.22,0.04,1.62],shade(wood,0.7),[0,0.42,0],{vc:false}),
  cube('FEET_L',[0.3,0.12,1.5],shade(wood,0.7),[-0.9,0.06,0]),
  cube('FEET_R',[0.3,0.12,1.5],shade(wood,0.7),[0.9,0.06,0]),
  cube('LID',[2.2,0.82,1.6],lid,[0,1.63,0],{pivot:piv,faceColors:t.pieces[1].faceColors}),
  cube('LID_TOP_BAND',[2.26,0.16,0.3],iron,[0,2.0,0.4],{parent:'LID',pivot:piv}),
  cube('LID_TOP_BAND_2',[2.26,0.16,0.3],iron,[0,2.0,-0.4],{parent:'LID',pivot:piv}),
  cube('RIM',[2.28,0.1,1.66],iron,[0,1.24,0]),
  cube('BAND_FRONT',[2.24,0.18,0.12],iron,[0,0.72,0.82]),
  cube('BAND_LEFT',[0.12,1.05,1.64],iron,[-1.04,0.72,0]),
  cube('BAND_RIGHT',[0.12,1.05,1.64],iron,[1.04,0.72,0]),
  cube('CORNER_FL',[0.18,0.6,0.18],tint(iron,0.1),[-1.06,0.3,0.78],{vc:false}),
  cube('CORNER_FR',[0.18,0.6,0.18],tint(iron,0.1),[1.06,0.3,0.78],{vc:false}),
  cube('LOCK_BASE',[0.46,0.28,0.12],gold,[0,0.96,0.83],{vc:[0.3,0.8]}),
  cube('KEYHOLE',[0.1,0.14,0.06],'#1f2937',[0,0.95,0.9],{vc:false}),
  cube('LOCK_LATCH',[0.22,0.35,0.12],'#fde68a',[0,1.45,0.83],{parent:'LID',pivot:piv,vc:[0.2,0.85]}),
 ],a));
}
// coin
{
 const a=keepAnims('props/coin.json'); const t=read('props/coin.json');
 write('props/coin.json',template('coin','Moneda',C,[
  cyl('COIN',[0.95,0.95,0.26,16],'#fcd34d',[0,1.5,0],{rotation:[PI/2,0,0],faceColors:t.pieces[0].faceColors,vc:[0.3,0.8]}),
  cyl('COIN_RIM',[0.78,0.78,0.3,16],'#fde68a',[0,1.5,0],{rotation:[PI/2,0,0],parent:'COIN',pivot:[0,1.5,0],vc:[0.3,0.85]}),
  pyramid('EMBLEM',[0.42,0.12],'#fef3c7',[0,1.5,0.17],{rotation:[PI/2,0,0],parent:'COIN',pivot:[0,1.5,0],vc:false}),
  pyramid('EMBLEM_BACK',[0.42,0.12],'#fef3c7',[0,1.5,-0.17],{rotation:[-PI/2,0,0],parent:'COIN',pivot:[0,1.5,0],vc:false}),
 ],a));
}
// crate
{
 const wood='#8b4513',band='#ffcc00';
 write('props/crate.json',template('crate','Caja',C,[
  cube('BODY',[2,2,2],wood,[0,1,0]),
  cube('PLANK_LINE_1',[2.02,0.05,2.02],shade(wood,0.7),[0,0.66,0],{vc:false}),
  cube('PLANK_LINE_2',[2.02,0.05,2.02],shade(wood,0.7),[0,1.33,0],{vc:false}),
  cube('EDGE_1',[0.16,2.06,0.16],shade(wood,0.8),[-1,1,1],{}),
  cube('EDGE_2',[0.16,2.06,0.16],shade(wood,0.8),[1,1,1],{}),
  cube('EDGE_3',[0.16,2.06,0.16],shade(wood,0.8),[-1,1,-1],{}),
  cube('EDGE_4',[0.16,2.06,0.16],shade(wood,0.8),[1,1,-1],{}),
  cube('STRIP_H',[2.05,0.15,0.15],band,[0,1,1.01]),
  cube('STRIP_V',[0.15,2.05,0.15],band,[0,1,1.01]),
  cube('STRIP_H_BACK',[2.05,0.15,0.15],band,[0,1,-1.01]),
  cube('STRIP_H_L',[0.15,0.15,2.05],band,[-1.01,1,0]),
  cube('STRIP_H_R',[0.15,0.15,2.05],band,[1.01,1,0]),
  cube('STRIP_TOP',[2.05,0.15,0.15],band,[0,2.01,0]),
 ]));
}
// crystal_switch
{
 const a=keepAnims('props/crystal_switch.json');
 write('props/crystal_switch.json',template('crystal_switch','Switch Cristal',C,[
  tbox('BASE',{wb:2.3,wt:2.1,h:0.42},'#475569',[0,0.21,0]),
  cube('BASE_TRIM',[2.2,0.06,2.2],'#334155',[0,0.44,0],{vc:false}),
  tbox('PEDESTAL',{wb:1.3,wt:1.1,h:0.34},'#64748b',[0,0.62,0]),
  cube('RUNE_F',[0.5,0.12,0.04],'#67e8f9',[0,0.6,0.62],{opacity:0.8,vc:false}),
  cube('RUNE_B',[0.5,0.12,0.04],'#67e8f9',[0,0.6,-0.62],{opacity:0.8,vc:false}),
  pyramid('CRYSTAL_TOP',[0.74,0.88],'#60a5fa',[0,1.42,0],{opacity:0.84,vc:[0.35,0.7]}),
  pyramid('CRYSTAL_BOTTOM',[0.74,0.64],'#3b82f6',[0,0.8,0],{rotation:[PI,0,0],opacity:0.8,vc:[0.35,0.7]}),
  torus('AURA',[0.86,0.06,4,14],'#bfdbfe',[0,0.98,0],{rotation:[PI/2,0,0],opacity:0.74,vc:false}),
 ],a));
}
// item_box
{
 const a=keepAnims('props/item_box.json');
 for(const tr of a.animations[0].tracks){const k0=tr.keyframes[0].value,kn=tr.keyframes.at(-1);if(tr.property==='rotation')kn.value=[k0[0],kn.value[1],k0[2]];}
 const piv=[0,1,0];
 write('props/item_box.json',template('item_box','Caja Item',C,[
  cube('RIG',[0.01,0.01,0.01],'#020617',[0,1,0],{pivot:piv,opacity:0,vc:false}),
  cube('SHELL',[1.7,1.7,1.7],'#38bdf8',[0,1,0],{parent:'RIG',pivot:piv,opacity:0.48,vc:[0.3,0.8]}),
  cube('FRAME_TOP',[1.78,0.12,1.78],'#e2e8f0',[0,1.86,0],{parent:'RIG',pivot:piv}),
  cube('FRAME_BOTTOM',[1.78,0.12,1.78],'#cbd5e1',[0,0.14,0],{parent:'RIG',pivot:piv}),
  cube('FRAME_EDGE_1',[0.12,1.78,0.12],'#e2e8f0',[-0.85,1,0.85],{parent:'RIG',pivot:piv}),
  cube('FRAME_EDGE_2',[0.12,1.78,0.12],'#e2e8f0',[0.85,1,0.85],{parent:'RIG',pivot:piv}),
  cube('FRAME_EDGE_3',[0.12,1.78,0.12],'#e2e8f0',[-0.85,1,-0.85],{parent:'RIG',pivot:piv}),
  cube('FRAME_EDGE_4',[0.12,1.78,0.12],'#e2e8f0',[0.85,1,-0.85],{parent:'RIG',pivot:piv}),
  sphere('ICON_CORE',[0.28,8,6],'#fde047',[0,1,0],{parent:'RIG',pivot:piv,vc:[0.3,0.85]}),
  pyramid('ICON_TOP',[0.42,0.46],'#facc15',[0,1.36,0],{parent:'RIG',pivot:piv,vc:[0.3,0.85]}),
  pyramid('ICON_BOTTOM',[0.42,0.46],'#facc15',[0,0.64,0],{rotation:[PI,0,0],parent:'RIG',pivot:piv,vc:[0.3,0.85]}),
  cube('ICON_RING',[0.9,0.06,0.06],'#fef08a',[0,1,0],{rotation:[0,0.785,0],parent:'RIG',pivot:piv,vc:false}),
 ],a));
}
// key
{
 const a=keepAnims('props/key.json'); const t=read('props/key.json');
 const gold='#fcd34d';const piv=[0,2,0];
 write('props/key.json',template('key','Llave',C,[
  cube('KEY_HEAD',[0.34,1.12,0.12],gold,[0,2,0],{faceColors:t.pieces[0].faceColors,vc:[0.3,0.8]}),
  cube('KEY_SHAFT',[0.18,1.82,0.12],gold,[0,1.08,0],{parent:'KEY_HEAD',pivot:piv,vc:[0.3,0.8]}),
  cube('KEY_COLLAR',[0.3,0.12,0.16],tint(gold,0.2),[0,1.42,0],{parent:'KEY_HEAD',pivot:piv,vc:[0.3,0.8]}),
  cube('KEY_TEETH_TOP',[0.48,0.18,0.12],gold,[0.08,0.42,0],{parent:'KEY_SHAFT',pivot:piv,vc:[0.3,0.8]}),
  cube('KEY_TEETH_BOTTOM',[0.28,0.26,0.12],gold,[-0.06,0.18,0],{parent:'KEY_SHAFT',pivot:piv,vc:[0.3,0.8]}),
  cube('KEY_TEETH_MID',[0.2,0.14,0.12],gold,[0.3,0.7,0],{parent:'KEY_SHAFT',pivot:piv,vc:[0.3,0.8]}),
  torus('KEY_RING',[0.36,0.08,6,10],gold,[0,2.68,0],{parent:'KEY_HEAD',pivot:piv,vc:[0.3,0.8]}),
  sphere('KEY_GEM',[0.11,6,5],'#ef4444',[0,2.68,0],{parent:'KEY_HEAD',pivot:piv,vc:[0.3,0.8]}),
 ],a));
}
// ladder
{
 const wood='#8b5a2b',rung='#c08457';
 const rungs=[];for(let i=0;i<6;i++)rungs.push(cyl(`RUNG_${i+1}`,[0.08,0.08,1.1,6],rung,[0,0.7+i*0.65,0],{rotation:[0,0,PI/2]}));
 write('props/ladder.json',template('ladder','Escalera',C,[
  cube('RAIL_L',[0.18,4.2,0.18],wood,[-0.64,2.1,0],{rotation:[0,0,0.06]}),
  cube('RAIL_R',[0.18,4.2,0.18],wood,[0.64,2.1,0],{rotation:[0,0,-0.06]}),
  ...rungs,
  cube('FOOT_L',[0.22,0.12,0.26],'#4b5563',[-0.76,0.06,0],{vc:false}),
  cube('FOOT_R',[0.22,0.12,0.26],'#4b5563',[0.76,0.06,0],{vc:false}),
  cube('BRACE',[1.1,0.08,0.08],shade(wood,0.8),[0,3.62,-0.1],{vc:false}),
 ]));
}
// lamp-post
{
 const t=read('props/lamp-post.json'); const iron='#4b5563',pole='#374151';
 write('props/lamp-post.json',template('lamp-post','Farola',C,[
  cyl('BASE',[0.55,0.6,0.22,10],iron,[0,0.11,0]),
  cyl('BASE_COLLAR',[0.3,0.42,0.3,8],iron,[0,0.37,0]),
  loft('POLE',{sides:8,sections:[{y:-2.1,radiusX:0.22,radiusZ:0.22},{y:0,radiusX:0.16,radiusZ:0.16},{y:2.1,radiusX:0.13,radiusZ:0.13}]},pole,[0,2.2,0]),
  torus('POLE_RING',[0.17,0.04,4,8],iron,[0,3.3,0],{rotation:[PI/2,0,0]}),
  cube('ARM',[0.95,0.12,0.12],iron,[0.45,4.2,0]),
  cube('ARM_BRACE',[0.6,0.08,0.08],iron,[0.3,3.95,0],{rotation:[0,0,0.6]}),
  sphere('ARM_FINIAL',[0.12,6,5],iron,[0,4.38,0]),
  cyl('HANGER',[0.05,0.05,0.7,6],iron,[0.85,3.85,0]),
  cube('LANTERN_FRAME',[0.76,0.96,0.76],iron,[0.85,3.34,0],{faceColors:t.pieces[4].faceColors}),
  cube('LANTERN_GLASS',[0.56,0.76,0.56],'#fde68a',[0.85,3.34,0],{opacity:0.38,vc:false}),
  cube('LIGHT_CORE',[0.28,0.46,0.28],'#fff7b2',[0.85,3.34,0],{opacity:0.78,vc:false}),
  cone('TOP',[0.42,0.38,6],iron,[0.85,4.02,0]),
  cube('LANTERN_FOOT',[0.5,0.06,0.5],iron,[0.85,2.84,0]),
 ]));
}
// lever
{
 const a=keepAnims('props/lever.json');
 const piv=[0,0.95,0];
 write('props/lever.json',template('lever','Palanca',C,[
  tbox('BASE',{wb:1.2,db:1.4,wt:1.0,dt:1.18,h:0.42},'#4b3f35',[0,0.58,0]),
  cube('PLINTH',[1.4,0.36,1.6],'#2f2822',[0,0.18,0]),
  cube('SOCKET',[0.34,0.3,0.34],'#1e293b',[0,0.93,0]),
  cube('TRACK',[0.1,0.06,1.0],'#64748b',[0,0.81,0],{vc:false}),
  cube('LEVER_ARM',[0.2,2.1,0.2],'#8b5a2b',[0,1.84,0],{pivot:piv}),
  cube('LEVER_COLLAR',[0.26,0.14,0.26],'#4b5563',[0,1.1,0],{parent:'LEVER_ARM',pivot:piv,vc:false}),
  sphere('HANDLE',[0.22,8,6],'#f97316',[0,2.95,0],{parent:'LEVER_ARM',pivot:piv,vc:[0.3,0.8]}),
 ],a));
}
// portal
{
 const a=keepAnims('props/portal.json');
 write('props/portal.json',template('portal','Portal',C,[
  tbox('BASE',{wb:3.2,db:1.3,wt:3.0,dt:1.1,h:0.42},'#334155',[0,0.21,0]),
  cube('STEP',[3.6,0.16,1.8],'#1e293b',[0,0.08,0.2]),
  tbox('PEDESTAL',{wb:2.3,db:0.95,wt:2.2,dt:0.86,h:0.4},'#475569',[0,0.62,0]),
  torus('RING_OUTER',[1.78,0.22,6,16],'#64748b',[0,2.42,0]),
  torus('RING_INNER',[1.38,0.08,4,14],'#67e8f9',[0,2.42,0],{opacity:0.74,vc:false}),
  sphere('CORE',[1.16,10,8],'#22d3ee',[0,2.42,0],{scale:[1,1.42,0.16],opacity:0.68,vc:[0.3,0.8]}),
  cube('RUNE_L',[0.16,0.44,0.16],'#f8fafc',[-1.62,2.42,0],{vc:false}),
  cube('RUNE_R',[0.16,0.44,0.16],'#f8fafc',[1.62,2.42,0],{vc:false}),
  cube('RUNE_T',[0.16,0.44,0.16],'#f8fafc',[0,4.02,0],{rotation:[0,0,PI/2],vc:false}),
  cube('RUNE_BL',[0.14,0.36,0.14],'#cbd5e1',[-1.2,1.28,0],{rotation:[0,0,0.785],vc:false}),
  cube('RUNE_BR',[0.14,0.36,0.14],'#cbd5e1',[1.2,1.28,0],{rotation:[0,0,-0.785],vc:false}),
  cube('PILLAR_L',[0.34,1.1,0.4],'#475569',[-1.6,1.37,0]),
  cube('PILLAR_R',[0.34,1.1,0.4],'#475569',[1.6,1.37,0]),
 ],a));
}
// potion
{
 write('props/potion.json',template('potion','Pocion',C,[
  lathe('BOTTLE',{points:[[0,-0.52],[0.4,-0.5],[0.52,-0.1],[0.44,0.32],[0.2,0.52],[0.16,0.52]],segments:8},'#bfdbfe',[0,0.58,0],{opacity:0.38,vc:false}),
  sphere('LIQUID',[0.42,8,6],'#d946ef',[0,0.42,0],{scale:[1,0.82,1],opacity:0.92,vc:[0.25,0.75]}),
  sphere('BUBBLE_1',[0.06,5,4],'#f5d0fe',[0.12,0.6,0.1],{opacity:0.9,vc:false}),
  sphere('BUBBLE_2',[0.04,5,4],'#f5d0fe',[-0.14,0.5,-0.08],{opacity:0.9,vc:false}),
  cyl('NECK',[0.14,0.2,0.6,8],'#bfdbfe',[0,1.1,0],{opacity:0.38,vc:false}),
  cube('SEAL',[0.28,0.08,0.28],'#fbbf24',[0,1.34,0],{vc:[0.3,0.8]}),
  cyl('CORK',[0.18,0.16,0.18,8],'#8b5a2b',[0,1.5,0]),
  cube('LABEL',[0.32,0.34,0.05],'#fef3c7',[0,0.52,0.45],{opacity:0.94,vc:false}),
  cube('LABEL_MARK',[0.18,0.06,0.06],'#b91c1c',[0,0.56,0.46],{vc:false}),
 ]));
}
// pressure_plate
{
 const a=keepAnims('props/pressure_plate.json'); const t=read('props/pressure_plate.json');
 write('props/pressure_plate.json',template('pressure_plate','Placa de Presion',C,[
  cube('BASE',[2.5,0.34,2.5],'#1e293b',[0,0.38,0]),
  cube('FOOT',[2.7,0.22,2.7],'#0f172a',[0,0.11,0]),
  cube('TOP',[2.14,0.4,2.14],'#eab308',[0,0.72,0],{faceColors:t.pieces[1].faceColors}),
  cube('GLYPH',[1.7,0.08,1.7],'#67e8f9',[0,0.98,0],{opacity:0.72,vc:false}),
  cube('GLYPH_BAR',[0.9,0.1,0.14],'#a5f3fc',[0,0.98,0],{opacity:0.8,vc:false}),
  cube('GLYPH_BAR_2',[0.14,0.1,0.9],'#a5f3fc',[0,0.98,0],{opacity:0.8,vc:false}),
  cube('RIVET_1',[0.14,0.1,0.14],'#475569',[-1.1,0.56,1.1],{vc:false}),
  cube('RIVET_2',[0.14,0.1,0.14],'#475569',[1.1,0.56,1.1],{vc:false}),
  cube('RIVET_3',[0.14,0.1,0.14],'#475569',[-1.1,0.56,-1.1],{vc:false}),
  cube('RIVET_4',[0.14,0.1,0.14],'#475569',[1.1,0.56,-1.1],{vc:false}),
 ],a));
}
// question_block
{
 const a=keepAnims('props/question_block.json'); const t=read('props/question_block.json');
 const piv=[0,1,0];const mark='#fde68a',rivet='#92400e';
 const face=(suffix,rot,off)=>{ // helper to replicate ? mark on another face via rotation of parent-less cubes
   return [];};
 write('props/question_block.json',template('question_block','Bloque Sorpresa',C,[
  cube('BLOCK',[1.6,1.6,1.6],'#f59e0b',[0,1,0],{pivot:piv,faceColors:t.pieces[0].faceColors,vc:[0.2,0.8]}),
  cube('MARK_FRONT',[0.26,0.74,0.08],mark,[0,1.02,0.86],{parent:'BLOCK',pivot:piv,vc:false}),
  cube('MARK_TOP',[0.64,0.18,0.08],mark,[0.14,1.38,0.86],{parent:'BLOCK',pivot:piv,vc:false}),
  cube('MARK_FOOT',[0.22,0.22,0.08],mark,[0.12,0.5,0.86],{parent:'BLOCK',pivot:piv,vc:false}),
  cube('MARK_SIDE',[0.52,0.18,0.08],mark,[0.14,0.82,0.86],{parent:'BLOCK',pivot:piv,vc:false}),
  cube('MARK_BACK_V',[0.26,0.74,0.08],mark,[0,1.02,-0.86],{parent:'BLOCK',pivot:piv,vc:false}),
  cube('MARK_BACK_TOP',[0.64,0.18,0.08],mark,[-0.14,1.38,-0.86],{parent:'BLOCK',pivot:piv,vc:false}),
  cube('MARK_BACK_FOOT',[0.22,0.22,0.08],mark,[-0.12,0.5,-0.86],{parent:'BLOCK',pivot:piv,vc:false}),
  cube('MARK_BACK_SIDE',[0.52,0.18,0.08],mark,[-0.14,0.82,-0.86],{parent:'BLOCK',pivot:piv,vc:false}),
  cube('MARK_L_V',[0.08,0.74,0.26],mark,[-0.86,1.02,0],{parent:'BLOCK',pivot:piv,vc:false}),
  cube('MARK_L_TOP',[0.08,0.18,0.64],mark,[-0.86,1.38,0.14],{parent:'BLOCK',pivot:piv,vc:false}),
  cube('MARK_L_FOOT',[0.08,0.22,0.22],mark,[-0.86,0.5,0.12],{parent:'BLOCK',pivot:piv,vc:false}),
  cube('MARK_L_SIDE',[0.08,0.18,0.52],mark,[-0.86,0.82,0.14],{parent:'BLOCK',pivot:piv,vc:false}),
  cube('MARK_R_V',[0.08,0.74,0.26],mark,[0.86,1.02,0],{parent:'BLOCK',pivot:piv,vc:false}),
  cube('MARK_R_TOP',[0.08,0.18,0.64],mark,[0.86,1.38,-0.14],{parent:'BLOCK',pivot:piv,vc:false}),
  cube('MARK_R_FOOT',[0.08,0.22,0.22],mark,[0.86,0.5,-0.12],{parent:'BLOCK',pivot:piv,vc:false}),
  cube('MARK_R_SIDE',[0.08,0.18,0.52],mark,[0.86,0.82,-0.14],{parent:'BLOCK',pivot:piv,vc:false}),
  ...[[-0.58,1.58,0.78],[0.58,1.58,0.78],[-0.58,0.42,0.78],[0.58,0.42,0.78],[-0.58,1.58,-0.78],[0.58,1.58,-0.78],[-0.58,0.42,-0.78],[0.58,0.42,-0.78]].map((p,i)=>cube(`RIVET_${i+1}`,[0.12,0.12,0.12],rivet,p,{parent:'BLOCK',pivot:piv,vc:false})),
  ...[[-0.78,1.58,0.58],[-0.78,1.58,-0.58],[-0.78,0.42,0.58],[-0.78,0.42,-0.58],[0.78,1.58,0.58],[0.78,1.58,-0.58],[0.78,0.42,0.58],[0.78,0.42,-0.58]].map((p,i)=>cube(`RIVET_S${i+1}`,[0.12,0.12,0.12],rivet,p,{parent:'BLOCK',pivot:piv,vc:false})),
 ],a));
}
// red_coin
{
 const a=keepAnims('props/red_coin.json'); const t=read('props/red_coin.json');
 write('props/red_coin.json',template('red_coin','Moneda Roja',C,[
  cyl('COIN',[0.64,0.64,0.16,14],'#ef4444',[0,1,0],{pivot:[0,1,0],faceColors:t.pieces[0].faceColors,vc:[0.25,0.8]}),
  cyl('INNER',[0.42,0.42,0.18,14],'#fee2e2',[0,1,0],{parent:'COIN',pivot:[0,1,0],vc:[0.1,0.9]}),
  cyl('CORE',[0.2,0.2,0.2,10],'#ef4444',[0,1,0],{parent:'COIN',pivot:[0,1,0],vc:[0.25,0.8]}),
 ],a));
}
// shield
{
 const blue='#0088ff',gold='#ffcc00';
 write('props/shield.json',template('shield','Escudo',C,[
  cyl('BODY',[1,1,0.15,6],blue,[0,1,0],{rotation:[PI/2,0,0]}),
  cyl('RIM',[1.06,1.06,0.1,6],gold,[0,1,-0.02],{rotation:[PI/2,0,0],vc:[0.3,0.8]}),
  cyl('INNER_RING',[0.62,0.62,0.04,6],tint(blue,0.25),[0,1,0.08],{rotation:[PI/2,0,0],vc:false}),
  cyl('BOSS',[0.3,0.3,0.2,6],gold,[0,1,0.14],{rotation:[PI/2,0,0],vc:[0.3,0.8]}),
  sphere('BOSS_GEM',[0.12,6,5],'#ef4444',[0,1,0.26],{vc:[0.3,0.8]}),
  cube('STRAP',[0.15,0.6,0.3],'#8b4513',[0,1,-0.2]),
  cube('GRIP',[0.6,0.12,0.12],'#8b4513',[0,1,-0.2]),
 ]));
}
// signpost
{
 const t=read('props/signpost.json'); const wood='#8b5a2b',board='#c08457';
 write('props/signpost.json',template('signpost','Senal',C,[
  tbox('POST',{wb:0.32,wt:0.26,h:3.4},wood,[0,1.7,0]),
  pyramid('POST_CAP',[0.34,0.24],shade(wood,0.85),[0,3.52,0]),
  cube('POST_BASE',[0.5,0.2,0.5],shade(wood,0.7),[0,0.1,0]),
  cube('BOARD_MAIN',[2.2,0.72,0.12],board,[0.7,2.6,0],{faceColors:t.pieces[1].faceColors}),
  wedge('BOARD_ARROW',[0.9,0.72,0.12],board,[2.05,2.6,0],{rotation:[0,PI/2,0]}),
  cube('TEXT_1',[1.3,0.08,0.03],shade(board,0.5),[0.7,2.72,0.07],{vc:false}),
  cube('TEXT_2',[1.0,0.08,0.03],shade(board,0.5),[0.6,2.52,0.07],{vc:false}),
  cube('BOARD_SMALL',[1.4,0.48,0.1],'#b7794a',[-0.6,1.95,0.02],{rotation:[0,0,-0.08]}),
  cube('TEXT_3',[0.8,0.07,0.03],shade(board,0.5),[-0.6,1.95,0.08],{rotation:[0,0,-0.08],vc:false}),
  cube('PEG_TOP',[0.08,0.08,0.16],'#374151',[0.1,2.6,0.08],{vc:false}),
  cube('PEG_LOW',[0.08,0.08,0.16],'#374151',[-0.36,1.95,0.08],{vc:false}),
  sphere('GRASS',[0.26,5,4],'#4d7c0f',[0.4,0.1,0.3],{scale:[1.4,0.35,1.1]}),
 ]));
}
// spike_trap
{
 const a=keepAnims('props/spike_trap.json');
 const spike=(n,r,h,pos)=>cone(n,[r,h,6],'#cbd5e1',pos,{parent:'SPIKE_RIG',vc:[0.2,0.7]});
 write('props/spike_trap.json',template('spike_trap','Trampa Pinchos',C,[
  cube('BASE',[2.4,0.34,2.4],'#334155',[0,0.17,0]),
  cube('TOP',[2.08,0.12,2.08],'#475569',[0,0.4,0]),
  cube('GRATE_1',[2.0,0.04,0.08],'#1e293b',[0,0.47,-0.62],{vc:false}),
  cube('GRATE_2',[2.0,0.04,0.08],'#1e293b',[0,0.47,0.62],{vc:false}),
  cube('GRATE_3',[0.08,0.04,2.0],'#1e293b',[-0.62,0.47,0],{vc:false}),
  cube('GRATE_4',[0.08,0.04,2.0],'#1e293b',[0.62,0.47,0],{vc:false}),
  cube('SPIKE_RIG',[0.01,0.01,0.01],'#020617',[0,0.38,0],{opacity:0,vc:false}),
  spike('SPIKE_C',0.24,0.72,[0,0.76,0]),
  spike('SPIKE_FL',0.2,0.62,[-0.62,0.7,0.62]),spike('SPIKE_FR',0.2,0.62,[0.62,0.7,0.62]),
  spike('SPIKE_BL',0.2,0.62,[-0.62,0.7,-0.62]),spike('SPIKE_BR',0.2,0.62,[0.62,0.7,-0.62]),
  spike('SPIKE_N',0.16,0.5,[0,0.64,-0.62]),spike('SPIKE_S',0.16,0.5,[0,0.64,0.62]),
  spike('SPIKE_E',0.16,0.5,[0.62,0.64,0]),spike('SPIKE_W',0.16,0.5,[-0.62,0.64,0]),
 ],a));
}
// spring_pad
{
 const a=keepAnims('props/spring_pad.json'); const t=read('props/spring_pad.json');
 write('props/spring_pad.json',template('spring_pad','Muelle',C,[
  tbox('BASE',{wb:2.3,wt:2.1,h:0.36},'#334155',[0,0.18,0]),
  cube('BASE_PLATE',[1.4,0.08,1.4],'#475569',[0,0.4,0]),
  cyl('SPRING',[0.44,0.44,0.86,10],'#e2e8f0',[0,0.79,0]),
  torus('SPRING_COIL_1',[0.46,0.06,4,10],'#94a3b8',[0,0.6,0],{rotation:[PI/2,0,0],vc:false}),
  torus('SPRING_COIL_2',[0.46,0.06,4,10],'#94a3b8',[0,0.82,0],{rotation:[PI/2,0,0],vc:false}),
  torus('SPRING_COIL_3',[0.46,0.06,4,10],'#94a3b8',[0,1.04,0],{rotation:[PI/2,0,0],vc:false}),
  cube('TOP',[1.76,0.28,1.76],'#ef4444',[0,1.36,0],{faceColors:t.pieces[2].faceColors}),
  cube('TOP_STRIPE',[1.8,0.1,0.3],'#f8fafc',[0,1.36,0],{vc:false}),
  pyramid('ARROW',[0.58,0.38],'#fde047',[0,1.7,0],{rotation:[0,0,PI],vc:[0.3,0.8]}),
 ],a));
}
// star_pickup
{
 const a=keepAnims('props/star_pickup.json');
 const piv=[0,1.2,0];const y='#fde047',y2='#facc15',y3='#fbbf24';
 write('props/star_pickup.json',template('star_pickup','Estrella',C,[
  cube('RIG',[0.01,0.01,0.01],'#020617',[0,1.2,0],{pivot:piv,opacity:0,vc:false}),
  cube('CORE',[0.86,0.86,0.26],y,[0,1.2,0],{parent:'RIG',pivot:piv,vc:[0.3,0.8]}),
  pyramid('POINT_TOP',[0.56,0.56],y2,[0,1.9,0],{parent:'RIG',pivot:piv,vc:[0.3,0.8]}),
  pyramid('POINT_BOTTOM',[0.56,0.56],y2,[0,0.5,0],{rotation:[PI,0,0],parent:'RIG',pivot:piv,vc:[0.3,0.8]}),
  pyramid('POINT_LEFT',[0.56,0.56],y2,[-0.7,1.2,0],{rotation:[0,0,PI/2],parent:'RIG',pivot:piv,vc:[0.3,0.8]}),
  pyramid('POINT_RIGHT',[0.56,0.56],y2,[0.7,1.2,0],{rotation:[0,0,-PI/2],parent:'RIG',pivot:piv,vc:[0.3,0.8]}),
  pyramid('POINT_FRONT',[0.56,0.36],y3,[0,1.2,0.3],{rotation:[-PI/2,0,0],parent:'RIG',pivot:piv,vc:[0.3,0.8]}),
  pyramid('POINT_BACK',[0.56,0.36],y3,[0,1.2,-0.3],{rotation:[PI/2,0,0],parent:'RIG',pivot:piv,vc:[0.3,0.8]}),
  pyramid('POINT_TL',[0.4,0.4],y2,[-0.5,1.7,0],{rotation:[0,0,0.785],parent:'RIG',pivot:piv,vc:[0.3,0.8]}),
  pyramid('POINT_TR',[0.4,0.4],y2,[0.5,1.7,0],{rotation:[0,0,-0.785],parent:'RIG',pivot:piv,vc:[0.3,0.8]}),
  pyramid('POINT_BL',[0.4,0.4],y2,[-0.5,0.7,0],{rotation:[0,0,2.356],parent:'RIG',pivot:piv,vc:[0.3,0.8]}),
  pyramid('POINT_BR',[0.4,0.4],y2,[0.5,0.7,0],{rotation:[0,0,-2.356],parent:'RIG',pivot:piv,vc:[0.3,0.8]}),
  cube('EYE_L',[0.12,0.24,0.08],'#1e293b',[-0.18,1.22,0.2],{parent:'RIG',pivot:piv,vc:false}),
  cube('EYE_R',[0.12,0.24,0.08],'#1e293b',[0.18,1.22,0.2],{parent:'RIG',pivot:piv,vc:false}),
  cube('EYE_SHINE_L',[0.05,0.07,0.03],'#f8fafc',[-0.16,1.3,0.25],{parent:'RIG',pivot:piv,vc:false}),
  cube('EYE_SHINE_R',[0.05,0.07,0.03],'#f8fafc',[0.2,1.3,0.25],{parent:'RIG',pivot:piv,vc:false}),
 ],a));
}
// sword
{
 const steel='#c0c0c0',gold='#ffcc00';
 write('props/sword.json',template('sword','Espada',C,[
  tbox('BLADE',{wb:0.3,db:0.06,wt:0.22,dt:0.05,h:2.6},steel,[0,2.3,0],{vc:[0.2,0.75]}),
  pyramid('BLADE_TIP',[0.22,0.5],steel,[0,3.85,0],{scale:[1,1,0.22],vc:[0.2,0.75]}),
  cube('FULLER',[0.06,2.2,0.07],shade(steel,0.75),[0,2.2,0],{vc:false}),
  cube('GUARD',[0.9,0.2,0.18],gold,[0,0.95,0],{vc:[0.3,0.8]}),
  sphere('GUARD_END_L',[0.1,5,4],gold,[-0.48,0.95,0],{vc:[0.3,0.8]}),
  sphere('GUARD_END_R',[0.1,5,4],gold,[0.48,0.95,0],{vc:[0.3,0.8]}),
  cyl('HANDLE',[0.11,0.12,0.75,6],'#8b4513',[0,0.45,0]),
  torus('HANDLE_WRAP_1',[0.12,0.025,4,6],'#5c2e0e',[0,0.6,0],{rotation:[PI/2,0,0],vc:false}),
  torus('HANDLE_WRAP_2',[0.12,0.025,4,6],'#5c2e0e',[0,0.35,0],{rotation:[PI/2,0,0],vc:false}),
  sphere('POMMEL',[0.16,6,4],'#ff0000',[0,0.0,0],{vc:[0.3,0.8]}),
  cyl('POMMEL_CAP',[0.1,0.14,0.08,6],gold,[0,0.1,0],{vc:[0.3,0.8]}),
 ]));
}
// torch
{
 const a=keepAnims('props/torch.json');
 write('props/torch.json',template('torch','Antorcha',C,[
  loft('HANDLE',{sides:6,sections:[{y:-1.1,radiusX:0.15,radiusZ:0.15},{y:0.2,radiusX:0.11,radiusZ:0.11},{y:1.1,radiusX:0.12,radiusZ:0.12}]},'#8b5a2b',[0,1.1,0]),
  cube('WRAP',[0.26,0.46,0.26],'#1f2937',[0,0.55,0],{rotation:[0,0.785,0]}),
  cube('WRAP_BAND',[0.3,0.08,0.3],'#374151',[0,0.8,0],{rotation:[0,0.785,0],vc:false}),
  cone('CUP',[0.28,0.45,8],'#4b5563',[0,2.22,0],{rotation:[PI,0,0]}),
  torus('CUP_RIM',[0.27,0.04,4,8],'#6b7280',[0,2.42,0],{rotation:[PI/2,0,0],vc:false}),
  cyl('COAL',[0.2,0.2,0.1,8],'#1f2937',[0,2.44,0]),
  cone('FLAME_OUTER',[0.34,0.9,8],'#f97316',[0,2.58,0],{opacity:0.85,vc:[0.25,0.85]}),
  cone('FLAME_INNER',[0.18,0.55,8],'#fde68a',[0,2.63,0],{opacity:0.92,vc:[0.1,0.9]}),
  sphere('EMBER',[0.08,6,5],'#fff7ed',[0,2.95,0],{opacity:0.78,vc:false}),
 ],a));
}
// treasure_pile
{
 const a=keepAnims('props/treasure_pile.json'); const t=read('props/treasure_pile.json');
 const coins=[];const n=6;for(let i=0;i<n;i++){const ang=i/n*PI*2+0.3;coins.push(cyl(`COIN_${i+1}`,[0.16,0.16,0.05,8],'#fde047',[Math.cos(ang)*1.05,0.46,Math.sin(ang)*0.95],{rotation:[(i%2)*0.4,ang,0],vc:[0.3,0.8]}));}
 write('props/treasure_pile.json',template('treasure_pile','Monton Tesoro',C,[
  lathe('PILE',{points:[[0,-0.21],[1.18,-0.21],[1.1,0.05],[0.96,0.21],[0,0.21]],segments:12},'#eab308',[0,0.22,0],{vc:[0.3,0.8]}),
  cyl('STACK_A',[0.32,0.32,0.28,10],'#facc15',[-0.38,0.56,0.18],{vc:[0.3,0.8]}),
  cyl('STACK_B',[0.28,0.28,0.22,10],'#facc15',[0.42,0.52,-0.08],{vc:[0.3,0.8]}),
  cyl('STACK_C',[0.24,0.24,0.18,10],'#fbbf24',[-0.1,0.5,-0.42],{vc:[0.3,0.8]}),
  ...coins,
  pyramid('GEM_RED',[0.36,0.46],'#ef4444',[0.06,0.62,0.38],{vc:[0.35,0.7]}),
  pyramid('GEM_BLUE',[0.32,0.42],'#3b82f6',[-0.54,0.58,-0.12],{vc:[0.35,0.7]}),
  pyramid('GEM_GREEN',[0.34,0.44],'#22c55e',[0.56,0.58,0.24],{vc:[0.35,0.7]}),
  sphere('PEARL',[0.14,6,5],'#f8fafc',[0.28,0.56,-0.34],{vc:[0.1,0.9]}),
  cube('GOBLET',[0.14,0.3,0.14],'#fde047',[0.62,0.56,-0.55],{vc:[0.3,0.8]}),
  cyl('GOBLET_CUP',[0.14,0.08,0.18,6],'#fde047',[0.62,0.78,-0.55],{vc:[0.3,0.8]}),
  cube('CROWN_BASE',[0.4,0.14,0.4],'#fbbf24',[-0.42,0.78,0.12],{vc:[0.3,0.8]}),
  pyramid('CROWN_SPIKE',[0.16,0.18],'#fbbf24',[-0.42,0.94,0.12],{vc:[0.3,0.8]}),
  sphere('SPARKLE',[0.08,6,5],'#fff7ed',[0.02,1.02,0.02],{opacity:0.82,vc:false}),
 ],a));
}

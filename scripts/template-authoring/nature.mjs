import {cube,cyl,sphere,cone,pyramid,wedge,tbox,torus,capsule,lathe,loft,vc,shade,tint,read,write,template,anim,track,kf,PI} from './lib.mjs';
const C='Naturaleza';

// ---------- bush ----------
{
 const g1='#2e8b2e',g2='#228b22',g3='#3cb371',g4='#3a9d3a',bark='#5b3a1e';
 write('nature/bush.json',template('bush','Arbusto',C,[
  cyl('STEM',[0.12,0.16,0.5,6],bark,[0,0.22,0]),
  sphere('BUSH_1',[1,6,5],g1,[0,0.95,0],{scale:[1.15,1,1.05]}),
  sphere('BUSH_2',[0.7,6,5],g2,[0.85,0.62,0.3]),
  sphere('BUSH_3',[0.6,6,5],g3,[-0.65,0.55,0.55]),
  sphere('BUSH_4',[0.55,6,4],g4,[-0.35,0.62,-0.7]),
  sphere('BUSH_5',[0.5,6,4],g3,[0.45,1.45,-0.15]),
  sphere('BERRY_1',[0.09,5,4],'#ef4444',[0.55,1.3,0.75],{vc:[0.25,0.75]}),
  sphere('BERRY_2',[0.09,5,4],'#ef4444',[-0.9,0.95,0.3],{vc:[0.25,0.75]}),
  sphere('BERRY_3',[0.09,5,4],'#ef4444',[0.1,1.75,0.4],{vc:[0.25,0.75]}),
 ]));
}
// ---------- cactus ----------
{
 const g='#16a34a',g2='#22c55e',pot='#a16207',soil='#4b2e16';
 write('nature/cactus.json',template('cactus','Cactus',C,[
  tbox('POT',{wb:1.5,wt:1.68,h:0.54},pot,[0,0.27,0]),
  cube('POT_RIM',[1.84,0.14,1.84],tint(pot,0.1),[0,0.6,0]),
  cube('SOIL',[1.5,0.06,1.5],soil,[0,0.69,0]),
  loft('TRUNK',{sides:8,sections:[{y:-1.8,radiusX:0.56,radiusZ:0.56},{y:0.2,radiusX:0.62,radiusZ:0.62},{y:1.8,radiusX:0.42,radiusZ:0.42}]},g,[0,2.5,0]),
  cyl('ARM_L',[0.24,0.3,1.6,8],g2,[-0.86,2.78,0],{rotation:[0,0,1.04],pivot:[-0.4,2.3,0]}),
  cyl('ARM_L_TIP',[0.2,0.24,0.9,8],g2,[-1.5,3.6,0],{pivot:[-1.5,3.15,0]}),
  cyl('ARM_R',[0.24,0.3,1.42,8],g2,[0.78,2.28,0],{rotation:[0,0,-1],pivot:[0.4,1.9,0]}),
  cyl('ARM_R_TIP',[0.2,0.24,1.1,8],g2,[1.36,3.05,0],{pivot:[1.36,2.5,0]}),
  sphere('FLOWER',[0.2,6,5],'#f472b6',[0,4.38,0],{vc:[0.3,0.8]}),
  sphere('FLOWER_CENTER',[0.09,5,4],'#fde047',[0,4.5,0],{vc:[0.2,0.9]}),
  cyl('SPINES_1',[0.02,0.02,0.5,3],'#f5f5dc',[0.5,3.2,0.3],{rotation:[0,0,-1.1],vc:false}),
  cyl('SPINES_2',[0.02,0.02,0.5,3],'#f5f5dc',[-0.45,2.1,-0.35],{rotation:[0,0,1.2],vc:false}),
  cyl('SPINES_3',[0.02,0.02,0.5,3],'#f5f5dc',[0.1,1.6,0.55],{rotation:[1.1,0,0],vc:false}),
 ]));
}
// ---------- cave_entrance_cliff (budget fix) ----------
{
 const rock='#b4bcc8',rock2='#a7b0bc',rock3='#9aa3b0',grass='#5f8d4e',dirt='#8b6b4a',moss='#5a8a44';
 write('nature/cave_entrance_cliff.json',template('cave_entrance_cliff','Entrada Cueva Acantilado',C,[
  cube('GROUND',[7.2,0.18,6.4],grass,[0,0.09,0.45]),
  cube('PATH_OUTER',[2.4,0.06,2.6],dirt,[0,0.2,1.9]),
  cube('PATH_INNER',[1.5,0.05,1.4],tint(dirt,0.15),[0,0.24,0.9]),
  tbox('CLIFF_CORE',{wb:4.4,db:2.6,wt:3.4,dt:1.8,h:3.4,oz:-0.3},rock,[0,1.88,-0.9]),
  tbox('CLIFF_SHOULDER_L',{wb:2.2,db:2.4,wt:1.4,dt:1.6,h:3.6,ox:0.2,oz:-0.3},rock2,[-2.5,1.98,-0.3]),
  tbox('CLIFF_SHOULDER_R',{wb:2.2,db:2.4,wt:1.4,dt:1.6,h:3.5,ox:-0.2,oz:-0.3},rock2,[2.5,1.93,-0.3]),
  tbox('CLIFF_CROWN',{wb:3.6,db:2.2,wt:2.2,dt:1.2,h:1.3,oz:-0.2},tint(rock,0.06),[0,4.2,-1.1]),
  tbox('CLIFF_LOWER_L',{wb:2.4,db:2.2,wt:1.6,dt:1.4,h:1.6},rock3,[-2.6,0.98,1.1]),
  tbox('CLIFF_LOWER_R',{wb:2.3,db:2.1,wt:1.5,dt:1.3,h:1.6},rock3,[2.5,0.98,1.0]),
  // mouth: a dark cube recess with a stepped arch of rock lintels
  cube('OPENING_SHADOW',[2.4,2.1,0.16],'#0f172a',[0,1.25,0.5],{vc:false}),
  cube('OPENING_INNER',[1.8,1.7,2.0],'#020617',[0,1.1,-0.5],{vc:false}),
  cube('OPENING_FLOOR',[2.4,0.1,1.2],'#4b3b2d',[0,0.26,0.9]),
  cube('ARCH_RIM',[3.4,0.5,0.9],tint(rock,0.1),[0,2.55,0.85]),
  cube('ARCH_POST_L',[0.5,2.2,0.8],tint(rock,0.1),[-1.45,1.3,0.85]),
  cube('ARCH_POST_R',[0.5,2.2,0.8],tint(rock,0.1),[1.45,1.3,0.85]),
  cone('STALACTITE_L',[0.16,0.54,5],'#4b5563',[-0.58,2.1,0.9],{rotation:[PI,0,0]}),
  cone('STALACTITE_R',[0.16,0.6,5],'#4b5563',[0.52,2.05,0.8],{rotation:[PI,0,0]}),
  cone('STALACTITE_C',[0.12,0.4,5],'#4b5563',[0,2.2,1.1],{rotation:[PI,0,0]}),
  sphere('BOULDER_L',[0.8,6,4],'#6b7280',[-2.42,0.44,1.9],{scale:[1.3,0.72,1.1]}),
  sphere('BOULDER_R',[0.76,6,4],'#6b7280',[2.34,0.42,1.75],{scale:[1.18,0.7,1.04]}),
  cube('MOSS_L',[1.6,0.14,1.1],moss,[-1.2,4.9,-1.1]),
  cube('MOSS_R',[1.2,0.14,0.9],moss,[1.7,3.75,0.5]),
  cube('MOSS_FRONT',[0.9,0.6,0.1],moss,[-1.5,2.4,1.42]),
 ]));
}
// ---------- crystal_cluster ----------
{
 const t=read('nature/crystal_cluster.json');
 const base='#475569';
 write('nature/crystal_cluster.json',template('crystal_cluster','Cluster Cristal',C,[
  tbox('BASE',{wb:2.4,db:2.2,wt:1.9,dt:1.7,h:0.42},base,[0,0.21,0]),
  sphere('BASE_ROCK_L',[0.42,5,4],tint(base,0.08),[-1.0,0.42,0.4],{scale:[1.3,0.7,1]}),
  sphere('BASE_ROCK_R',[0.36,5,4],shade(base,0.9),[0.95,0.4,-0.5],{scale:[1.2,0.65,1]}),
  pyramid('CRYSTAL_A',[0.82,1.7],'#38bdf8',[-0.42,1.26,0.08],{opacity:0.84,rotation:[0,0.2,0.08],vc:[0.35,0.7]}),
  pyramid('CRYSTAL_B',[0.72,1.36],'#7dd3fc',[0.42,1.08,-0.2],{opacity:0.8,rotation:[0.1,0.4,-0.12],vc:[0.35,0.7]}),
  pyramid('CRYSTAL_C',[0.58,1.08],'#67e8f9',[0.08,0.92,0.56],{opacity:0.78,rotation:[-0.12,-0.28,0.1],vc:[0.35,0.7]}),
  pyramid('CRYSTAL_D',[0.44,0.8],'#a5f3fc',[-0.9,0.78,-0.35],{opacity:0.8,rotation:[0.18,0.6,0.35],vc:[0.35,0.7]}),
  pyramid('CRYSTAL_E',[0.4,0.7],'#38bdf8',[0.85,0.72,0.55],{opacity:0.8,rotation:[-0.2,-0.5,-0.3],vc:[0.35,0.7]}),
  sphere('GLOW',[0.42,8,6],'#e0f2fe',[0,0.88,0.12],{scale:[1.2,0.7,1.2],opacity:0.7,vc:false}),
 ],{animations:t.animations}));
}
// ---------- flower ----------
{
 const pink='#ff69b4',stem='#228b22',leaf='#2f9e3f';
 const petals=[];
 for(let i=0;i<5;i++){const a=i/5*Math.PI*2;petals.push(sphere(`PETAL_${i+1}`,[0.3,6,4],pink,[Math.cos(a)*0.28,1.62,Math.sin(a)*0.28],{scale:[1,0.7,1]}));}
 write('nature/flower.json',template('flower','Flor',C,[
  cyl('STEM',[0.08,0.1,1.5,6],stem,[0,0.75,0]),
  ...petals,
  sphere('CENTER',[0.2,6,4],'#ffcc00',[0,1.68,0],{vc:[0.2,0.85]}),
  wedge('LEAF_L',[0.7,0.1,0.32],leaf,[-0.42,0.62,0.05],{rotation:[0,0,0.55],pivot:[-0.05,0.6,0.05]}),
  wedge('LEAF_R',[0.6,0.1,0.28],leaf,[0.36,0.42,-0.08],{rotation:[0,0.4,-0.5],pivot:[0.05,0.4,-0.08]}),
 ]));
}
// ---------- giant_mushroom ----------
{
 const stem='#f3e8d1',cap='#ef4444',spot='#f8fafc';
 write('nature/giant_mushroom.json',template('giant_mushroom','Seta Gigante',C,[
  loft('STEM',{sides:10,sections:[{y:-1.4,radiusX:0.95,radiusZ:0.95},{y:-0.4,radiusX:0.72,radiusZ:0.72},{y:0.9,radiusX:0.74,radiusZ:0.74},{y:1.4,radiusX:0.95,radiusZ:0.95}]},stem,[0,1.4,0]),
  cyl('GILLS',[1.9,1.5,0.36,12],'#d9c7a6',[0,2.82,0]),
  sphere('CAP',[1.9,12,8],cap,[0,3.3,0],{scale:[1.22,0.7,1.22],faceColors:['#f87171','#b91c1c','#ef4444','#f87171','#b91c1c','#ef4444'],vc:[0.12,0.78]}),
  sphere('SPOT_1',[0.34,6,4],spot,[0,3.98,1.02],{scale:[1.4,0.36,1.4],vc:[0.05,0.9]}),
  sphere('SPOT_2',[0.28,6,4],spot,[-0.92,3.72,0.22],{scale:[1.5,0.34,1.4],vc:[0.05,0.9]}),
  sphere('SPOT_3',[0.28,6,4],spot,[0.9,3.74,-0.24],{scale:[1.36,0.32,1.36],vc:[0.05,0.9]}),
  sphere('SPOT_4',[0.22,6,4],spot,[0.22,4.08,-0.92],{scale:[1.28,0.32,1.28],vc:[0.05,0.9]}),
  sphere('SPOT_5',[0.18,6,4],spot,[-0.5,4.3,-0.4],{scale:[1.3,0.3,1.3],vc:[0.05,0.9]}),
  sphere('GRASS_TUFT',[0.5,6,4],'#4d7c0f',[0.9,0.12,0.6],{scale:[1.4,0.3,1.1]}),
 ]));
}
// ---------- log ----------
{
 const bark='#7c4a28',cut='#d6b37a';
 write('nature/log.json',template('log','Tronco',C,[
  cyl('BODY',[0.42,0.48,3.4,10],bark,[0,0.46,0],{rotation:[0,0,PI/2]}),
  cyl('CUT_L',[0.4,0.4,0.08,10],cut,[-1.72,0.46,0],{rotation:[0,0,PI/2]}),
  cyl('RING_L',[0.24,0.24,0.1,8],shade(cut,0.85),[-1.73,0.46,0],{rotation:[0,0,PI/2]}),
  cyl('CORE_L',[0.09,0.09,0.12,6],shade(cut,0.7),[-1.74,0.46,0],{rotation:[0,0,PI/2]}),
  cyl('CUT_R',[0.44,0.44,0.08,10],shade(cut,0.94),[1.72,0.46,0],{rotation:[0,0,PI/2]}),
  cyl('RING_R',[0.26,0.26,0.1,8],shade(cut,0.8),[1.73,0.46,0],{rotation:[0,0,PI/2]}),
  cyl('BRANCH_STUB',[0.14,0.18,0.7,8],shade(bark,0.85),[-0.3,0.86,0.36],{rotation:[0.52,0,-0.8]}),
  cyl('BRANCH_STUB_2',[0.1,0.14,0.5,6],shade(bark,0.85),[0.9,0.78,-0.3],{rotation:[-0.7,0,0.4]}),
  cube('MOSS_PATCH',[1.1,0.12,0.42],'#4d7c0f',[0.42,0.86,0.04],{rotation:[0,0,0.08]}),
  cube('MOSS_PATCH_2',[0.5,0.1,0.3],'#5b8f2a',[-0.9,0.84,-0.1],{rotation:[0,0.3,-0.06]}),
  cube('BARK_CRACK',[1.4,0.05,0.06],shade(bark,0.6),[0.1,0.36,0.47],{rotation:[0,0,0.05],vc:false}),
 ]));
}
// ---------- mushroom ----------
{
 write('nature/mushroom.json',template('mushroom','Seta',C,[
  loft('STEM',{sides:6,sections:[{y:-0.6,radiusX:0.32,radiusZ:0.32},{y:0.1,radiusX:0.22,radiusZ:0.22},{y:0.6,radiusX:0.26,radiusZ:0.26}]},'#fffacd',[0,0.6,0]),
  cyl('GILLS',[0.78,0.5,0.14,8],'#e6d9a8',[0,1.16,0]),
  sphere('CAP',[0.8,8,4],'#ff0000',[0,1.3,0],{scale:[1,0.55,1]}),
  sphere('SPOT_1',[0.16,5,4],'#fff5f5',[0.3,1.62,0.42],{scale:[1.2,0.4,1.2],vc:[0.05,0.9]}),
  sphere('SPOT_2',[0.13,5,4],'#fff5f5',[-0.42,1.58,-0.1],{scale:[1.2,0.4,1.2],vc:[0.05,0.9]}),
  sphere('SPOT_3',[0.11,5,4],'#fff5f5',[0.05,1.74,-0.4],{scale:[1.2,0.4,1.2],vc:[0.05,0.9]}),
  sphere('GRASS_TUFT',[0.3,5,4],'#4d7c0f',[0.45,0.08,0.25],{scale:[1.5,0.35,1.1]}),
 ]));
}
// ---------- palm_tree ----------
{
 const t=read('nature/palm_tree.json');
 const bark='#8b5a2b',bark2='#9b6a34',leafA='#22c55e',leafB='#16a34a';
 const top=[0.3,4,0.1];
 const leaf=(name,color,yaw,len=2.7,droop=0.32)=>tbox(name,{wb:0.5,db:0.1,wt:0.08,dt:0.06,h:len},color,[top[0]+Math.sin(yaw)*len/2,top[1]+0.02,top[2]+Math.cos(yaw)*len/2],{rotation:[PI/2-droop*0,0,0],pivot:top});
 // Build leaves as tapered boxes lying flat: height axis is Y, so rotate 90deg around X then yaw around Y
 const leaves=[];
 const defs=[['LEAF_N',leafA,0,0.18],['LEAF_NE',leafB,PI/4,0.26],['LEAF_E',leafA,PI/2,0.22],['LEAF_SE',leafB,3*PI/4,0.3],['LEAF_S',leafB,PI,0.2],['LEAF_SW',leafA,5*PI/4,0.28],['LEAF_W',leafB,3*PI/2,0.24],['LEAF_NW',leafA,7*PI/4,0.26]];
 const leafPos=(yaw,droop,len)=>{const d=[-Math.cos(droop)*Math.cos(yaw),-Math.sin(droop),Math.cos(droop)*Math.sin(yaw)];return [top[0]+d[0]*len/2,top[1]+d[1]*len/2,top[2]+d[2]*len/2];};
 for(const [name,color,yaw,droop] of defs){
   const len=2.6;
   leaves.push(tbox(name,{wb:0.1,db:0.5,wt:0.05,dt:0.06,h:len},color,leafPos(yaw,droop,len),{rotation:[0,yaw,PI/2+droop],pivot:top}));
 }
 write('nature/palm_tree.json',template('palm_tree','Palmera',C,[
  loft('TRUNK_LOW',{sides:8,sections:[{y:-1.1,radiusX:0.6,radiusZ:0.6},{y:-0.6,radiusX:0.46,radiusZ:0.46},{y:1.1,radiusX:0.42,radiusZ:0.42,offsetX:0.1}]},bark,[0,1.1,0]),
  loft('TRUNK_TOP',{sides:8,sections:[{y:-1,radiusX:0.42,radiusZ:0.42},{y:0.3,radiusX:0.34,radiusZ:0.34,offsetX:0.12},{y:1,radiusX:0.3,radiusZ:0.3,offsetX:0.2}]},bark2,[0.1,3,0]),
  cyl('TRUNK_RING_1',[0.52,0.5,0.14,8],shade(bark,0.8),[0.0,1.55,0]),
  cyl('TRUNK_RING_2',[0.46,0.44,0.14,8],shade(bark,0.8),[0.12,2.45,0]),
  cyl('TRUNK_RING_3',[0.4,0.38,0.14,8],shade(bark2,0.8),[0.22,3.4,0]),
  sphere('CROWN',[0.42,6,4],shade(bark2,0.9),[0.3,3.98,0.1]),
  ...leaves,
  sphere('COCO_1',[0.18,6,5],'#7c4a28',[0.08,3.72,0.3]),
  sphere('COCO_2',[0.18,6,5],'#6b4423',[0.52,3.7,0.08]),
  sphere('COCO_3',[0.18,6,5],'#7c4a28',[0.26,3.66,-0.22]),
 ],{animations:[anim('idle',3.2,true,[
   track('LEAF_N','rotation',[kf(0,[0,0,PI/2+0.18]),kf(1.6,[0,0,PI/2+0.3]),kf(3.2,[0,0,PI/2+0.18])]),
   track('LEAF_S','rotation',[kf(0,[0,PI,PI/2+0.2]),kf(1.6,[0,PI,PI/2+0.32]),kf(3.2,[0,PI,PI/2+0.2])]),
   track('LEAF_E','rotation',[kf(0,[0,PI/2,PI/2+0.22]),kf(1.3,[0,PI/2,PI/2+0.34]),kf(3.2,[0,PI/2,PI/2+0.22])]),
   track('LEAF_W','rotation',[kf(0,[0,3*PI/2,PI/2+0.24]),kf(1.9,[0,3*PI/2,PI/2+0.36]),kf(3.2,[0,3*PI/2,PI/2+0.24])]),
 ])]}));
}
// ---------- river segments ----------
{
 const grass='#5f8d4e',water='#38bdf8',water2='#22c3ee',bank='#8b6b4a',foam='#f8fafc',rock='#7c8590',reed='#3f7c35';
 const pebble=(n,pos,r=0.16)=>sphere(n,[r,5,4],shade(rock,0.9),pos,{scale:[1.3,0.6,1]});
 write('nature/river_segment_straight.json',template('river_segment_straight','Segmento Rio Recto',C,[
  cube('GROUND',[6,0.14,6],grass,[0,0.07,0]),
  cube('BED',[2.6,0.06,6],shade(bank,0.7),[0,0.12,0]),
  cube('WATER',[2.2,0.08,6],water,[0,0.15,0],{opacity:0.62,vc:[0.2,0.85]}),
  cube('BANK_LIP_L',[0.26,0.2,6],bank,[-1.28,0.16,0]),
  cube('BANK_LIP_R',[0.26,0.2,6],bank,[1.28,0.16,0]),
  cube('FOAM_L',[0.1,0.02,6],foam,[-1.02,0.2,0],{opacity:0.4,vc:false}),
  cube('FOAM_R',[0.1,0.02,6],foam,[1.02,0.2,0],{opacity:0.4,vc:false}),
  cube('RIPPLE_1',[0.5,0.02,0.1],foam,[-0.3,0.2,-1.6],{opacity:0.35,vc:false}),
  cube('RIPPLE_2',[0.4,0.02,0.1],foam,[0.35,0.2,0.9],{opacity:0.35,vc:false}),
  sphere('ROCK_L',[0.42,6,4],rock,[-2.1,0.28,-1.6],{scale:[1.3,0.6,1.1]}),
  sphere('ROCK_R',[0.38,6,4],rock,[2,0.26,1.5],{scale:[1.15,0.58,1]}),
  pebble('PEBBLE_1',[0.6,0.18,-2.2]),pebble('PEBBLE_2',[-0.5,0.18,2.3],0.14),
  cone('REED_1',[0.2,0.8,5],reed,[-1.75,0.5,2.2]),cone('REED_2',[0.16,0.65,5],reed,[-1.95,0.42,2.5]),
  cone('REED_3',[0.18,0.7,5],reed,[1.8,0.45,-2.3]),
 ]));
 write('nature/river_segment_corner.json',template('river_segment_corner','Segmento Rio Curva',C,[
  cube('GROUND',[6,0.14,6],grass,[0,0.07,0]),
  cube('BED_S',[2.6,0.06,3.3],shade(bank,0.7),[0,0.12,1.35]),
  cube('BED_E',[3.3,0.06,2.6],shade(bank,0.7),[1.35,0.12,0]),
  cube('WATER_S',[2.2,0.08,3.1],water,[0,0.15,1.45],{opacity:0.62,vc:[0.2,0.85]}),
  cube('WATER_E',[3.1,0.08,2.2],water,[1.45,0.15,0],{opacity:0.62,vc:[0.2,0.85]}),
  cube('WATER_POOL',[2.2,0.08,2.2],water2,[1.45,0.15,1.45],{opacity:0.66,vc:[0.2,0.85]}),
  cube('BANK_S_W',[0.26,0.2,3.3],bank,[-1.28,0.16,1.35]),
  cube('BANK_E_N',[3.3,0.2,0.26],bank,[1.35,0.16,-1.28]),
  cube('BANK_INNER_S',[0.26,0.2,1.8],bank,[1.28,0.16,-0.9]),
  cube('BANK_INNER_E',[1.8,0.2,0.26],bank,[-0.9,0.16,-1.28]),
  cube('FOAM_S',[0.1,0.02,3.1],foam,[-1.02,0.2,1.45],{opacity:0.4,vc:false}),
  cube('FOAM_E',[3.1,0.02,0.1],foam,[1.45,0.2,-1.02],{opacity:0.4,vc:false}),
  sphere('ROCK_CORNER',[0.44,6,4],rock,[-2,0.28,2],{scale:[1.2,0.65,1.05]}),
  sphere('ROCK_INNER',[0.34,6,4],rock,[-1.9,0.24,-1.9],{scale:[1.2,0.6,1]}),
  cone('REED_PATCH',[0.28,0.8,5],reed,[2.05,0.5,2.1]),
  cone('REED_2',[0.2,0.65,5],reed,[2.35,0.42,1.8]),
  pebble('PEBBLE_1',[-0.4,0.18,-0.4]),
 ]));
 write('nature/river_segment_t_junction.json',template('river_segment_t_junction','Segmento Rio T',C,[
  cube('GROUND',[6,0.14,6],grass,[0,0.07,0]),
  cube('BED_MAIN',[2.6,0.06,6],shade(bank,0.7),[0,0.12,0]),
  cube('BED_BRANCH',[3.3,0.06,2.6],shade(bank,0.7),[1.35,0.12,0]),
  cube('WATER_MAIN',[2.2,0.08,6],water,[0,0.15,0],{opacity:0.62,vc:[0.2,0.85]}),
  cube('WATER_BRANCH',[3.1,0.08,2.2],water2,[1.45,0.15,0],{opacity:0.66,vc:[0.2,0.85]}),
  cube('BANK_LIP_L',[0.26,0.2,6],bank,[-1.28,0.16,0]),
  cube('BANK_LIP_R_N',[0.26,0.2,1.8],bank,[1.28,0.16,-2.1]),
  cube('BANK_LIP_R_S',[0.26,0.2,1.8],bank,[1.28,0.16,2.1]),
  cube('BANK_BRANCH_N',[1.8,0.2,0.26],bank,[2.1,0.16,-1.28]),
  cube('BANK_BRANCH_S',[1.8,0.2,0.26],bank,[2.1,0.16,1.28]),
  cube('FOAM_L',[0.1,0.02,6],foam,[-1.02,0.2,0],{opacity:0.4,vc:false}),
  cube('FOAM_BRANCH',[3.1,0.02,0.1],foam,[1.45,0.2,-1.02],{opacity:0.4,vc:false}),
  sphere('ROCK_1',[0.38,6,4],rock,[-2,0.26,-1.8],{scale:[1.2,0.6,1]}),
  sphere('ROCK_2',[0.34,6,4],rock,[2.15,0.25,1.75],{scale:[1.1,0.58,1]}),
  cone('REED_1',[0.2,0.7,5],reed,[-2.2,0.45,1.9]),cone('REED_2',[0.16,0.6,5],reed,[-1.95,0.4,2.2]),
  pebble('PEBBLE_1',[2.3,0.18,-2.0]),
 ]));
}
// ---------- rock ----------
{
 const g='#808080';
 write('nature/rock.json',template('rock','Roca',C,[
  sphere('ROCK',[1.2,5,4],g,[0,0.72,0],{scale:[1.3,0.78,1.1],rotation:[0,0.3,0]}),
  sphere('ROCK_CHUNK_L',[0.62,5,4],shade(g,0.92),[-1.25,0.42,0.45],{scale:[1.2,0.7,1],rotation:[0,-0.4,0]}),
  sphere('ROCK_CHUNK_R',[0.5,5,4],tint(g,0.06),[1.1,0.36,-0.55],{scale:[1.25,0.72,1],rotation:[0,0.6,0]}),
  pyramid('ROCK_FACET',[0.7,0.6],tint(g,0.1),[0.35,1.35,0.3],{rotation:[0.1,0.5,-0.15]}),
  sphere('MOSS',[0.3,5,4],'#4d7c0f',[-0.4,1.3,0.5],{scale:[1.6,0.3,1.2]}),
  sphere('PEBBLE',[0.14,5,4],shade(g,0.85),[0.9,0.1,0.95],{scale:[1.3,0.6,1]}),
 ]));
}
// ---------- stump ----------
{
 const bark='#7c4a28',dark='#5b3418',cut='#d6b37a';
 write('nature/stump.json',template('stump','Tocon',C,[
  loft('BASE',{sides:10,sections:[{y:-0.6,radiusX:0.95,radiusZ:0.95},{y:-0.2,radiusX:0.76,radiusZ:0.76},{y:0.6,radiusX:0.74,radiusZ:0.74}]},bark,[0,0.6,0]),
  cyl('TOP_RING',[0.76,0.76,0.08,10],cut,[0,1.22,0]),
  cyl('INNER_RING',[0.48,0.48,0.09,10],shade(cut,0.88),[0,1.23,0]),
  cyl('CORE_RING',[0.22,0.22,0.1,8],shade(cut,0.72),[0,1.24,0]),
  tbox('ROOT_L',{wb:0.36,db:0.9,wt:0.24,dt:0.6,h:0.26},dark,[-0.72,0.13,0.18],{rotation:[0,0.42,-0.12]}),
  tbox('ROOT_R',{wb:0.36,db:0.9,wt:0.24,dt:0.6,h:0.26},dark,[0.7,0.13,-0.1],{rotation:[0,-0.5,0.12]}),
  tbox('ROOT_B',{wb:0.34,db:0.8,wt:0.22,dt:0.5,h:0.24},dark,[0.05,0.12,-0.78],{rotation:[0.1,1.4,0]}),
  cube('BARK_CRACK',[0.07,0.7,0.1],shade(bark,0.55),[0.42,0.62,0.66],{rotation:[0,-0.6,0.05],vc:false}),
  sphere('MOSS',[0.2,6,4],'#4d7c0f',[0.26,1.0,0.5],{scale:[1.3,0.45,1]}),
  sphere('MOSS_2',[0.16,5,4],'#5b8f2a',[-0.55,0.9,-0.3],{scale:[1.4,0.4,1]}),
  cone('SPROUT',[0.09,0.36,4],'#4ade80',[-0.3,1.4,0.12]),
 ]));
}
// ---------- tree ----------
{
 const bark='#8b4513',g1='#228b22',g2='#2e8b2e',g3='#3a9d3a';
 write('nature/tree.json',template('tree','Arbol',C,[
  loft('TRUNK',{sides:7,sections:[{y:-1.5,radiusX:0.62,radiusZ:0.62},{y:-1.0,radiusX:0.42,radiusZ:0.42},{y:1.5,radiusX:0.3,radiusZ:0.3}]},bark,[0,1.5,0]),
  tbox('ROOT_1',{wb:0.3,db:0.7,wt:0.2,dt:0.45,h:0.24},shade(bark,0.85),[0.55,0.12,0.25],{rotation:[0,-0.5,0.1]}),
  tbox('ROOT_2',{wb:0.3,db:0.7,wt:0.2,dt:0.45,h:0.24},shade(bark,0.85),[-0.5,0.12,-0.3],{rotation:[0,0.9,-0.1]}),
  cyl('BRANCH_STUB',[0.08,0.12,0.6,5],shade(bark,0.9),[0.32,2.4,0.1],{rotation:[0,0,-0.9]}),
  cone('CANOPY_BOT',[2.1,2.6,8],g1,[0,3.3,0]),
  cone('CANOPY_MID',[1.7,2.4,8],g2,[0.05,4.5,0.05],{rotation:[0,0.4,0]}),
  cone('CANOPY_TOP',[1.2,2.2,8],g3,[0,5.7,0],{rotation:[0,0.2,0]}),
  cone('CANOPY_TIP',[0.55,1.1,6],'#48b048',[0,6.9,0]),
 ]));
}
// ---------- waterfall_cliff (budget fix) ----------
{
 const t=read('nature/waterfall_cliff.json');
 const rock='#b4bcc8',rock2='#a7b0bc',rock3='#9aa3b0',grass='#5f8d4e',water='#38bdf8',foam='#f8fafc',moss='#5b8f43';
 write('nature/waterfall_cliff.json',template('waterfall_cliff','Cascada Acantilado',C,[
  cube('GROUND',[6.6,0.18,6.2],grass,[0,0.09,0.24]),
  tbox('CLIFF_CORE',{wb:4.6,db:2.8,wt:3.6,dt:2.0,h:3.6,oz:-0.3},rock,[0,1.98,-1.0]),
  tbox('CLIFF_SIDE_L',{wb:2.2,db:2.4,wt:1.5,dt:1.7,h:3.8,ox:0.2,oz:-0.3},rock2,[-2.55,2.08,-0.6]),
  tbox('CLIFF_SIDE_R',{wb:2.2,db:2.4,wt:1.5,dt:1.7,h:3.7,ox:-0.2,oz:-0.3},rock2,[2.55,2.03,-0.6]),
  tbox('CLIFF_CROWN',{wb:3.8,db:2.4,wt:2.6,dt:1.4,h:1.2,oz:-0.3},tint(rock,0.06),[0,4.3,-1.3]),
  tbox('CLIFF_LEDGE_L',{wb:2.2,db:2.0,wt:1.5,dt:1.3,h:1.5},rock3,[-2.0,0.93,1.05]),
  tbox('CLIFF_LEDGE_R',{wb:2.1,db:1.9,wt:1.4,dt:1.2,h:1.5},rock3,[2.0,0.93,0.95]),
  cube('RIVER_POOL_TOP',[2.6,0.1,1.6],water,[0,4.9,-2.0],{opacity:0.72,vc:[0.2,0.85]}),
  cube('FALL_LIP',[2.2,0.14,0.6],tint(water,0.3),[0,4.9,-0.9],{opacity:0.78,vc:[0.2,0.85]}),
  tbox('FALL_MAIN',{wb:2.3,db:0.34,wt:2.0,dt:0.3,h:4.5},water,[0,2.6,0.55],{opacity:0.6,vc:[0.25,0.85]}),
  tbox('FALL_CENTER',{wb:1.3,db:0.2,wt:1.0,dt:0.16,h:4.5},'#e0f2fe',[0,2.62,0.78],{opacity:0.72,vc:[0.1,0.9]}),
  cube('FALL_SIDE_L',[0.22,4.0,0.14],'#7dd3fc',[-1.15,2.5,0.5],{opacity:0.34,vc:[0.2,0.85]}),
  cube('FALL_SIDE_R',[0.22,4.0,0.14],'#7dd3fc',[1.15,2.5,0.5],{opacity:0.34,vc:[0.2,0.85]}),
  cube('POOL_MAIN',[4.2,0.1,3.0],'#0ea5e9',[0,0.2,1.7],{opacity:0.66,vc:[0.2,0.85]}),
  torus('FOAM_RING',[1.02,0.11,4,12],foam,[0,0.26,0.9],{rotation:[PI/2,0,0],scale:[1.42,1,0.64],opacity:0.48,vc:false}),
  sphere('SPLASH_L',[0.26,6,4],'#e0f2fe',[-0.98,0.4,0.96],{scale:[1.24,0.82,1],opacity:0.68,vc:false}),
  sphere('SPLASH_C',[0.34,6,4],foam,[0,0.46,0.9],{scale:[1.56,0.9,1.16],opacity:0.74,vc:false}),
  sphere('SPLASH_R',[0.26,6,4],'#e0f2fe',[0.98,0.4,0.96],{scale:[1.24,0.82,1],opacity:0.68,vc:false}),
  sphere('ROCK_L',[0.74,6,4],'#6b7280',[-2.08,0.42,1.9],{scale:[1.24,0.68,1.08]}),
  sphere('ROCK_R',[0.7,6,4],'#6b7280',[2.08,0.4,1.74],{scale:[1.16,0.66,1.02]}),
  cube('MOSS_L',[1.4,0.14,1.0],moss,[-1.7,4.9,-1.3]),
  cube('MOSS_R',[1.2,0.14,0.9],moss,[1.8,4.85,-1.2]),
  cube('MOSS_SIDE',[0.1,0.8,0.9],moss,[-2.25,2.6,0.9]),
 ],{animations:[anim('idle',2.4,true,[
   track('FALL_MAIN','scale',[kf(0,[1,1,1]),kf(1.2,[1.04,1,1.25]),kf(2.4,[1,1,1])]),
   track('FALL_CENTER','position',[kf(0,[0,2.62,0.78]),kf(1.2,[0,2.52,0.82]),kf(2.4,[0,2.62,0.78])]),
   track('FOAM_RING','scale',[kf(0,[1.42,1,0.64]),kf(1.2,[1.56,1,0.72]),kf(2.4,[1.42,1,0.64])]),
   track('SPLASH_C','scale',[kf(0,[1.56,0.9,1.16]),kf(0.6,[1.7,1.1,1.26]),kf(1.2,[1.5,0.85,1.1]),kf(1.8,[1.68,1.05,1.24]),kf(2.4,[1.56,0.9,1.16])]),
 ])]}));
}

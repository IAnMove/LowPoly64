import {cube,cyl,sphere,cone,pyramid,wedge,tbox,torus,capsule,lathe,loft,custom,vc,shade,tint,read,readWorking,write,template,PI} from './lib.mjs';
const C='Comida';
const keepCustom=(rel,name)=>{const p=read(rel).pieces.find(x=>x.name===name);return p;};
const stem=(pos,h=0.52)=>cyl('STEM',[0.07,0.09,h,6],'#5f3416',pos);
const leaf=(name,color,pos,rot,w=0.58)=>wedge(name,[w,0.16,w*0.58],color,pos,{rotation:rot});
// generic round fruit via lathe with dimples
const fruit=(name,color,r,{squash=1,dimple=0.12,stretch=1}={})=>lathe('BODY',{points:[[0,-r*0.92],[r*0.5,-r*0.98],[r*0.88,-r*0.6],[r*1.0,r*0.0],[r*0.9,r*0.55],[r*0.55,r*0.9],[r*0.25,r*0.95],[0,r*(0.95-dimple)]].map(([a,b])=>[a,b*stretch]),segments:10},color,[0,r*0.98*stretch,0],{scale:[1,squash,1]});

// baguette
write('food/baguette.json',template('baguette','Baguette',C,[
 loft('BODY',{sides:8,sections:[{y:-1.81,radiusX:0.2,radiusZ:0.2},{y:-1.3,radiusX:0.32,radiusZ:0.34},{y:0,radiusX:0.36,radiusZ:0.38},{y:1.3,radiusX:0.32,radiusZ:0.34},{y:1.81,radiusX:0.2,radiusZ:0.2}]},'#c88a45',[0,0.4,0],{rotation:[0,0,PI/2]}),
 ...[-1.02,-0.34,0.34,1.02].map((x,i)=>cube(`CUT_${i+1}`,[0.16,0.08,0.48],'#f4d39c',[x,0.74,0],{rotation:[0,0,0.52],vc:[0.1,0.9]})),
 cube('FLOUR',[0.6,0.03,0.3],'#f8ead0',[0.2,0.78,0.15],{opacity:0.8,vc:false}),
]));
// banana
{const segs=[];const r=1.5,cx=0,cy=-0.3;const n=5;const a0=2.55,a1=0.59;
 for(let i=0;i<n;i++){const a=a0+(a1-a0)*(i+0.5)/n;const len=(a0-a1)*r/n+0.08;const rad=0.2+0.08*Math.sin(PI*(i+0.5)/n);
  segs.push(loft(`SEG_${String.fromCharCode(65+i)}`,{sides:6,sections:[{y:-len/2,radiusX:rad-0.02,radiusZ:rad-0.04},{y:len/2,radiusX:rad+0.02,radiusZ:rad}]},i%2?'#f0d44b':'#f3da5a',[cx+Math.cos(a)*r,cy+Math.sin(a)*r+0.3,0],{rotation:[0,0,a]}));}
 const end=(a)=>[cx+Math.cos(a)*r,cy+Math.sin(a)*r+0.3,0];
write('food/banana.json',template('banana','Banana',C,[
 ...segs,
 cone('TIP_L',[0.14,0.3,6],'#5a3d18',end(a0+0.1),{rotation:[0,0,a0+0.1]}),
 cube('TIP_R',[0.1,0.1,0.1],'#4a3212',end(a1-0.08)),
 cube('STEM',[0.14,0.3,0.14],'#6d5222',end(a1-0.15),{rotation:[0,0,a1-0.1]}),
 cube('SPOT_1',[0.1,0.06,0.03],'#8a6a1c',[0.1,1.2,0.25],{vc:false}),
 cube('SPOT_2',[0.08,0.05,0.03],'#8a6a1c',[-0.6,0.95,0.22],{vc:false}),
 cube('RIDGE',[0.04,0.04,0.04],'#c9b23a',[0,1.36,0.1],{vc:false}),
]));}
// bread_loaf
write('food/bread_loaf.json',template('bread_loaf','Pan de Molde',C,[
 cube('BASE',[2.1,0.78,1.24],'#b77734',[0,0.39,0]),
 cyl('TOP',[0.58,0.58,2.08,8],'#c68942',[0,0.94,0],{rotation:[0,0,1.57]}),
 ...[-0.58,0,0.58].map((x,i)=>cube(`SLASH_${i+1}`,[0.18,0.08,0.78],'#f0cb8e',[x,1.2+(i===1?0.06:0),0],{rotation:[0,0,0.24],vc:[0.1,0.9]})),
 cube('CRUST_LINE',[2.12,0.06,1.26],shade('#b77734',0.7),[0,0.78,0],{vc:false}),
 cube('FLOUR',[0.5,0.03,0.4],'#f8ead0',[0.4,1.5,0.1],{opacity:0.8,vc:false}),
]));
// burger
write('food/burger.json',template('burger','Hamburguesa',C,[
 cyl('BOTTOM_BUN',[1.08,1.12,0.42,10],'#d5a45a',[0,0.21,0]),
 cyl('PATTY',[0.98,0.98,0.26,10],'#5a311a',[0,0.54,0]),
 cube('CHEESE',[1.72,0.08,1.16],'#f1d34c',[0,0.73,0],{rotation:[0,0.14,0],vc:[0.2,0.85]}),
 cube('CHEESE_DRIP',[0.14,0.2,0.08],'#f1d34c',[0.82,0.58,0.3],{vc:[0.2,0.85]}),
 cyl('LETTUCE',[1.02,1.02,0.08,10],'#5da63a',[0,0.84,0]),
 wedge('LETTUCE_EDGE',[0.5,0.12,0.4],'#6fb84a',[-0.9,0.78,0.3],{rotation:[0,0.5,0.4]}),
 cyl('TOMATO',[0.86,0.86,0.08,10],'#d1463c',[0,0.96,0]),
 cyl('ONION',[0.7,0.7,0.05,10],'#e9d5ff',[0,1.03,0],{vc:false}),
 lathe('TOP_BUN',{points:[[1.08,-0.1],[1.1,0.05],[0.95,0.35],[0.6,0.55],[0,0.62]],segments:10},'#d5a45a',[0,1.18,0]),
 ...[[-0.42,1.72,-0.12],[0,1.76,0.16],[0.38,1.7,-0.06],[0.2,1.74,0.4],[-0.3,1.73,0.35],[0.5,1.66,0.3]].map((p,i)=>cube(`SEED_${i+1}`,[0.08,0.02,0.04],'#f5e7b4',p,{rotation:[0,i*0.5,0],vc:false})),
]));
// burrito
write('food/burrito.json',template('burrito','Burrito',C,[
 loft('WRAP',{sides:8,sections:[{y:-1.13,radiusX:0.42,radiusZ:0.42},{y:0,radiusX:0.48,radiusZ:0.48},{y:1.13,radiusX:0.44,radiusZ:0.44}]},'#ddb87d',[0,0.48,0],{rotation:[0,0,1.57]}),
 cube('SEAM',[1.86,0.08,0.1],'#cfa46c',[0,0.62,0.24],{vc:false}),
 cube('FOLD',[0.3,0.9,0.1],'#cfa46c',[-0.9,0.48,0.3],{rotation:[0,0.3,0],vc:false}),
 cube('RICE',[0.18,0.18,0.18],'#f4f0e0',[1.08,0.46,0],{vc:false}),
 cube('BEANS',[0.16,0.16,0.16],'#4b2d1d',[1.14,0.32,0.18],{vc:false}),
 cube('SALSA',[0.16,0.16,0.16],'#c93f34',[1.12,0.62,-0.16],{vc:false}),
 cube('LETTUCE',[0.16,0.16,0.16],'#5da63a',[1.16,0.48,-0.02],{vc:false}),
 cube('CHEESE',[0.12,0.12,0.12],'#f0cd48',[1.14,0.64,0.1],{vc:false}),
 cube('GRILL_1',[0.06,0.03,0.8],shade('#ddb87d',0.7),[-0.3,0.95,0],{vc:false}),
 cube('GRILL_2',[0.06,0.03,0.8],shade('#ddb87d',0.7),[0.3,0.95,0],{vc:false}),
]));
// cheese_wedge
{const body=keepCustom('food/cheese_wedge.json','BODY');
write('food/cheese_wedge.json',template('cheese_wedge','Queso Cuña',C,[
 {...body,vertexColors:vc('#f2d14a')},
 ...[[-0.34,0.32,0.34,0.16],[0.14,0.4,0.12,0.12],[0.36,0.26,-0.2,0.1],[-0.5,0.5,0.6,0.09],[0.5,0.15,0.3,0.08]].map(([x,y,z,r],i)=>sphere(`HOLE_${i+1}`,[r,6,4],'#dcb735',[x,y,z],{scale:[1,0.7,0.7],vc:false})),
 cube('RIND',[1.86,0.08,0.06],'#e3b63c',[0,0.62,0.88],{vc:false}),
]));}
// cheese_wheel
{const cut=keepCustom('food/cheese_wheel.json','CUT');
write('food/cheese_wheel.json',template('cheese_wheel','Queso Rueda',C,[
 cyl('WHEEL',[0.92,0.92,0.72,10],'#f0cf51',[0,0.92,0],{rotation:[1.57,0,0]}),
 cyl('RIND_F',[0.94,0.94,0.06,10],'#d9ae3a',[0,0.92,0.36],{rotation:[1.57,0,0],vc:false}),
 cyl('RIND_B',[0.94,0.94,0.06,10],'#d9ae3a',[0,0.92,-0.36],{rotation:[1.57,0,0],vc:false}),
 ...[[-0.26,1.04,-0.4,0.14],[0.22,0.82,-0.42,0.12],[0.04,1.18,-0.42,0.1],[-0.1,0.7,-0.42,0.08]].map(([x,y,z,r],i)=>sphere(`HOLE_${i+1}`,[r,6,4],'#d8b137',[x,y,z],{scale:[1,0.7,0.7],vc:false})),
 {...cut,vertexColors:vc('#f5d95e')},
 cube('LABEL',[0.5,0.5,0.03],'#b91c1c',[0,0.92,0.4],{rotation:[0,0,0.785],vc:false}),
]));}
// cherries_pair
write('food/cherries_pair.json',template('cherries_pair','Cerezas',C,[
 fruit('CHERRY_L','#bd2229',0.6,{dimple:0.1}),
 ...(()=>{const p=fruit('CHERRY_R','#bd2229',0.6,{dimple:0.1});p.position=[0.42,0.6,0];return [p];})(),
 cyl('STEM_L',[0.04,0.05,1.32,6],'#5c3417',[-0.3,1.52,0],{rotation:[0,0,0.45]}),
 cyl('STEM_R',[0.04,0.05,1.42,6],'#5c3417',[0.28,1.6,0],{rotation:[0,0,-0.38]}),
 sphere('STEM_KNOT',[0.07,5,4],'#5c3417',[0,2.18,0]),
 leaf('LEAF','#5e9b39',[0.12,2.2,0.05],[0.2,0.1,0.12],0.62),
 sphere('SHINE_L',[0.1,5,4],'#f0a0a0',[-0.6,0.95,0.3],{scale:[1.3,0.6,1],opacity:0.7,vc:false}),
 sphere('SHINE_R',[0.1,5,4],'#f0a0a0',[0.24,0.95,0.3],{scale:[1.3,0.6,1],opacity:0.7,vc:false}),
]));
// fix cherry L position
{const t=readWorking('food/cherries_pair.json');t.pieces[0].name='CHERRY_L';t.pieces[0].position=[-0.42,0.6,0];t.pieces[1].name='CHERRY_R';write('food/cherries_pair.json',t);}
// club_sandwich
{const t=read('food/club_sandwich.json');const get=(n)=>t.pieces.find(p=>p.name===n);
 const layer=(n,c)=>({...get(n),vertexColors:vc(c)});
write('food/club_sandwich.json',template('club_sandwich','Sandwich Club',C,[
 layer('BREAD_BOTTOM','#dfb36f'),layer('HAM','#d17f62'),layer('LETTUCE','#6ab443'),layer('CHEESE','#f0d049'),layer('BREAD_TOP','#dfb36f'),
 cube('CRUST_TOP',[1.66,0.06,0.08],'#b98a45',[0,0.8,0.68],{vc:false}),
 cube('CRUST_BOTTOM',[1.66,0.06,0.08],'#b98a45',[0,0.16,0.76],{vc:false}),
 wedge('LETTUCE_LEAF',[0.36,0.1,0.3],'#7dc24e',[-0.7,0.52,0.6],{rotation:[0,0.6,0.3]}),
 cyl('TOOTHPICK',[0.03,0.03,1.28,6],'#b37a3a',[0.18,1,0.18],{vc:false}),
 sphere('OLIVE',[0.14,8,6],'#79a338',[0.18,1.64,0.18]),
 cube('OLIVE_PIMENTO',[0.06,0.06,0.06],'#c93f34',[0.18,1.64,0.32],{vc:false}),
]));}
// coconut
write('food/coconut.json',template('coconut','Coco',C,[
 sphere('BODY',[1.02,8,6],'#8b5a2b',[0,1.02,0],{scale:[1.06,1,1.06]}),
 cube('BAND',[1.72,0.18,1.72],'#5c3a1e',[0,1.02,0],{rotation:[0.18,0.1,0]}),
 cube('BAND_2',[1.7,0.14,1.7],'#5c3a1e',[0,1.02,0],{rotation:[-0.1,0.9,0.2]}),
 ...[[-0.18,1.18,-1.02],[0.08,1.04,-1.04],[0.28,1.26,-0.98]].map((p,i)=>cube(`EYE_${i+1}`,[0.14,0.14,0.04],'#1d120b',p,{vc:false})),
 cube('TUFT',[0.16,0.26,0.16],'#7a5526',[0,2,0]),
 cube('FIBER_1',[0.06,0.5,0.06],'#8a6a3a',[0.5,1.75,0.4],{rotation:[0.4,0,-0.6],vc:false}),
 cube('FIBER_2',[0.06,0.45,0.06],'#8a6a3a',[-0.6,1.6,0.2],{rotation:[0.2,0,0.7],vc:false}),
 cube('FIBER_3',[0.06,0.4,0.06],'#8a6a3a',[0.1,1.3,0.9],{rotation:[-0.7,0,0.1],vc:false}),
]));
// croissant
write('food/croissant.json',template('croissant','Croissant',C,[
 capsule('SEG_L',[0.22,0.64,2,6],'#cf9249',[-0.62,0.56,0],{rotation:[0,0,0.92]}),
 capsule('SEG_C',[0.28,0.92,2,6],'#d49a54',[0,0.72,0]),
 capsule('SEG_R',[0.22,0.64,2,6],'#cf9249',[0.62,0.56,0],{rotation:[0,0,-0.92]}),
 cone('TIP_L',[0.12,0.34,6],'#b77935',[-0.94,0.42,0],{rotation:[0,0,1.26]}),
 cone('TIP_R',[0.12,0.34,6],'#b77935',[0.94,0.42,0],{rotation:[0,0,-1.26]}),
 torus('FOLD_1',[0.26,0.04,4,8],'#b77935',[-0.3,0.66,0],{rotation:[0,0,0.5],vc:false}),
 torus('FOLD_2',[0.26,0.04,4,8],'#b77935',[0.3,0.66,0],{rotation:[0,0,-0.5],vc:false}),
 cube('GLAZE',[0.3,0.04,0.2],'#f5d8a8',[0,1.0,0],{opacity:0.7,vc:false}),
]));
// cupcake
{const t=read('food/cupcake.json');
write('food/cupcake.json',template('cupcake','Cupcake',C,[
 cyl('BASE',[0.54,0.68,0.62,10],'#a96d43',[0,0.31,0],{faceColors:t.pieces[0].faceColors}),
 ...[0,1,2,3,4].map(i=>{const a=i/5*PI*2;return cube(`PLEAT_${i+1}`,[0.06,0.6,0.08],shade('#a96d43',0.75),[Math.cos(a)*0.62,0.31,Math.sin(a)*0.62],{rotation:[0,-a,0],vc:false});}),
 cyl('CAKE',[0.58,0.56,0.1,10],'#d9a56a',[0,0.65,0]),
 sphere('FROSTING',[0.82,8,6],'#ef7fb2',[0,1.08,0],{scale:[1,0.9,1]}),
 sphere('TOP_SWIRL',[0.42,8,6],'#ef7fb2',[0,1.62,0],{scale:[0.9,0.8,0.9]}),
 sphere('SWIRL_TIP',[0.2,6,5],'#f59cc5',[0,1.92,0],{scale:[0.8,1.1,0.8]}),
 sphere('CHERRY',[0.16,8,6],'#c9262f',[0,2.1,0]),
 cyl('CHERRY_STEM',[0.02,0.02,0.2,4],'#5c3417',[0.04,2.3,0],{rotation:[0,0,-0.3],vc:false}),
 ...[[-0.18,1.3,0.2,0.4,'#f6e26f'],[0.1,1.42,-0.16,-0.2,'#7fd9ff'],[0.22,1.18,0.08,0.6,'#ffffff'],[0.5,1.35,0.4,0.1,'#8ae65b'],[-0.45,1.4,-0.3,0.8,'#f6e26f'],[0.0,1.72,0.3,0.3,'#7fd9ff']].map(([x,y,z,r,c],i)=>cube(`SPRINKLE_${i+1}`,[0.12,0.03,0.03],c,[x,y,z],{rotation:[0.2,r,0.3],vc:false})),
]));}
// dragonfruit_half
write('food/dragonfruit_half.json',template('dragonfruit_half','Pitahaya',C,[
 sphere('BODY',[0.98,8,6],'#cf2f7e',[0,0.94,0.12],{scale:[1.08,0.88,0.9]}),
 cube('CUT_FACE',[1.56,1.18,0.12],'#f3f3ef',[0,0.94,-0.56],{vc:false}),
 cube('CUT_RIM',[1.7,1.3,0.06],'#e34d93',[0,0.94,-0.52],{vc:false}),
 ...[[-0.38,1.1],[-0.12,0.88],[0.22,1.02],[0.4,0.8],[-0.28,0.72],[0.05,1.3],[0.45,1.2],[-0.5,0.95],[0.15,0.6],[-0.1,1.12]].map(([x,y],i)=>cube(`SEED_${i+1}`,[0.05,0.05,0.02],'#111111',[x,y,-0.63],{vc:false})),
 wedge('SCALE_A',[0.44,0.18,0.22],'#6dbd48',[-0.72,1.2,-0.08],{rotation:[0.4,0,0.82]}),
 wedge('SCALE_B',[0.44,0.18,0.22],'#6dbd48',[0.74,1.16,-0.04],{rotation:[0.4,0,-0.82]}),
 wedge('SCALE_C',[0.38,0.16,0.2],'#6dbd48',[0,1.44,0.18],{rotation:[0.1,0,0]}),
 wedge('SCALE_D',[0.36,0.16,0.2],'#5aab3c',[-0.4,0.5,0.5],{rotation:[0.6,0.5,0.5]}),
 wedge('SCALE_E',[0.36,0.16,0.2],'#5aab3c',[0.42,0.55,0.5],{rotation:[0.6,-0.5,-0.5]}),
]));
// fig_half
write('food/fig_half.json',template('fig_half','Higo',C,[
 lathe('BODY',{points:[[0,-0.98],[0.5,-0.9],[0.78,-0.4],[0.74,0.3],[0.45,0.8],[0.15,0.98],[0,0.98]],segments:8},'#7c3f94',[0,0.98,0.16]),
 cube('CUT_FACE',[1.18,1.3,0.12],'#d9789c',[0,0.98,-0.48],{vc:[0.15,0.85]}),
 cube('INNER_CORE',[0.48,0.78,0.14],'#f0e0c0',[0,1.02,-0.52],{vc:false}),
 cube('INNER_RING',[0.8,1.0,0.1],'#e8a0bb',[0,0.98,-0.5],{vc:false}),
 ...[[-0.24,0.92],[0.22,1.06],[0,0.72],[-0.1,1.25],[0.12,0.6]].map(([x,y],i)=>cube(`SEED_${i+1}`,[0.07,0.07,0.02],'#f7dcb8',[x,y,-0.6],{vc:false})),
 cyl('STEM',[0.06,0.08,0.28,6],'#5c3417',[0,2.06,0.16]),
]));
// fried_egg
write('food/fried_egg.json',template('fried_egg','Huevo Frito',C,[
 sphere('WHITE_A',[0.92,8,5],'#f7f5ec',[0,0.1,0],{scale:[1.22,0.12,0.94],vc:[0.05,0.9]}),
 sphere('WHITE_B',[0.74,8,5],'#f7f5ec',[-0.38,0.1,0.1],{scale:[1,0.12,1.08],vc:[0.05,0.9]}),
 sphere('WHITE_C',[0.66,8,5],'#f7f5ec',[0.42,0.1,-0.14],{scale:[0.96,0.12,0.92],vc:[0.05,0.9]}),
 sphere('WHITE_D',[0.4,6,4],'#f7f5ec',[0.1,0.1,0.75],{scale:[1.1,0.12,0.9],vc:[0.05,0.9]}),
 sphere('YOLK',[0.36,8,6],'#f2bf2f',[0.08,0.22,-0.02],{scale:[1,0.4,1]}),
 sphere('YOLK_SHINE',[0.1,5,4],'#fde68a',[-0.04,0.36,-0.1],{scale:[1.3,0.4,1],opacity:0.8,vc:false}),
 cube('CRISP_EDGE',[0.3,0.04,0.12],'#d8b779',[-1.0,0.1,0.4],{rotation:[0,0.6,0],vc:false}),
]));
// grapes_bunch
write('food/grapes_bunch.json',template('grapes_bunch','Uvas',C,[
 cyl('STEM',[0.08,0.1,0.82,6],'#6d4a22',[0,2.62,0]),
 cyl('STEM_BRANCH',[0.04,0.05,0.5,5],'#6d4a22',[-0.25,2.2,0.1],{rotation:[0,0,0.6],vc:false}),
 leaf('LEAF','#4a8a34',[0.3,2.46,0],[0.2,0.3,0.48],0.72),
 cube('TENDRIL',[0.04,0.3,0.04],'#6d4a22',[0.45,2.75,0.1],{rotation:[0.3,0,-0.6],vc:false}),
 ...[[-0.42,1.96,0.12],[0.02,1.9,-0.14],[0.42,1.9,0.12],[-0.22,1.46,-0.18],[0.24,1.44,0.18],[-0.48,1.06,0.14],[0,1.02,-0.12],[0.46,1.02,0.14],[0,0.62,0.06],[-0.2,1.5,0.35],[0.3,1.3,-0.35]].map((p,i)=>sphere(`GRAPE_${i+1}`,[i>=9?0.36:(i===8?0.38:0.42),7,5],i%3===2?'#7a42c4':'#6b35b5',p)),
]));
// apples/citrus family
const roundFruit=(id,name,color,{top,bottom,leafC,extra=[],stemH=0.52,r=1.05,dimple=0.12,squash=1})=>write(`food/${id}.json`,template(id,name,C,[
 fruit('BODY',color,r,{dimple,squash}),
 cyl('TOP_DIMPLE',[0.22,0.26,0.12,8],top,[0,r*0.98*squash+r*0.8,0],{vc:false}),
 ...(bottom?[cyl('BOTTOM_DIMPLE',[0.18,0.22,0.08,8],bottom,[0,0.1,0],{vc:false})]:[]),
 stem([0,r*0.98*squash+r*0.82+stemH/2,0.03],stemH),
 leaf('LEAF',leafC,[0.28,r*0.98*squash+r*0.95,-0.02],[0.2,0.4,0.55]),
 ...extra,
]));
roundFruit('green_apple','Manzana Verde','#7fbf37',{top:'#547d23',bottom:'#3d5b17',leafC:'#4d8b31',extra:[leaf('LEAF_B','#63983a',[-0.22,2.08,0.08],[0.15,-0.3,-0.4],0.44)]});
roundFruit('red_apple','Manzana Roja','#c92f29',{top:'#7f211e',bottom:'#5f1715',leafC:'#4d8b31',extra:[sphere('SHINE',[0.16,5,4],'#f2a0a0',[-0.5,1.6,0.6],{scale:[1.4,0.6,1],opacity:0.6,vc:false})]});
roundFruit('orange','Naranja','#df7b21',{top:'#a14d12',bottom:null,leafC:'#5c9631',extra:[cube('NAVEL',[0.16,0.08,0.16],'#f3c995',[0,0.1,0],{vc:false}),...[[0.6,1.2,0.75],[-0.55,0.8,0.8],[0.2,0.5,0.95]].map((p,i)=>cube(`PORE_${i+1}`,[0.06,0.06,0.04],'#c76a18',p,{vc:false}))]});
roundFruit('peach','Melocoton','#ef9b63',{top:'#a85e34',bottom:'#8a4a24',leafC:'#4d8b31',extra:[cube('CREASE',[0.08,1.3,0.04],'#cf7d49',[0,1.04,-1],{vc:false}),sphere('BLUSH',[0.5,6,5],'#e0705a',[0.5,1.2,0.6],{scale:[1,1,0.5],opacity:0.5,vc:false})]});
roundFruit('plum','Ciruela','#6d3aa8',{top:'#51297b',bottom:'#32154d',leafC:'#689f3a',extra:[cube('CREASE',[0.06,1.2,0.04],'#51297b',[0,1.04,-1],{vc:false}),sphere('BLOOM',[0.3,5,4],'#b9a0e0',[-0.45,1.5,0.6],{scale:[1.4,0.7,0.6],opacity:0.45,vc:false})]});
roundFruit('lime','Lima','#61b437',{top:'#457821',bottom:'#305717',leafC:'#77b64a',r:0.88,extra:[...[[0.5,1.0,0.65],[-0.45,0.7,0.65]].map((p,i)=>cube(`PORE_${i+1}`,[0.05,0.05,0.04],'#4a8f2a',p,{vc:false}))]});
// lemon
write('food/lemon.json',template('lemon','Limon',C,[
 lathe('BODY',{points:[[0,-1.3],[0.12,-1.25],[0.6,-0.9],[0.95,-0.3],[0.95,0.3],[0.6,0.9],[0.12,1.25],[0,1.3]],segments:8},'#f0d74b',[0,1.0,0],{rotation:[PI/2,0,0]}),
 leaf('LEAF','#5f8f2e',[0.32,1.9,0.08],[0.25,0.1,0.48],0.52),
 cyl('STEM',[0.05,0.06,0.2,5],'#5f3416',[0.05,1.95,0.3],{rotation:[0.6,0,0]}),
 ...[[0.75,1.3,0.4],[-0.7,0.8,0.5],[0.3,0.5,0.85]].map((p,i)=>cube(`PORE_${i+1}`,[0.06,0.06,0.04],'#d4b92c',p,{vc:false})),
]));
// mango
write('food/mango.json',template('mango','Mango',C,[
 lathe('BODY',{points:[[0,-1.15],[0.5,-1.05],[0.9,-0.4],[0.85,0.4],[0.5,1.0],[0.15,1.2],[0,1.2]],segments:8},'#d99b2f',[0,1.14,0],{scale:[0.95,1,0.82],rotation:[0,0,0.12]}),
 sphere('CHEEK',[0.58,8,6],'#cf7030',[0.32,0.98,-0.12],{scale:[1,0.9,0.9]}),
 sphere('BLUSH',[0.4,6,5],'#c9453a',[0.1,1.6,0.3],{scale:[1.2,0.8,0.6],opacity:0.5,vc:false}),
 cyl('STEM',[0.06,0.08,0.42,6],'#5b3415',[-0.08,2.4,0.06]),
 leaf('LEAF','#4e8f33',[-0.26,2.28,0.02],[0.14,0.1,-0.56],0.74),
]));
// pear
write('food/pear.json',template('pear','Pera',C,[
 lathe('LOWER',{points:[[0,-1.0],[0.55,-0.95],[0.95,-0.4],[0.98,0.2],[0.75,0.8],[0.5,1.0]],segments:9},'#a0c645',[0,1.0,0]),
 lathe('UPPER',{points:[[0.5,-0.4],[0.62,0.1],[0.5,0.6],[0.25,0.9],[0,0.95]],segments:9},'#a8cc4f',[0,2.0,0]),
 cyl('BOTTOM_DIMPLE',[0.16,0.2,0.08,8],'#6b8a2a',[0,0.05,0],{vc:false}),
 cyl('STEM',[0.06,0.09,0.58,6],'#5f3416',[0,3.1,0.02],{rotation:[0,0,0.15]}),
 leaf('LEAF','#4c8c2c',[0.24,2.95,0],[0.1,0.25,0.4],0.62),
 sphere('SPOT_1',[0.08,5,4],'#8aa83a',[0.6,0.9,0.7],{scale:[1,0.4,1],vc:false}),
 sphere('SPOT_2',[0.06,5,4],'#8aa83a',[-0.5,1.3,0.75],{scale:[1,0.4,1],vc:false}),
]));
// hot_dog
write('food/hot_dog.json',template('hot_dog','Perrito Caliente',C,[
 cube('BUN_BOTTOM',[2.14,0.24,0.86],'#d3a35a',[0,0.14,0]),
 capsule('BUN_LEFT',[0.26,1.7,2,8],'#d3a35a',[0,0.42,-0.24],{rotation:[0,0,1.57]}),
 capsule('BUN_RIGHT',[0.26,1.7,2,8],'#d3a35a',[0,0.42,0.24],{rotation:[0,0,1.57]}),
 capsule('SAUSAGE',[0.22,1.95,2,8],'#9b3d1b',[0,0.5,0],{rotation:[0,0,1.57]}),
 ...[-0.6,0,0.6].map((x,i)=>cube(`MUSTARD_${['A','B','C'][i]}`,[0.5,0.06,0.08],'#f0c52d',[x,0.74,0.05*(i-1)],{rotation:[0,0.4*(i%2?1:-1),0],vc:false})),
 ...[-0.3,0.3].map((x,i)=>cube(`KETCHUP_${i+1}`,[0.5,0.06,0.08],'#c93f34',[x,0.72,-0.05],{rotation:[0,-0.4*(i%2?1:-1),0],vc:false})),
 cube('ONION_1',[0.08,0.06,0.08],'#f5f0e0',[0.85,0.73,0.1],{vc:false}),
 cube('ONION_2',[0.08,0.06,0.08],'#f5f0e0',[-0.9,0.73,-0.08],{vc:false}),
]));
// ice_cream_cone
write('food/ice_cream_cone.json',template('ice_cream_cone','Helado Cono',C,[
 cone('CONE',[0.46,1.26,8],'#c58a4b',[0,0.63,0],{rotation:[3.14,0,0]}),
 ...[0.45,0.74,0.95].map((y,i)=>cube(`WAFFLE_${['A','B','C'][i]}`,[0.5+i*0.2,0.04,0.04],'#a86e38',[0,y,0.3-i*0.08],{rotation:[0,0,(i%2?-0.78:0.78)],vc:false})),
 torus('CONE_RIM',[0.44,0.05,4,8],'#b07a3d',[0,1.22,0],{rotation:[PI/2,0,0],vc:false}),
 sphere('SCOOP',[0.64,8,6],'#f2b55b',[0,1.58,0]),
 sphere('SCOOP_2',[0.5,8,6],'#f4e2c0',[0.1,2.3,0.05]),
 sphere('DRIP',[0.12,5,4],'#f2b55b',[0.5,1.15,0.2],{scale:[0.8,1.6,0.8],vc:false}),
 sphere('TOPPING',[0.16,8,6],'#cf2634',[0.1,2.82,0.04]),
 cube('SPRINKLE_1',[0.1,0.03,0.03],'#7fd9ff',[-0.3,2.6,0.3],{rotation:[0.2,0.4,0.3],vc:false}),
 cube('SPRINKLE_2',[0.1,0.03,0.03],'#f6e26f',[0.35,2.55,-0.2],{rotation:[0.2,-0.6,0.1],vc:false}),
]));
// kiwi_half
write('food/kiwi_half.json',template('kiwi_half','Kiwi',C,[
 cyl('SKIN',[0.82,0.82,0.4,10],'#8a5b2f',[0,0.84,0],{rotation:[1.57,0,0]}),
 cyl('FLESH',[0.7,0.7,0.5,10],'#7fb94a',[0,0.84,-0.02],{rotation:[1.57,0,0]}),
 cyl('FLESH_INNER',[0.44,0.44,0.54,10],'#a3d26a',[0,0.84,-0.02],{rotation:[1.57,0,0],vc:[0.15,0.9]}),
 cyl('CORE',[0.18,0.18,0.58,8],'#f2f0dd',[0,0.84,-0.02],{rotation:[1.57,0,0],vc:false}),
 ...[0,1,2,3,4,5,6,7,8,9].map(i=>{const a=i/10*PI*2;const r=0.3+(i%2)*0.1;return cube(`SEED_${i+1}`,[0.05,0.1,0.04],'#131313',[Math.cos(a)*r,0.84+Math.sin(a)*r,0],{rotation:[0,0,a],scale:[1,1,15],vc:false});}),
 cube('FUZZ_1',[0.1,0.04,0.04],'#a07040',[0.6,1.4,0.1],{vc:false}),
]));
// pancake_stack
write('food/pancake_stack.json',template('pancake_stack','Tortitas',C,[
 cyl('PLATE',[1.3,1.2,0.08,12],'#f8fafc',[0,0.04,0],{vc:false}),
 cyl('PANCAKE_1',[0.92,0.92,0.16,10],'#d3a35b',[0,0.16,0]),
 cyl('PANCAKE_2',[0.88,0.88,0.16,10],'#d3a35b',[0.04,0.32,-0.04]),
 cyl('PANCAKE_3',[0.9,0.9,0.16,10],'#d3a35b',[-0.03,0.48,0.03]),
 cyl('PANCAKE_4',[0.86,0.86,0.16,10],'#dcae66',[0.02,0.64,0.02]),
 cube('BUTTER',[0.28,0.14,0.28],'#f4dc72',[0,0.79,0],{vc:[0.2,0.85]}),
 cyl('SYRUP_POOL',[0.6,0.6,0.03,10],'#7a421f',[0,0.73,0],{vc:false}),
 cube('SYRUP_A',[0.84,0.08,0.1],'#7a421f',[0.18,0.74,0.24],{vc:false}),
 cube('SYRUP_B',[0.12,0.34,0.08],'#7a421f',[0.58,0.56,0.26],{vc:false}),
 cube('SYRUP_C',[0.1,0.3,0.08],'#7a421f',[-0.44,0.42,-0.28],{vc:false}),
 cube('SYRUP_D',[0.1,0.2,0.08],'#7a421f',[0.1,0.65,-0.82],{vc:false}),
 sphere('BERRY_1',[0.1,5,4],'#1d4ed8',[0.9,0.14,0.6],{vc:[0.3,0.8]}),
 sphere('BERRY_2',[0.09,5,4],'#1d4ed8',[1.05,0.13,0.4],{vc:[0.3,0.8]}),
]));
// pineapple
{const t=read('food/pineapple.json');
write('food/pineapple.json',template('pineapple','Pina',C,[
 loft('BODY',{sides:8,sections:[{y:-0.91,radiusX:0.8,radiusZ:0.8},{y:-0.2,radiusX:0.95,radiusZ:0.95},{y:0.5,radiusX:0.9,radiusZ:0.9},{y:0.91,radiusX:0.72,radiusZ:0.72}]},'#d6a52b',[0,0.92,0],{faceColors:t.pieces[0].faceColors}),
 ...[[1.2,0.52,0.66],[0.72,0.52,0.66],[1.2,-0.52,-0.66],[0.72,-0.52,-0.66]].map(([y,z,r],i)=>cube(`BAND_${['A','B','C','D'][i]}`,[1.6,0.1,0.1],'#9e6b1b',[0,y,z],{rotation:[r,0,0],vc:false})),
 ...[[0.52,1.2,-0.66],[0.52,0.72,-0.66],[-0.52,1.2,0.66],[-0.52,0.72,0.66]].map(([x,y,r],i)=>cube(`BAND_${['E','F','G','H'][i]}`,[0.1,0.1,1.6],'#9e6b1b',[x,y,0],{rotation:[0,0,r],vc:false})),
 wedge('LEAF_A',[0.54,1.18,0.22],'#4b8f2b',[0,2.4,-0.18],{rotation:[-0.2,0,0]}),
 wedge('LEAF_B',[0.52,1.02,0.22],'#4b8f2b',[-0.32,2.3,0.04],{rotation:[0.1,0,0.42]}),
 wedge('LEAF_C',[0.52,1.02,0.22],'#4b8f2b',[0.32,2.3,0.04],{rotation:[0.1,0,-0.42]}),
 wedge('LEAF_D',[0.44,0.82,0.2],'#3f7d23',[0,2.25,0.22],{rotation:[0.28,0,0]}),
 wedge('LEAF_E',[0.4,0.9,0.2],'#3f7d23',[-0.2,2.2,-0.3],{rotation:[-0.3,0.6,0.5]}),
 wedge('LEAF_F',[0.4,0.9,0.2],'#3f7d23',[0.2,2.2,-0.3],{rotation:[-0.3,-0.6,-0.5]}),
 wedge('LEAF_G',[0.3,1.3,0.18],'#5aa637',[0,2.55,0],{rotation:[0,0.78,0]}),
]));}
// pink_donut
write('food/pink_donut.json',template('pink_donut','Donut Rosa',C,[
 torus('DOUGH',[0.76,0.3,6,12],'#d7a15e',[0,0.92,0],{rotation:[1.57,0,0]}),
 torus('GLAZE',[0.76,0.22,6,12],'#ef77b2',[0,1.06,0],{rotation:[1.57,0,0],vc:[0.15,0.85]}),
 sphere('GLAZE_DRIP',[0.1,5,4],'#ef77b2',[0.9,0.78,0.3],{scale:[0.8,1.5,0.8],vc:false}),
 ...[[-0.2,1.3,0.42,0.7,'#f2e96d'],[0.32,1.28,-0.26,-0.2,'#6ed1ff'],[0.12,1.3,-0.72,0.9,'#ffffff'],[-0.36,1.3,-0.16,0.4,'#8ae65b'],[0.7,1.28,0.2,1.2,'#f2e96d'],[-0.75,1.26,0.3,0.1,'#6ed1ff'],[0.5,1.3,0.55,2.0,'#ffffff'],[-0.1,1.3,0.8,1.5,'#8ae65b']].map(([x,y,z,r,c],i)=>cube(`SPRINKLE_${i+1}`,[0.12,0.03,0.03],c,[x,y,z],{rotation:[0,r,0],vc:false})),
]));
// pizza_slice
{const t=read('food/pizza_slice.json');const g=(n)=>t.pieces.find(p=>p.name===n);
write('food/pizza_slice.json',template('pizza_slice','Porcion Pizza',C,[
 {...g('BASE'),vertexColors:vc('#e8c181')},
 {...g('SAUCE'),vertexColors:vc('#cc4838',0.15,0.85)},
 {...g('SAUCE'),name:'CHEESE',color:'#f4d978',position:[0,0.24,-0.08],scale:[0.92,1,0.92],vertexColors:vc('#f4d978',0.1,0.9)},
 cube('CRUST',[2.02,0.26,0.26],'#c18646',[0,0.22,0.96]),
 ...[[-0.4,0.3,0.22,0.2],[0.18,0.3,0.02,0.18],[0.02,0.3,-0.46,0.18],[0.45,0.3,0.5,0.16]].map(([x,y,z,r],i)=>sphere(`PEPPERONI_${i+1}`,[r,6,4],'#a62520',[x,y,z],{scale:[1,0.2,1],vc:[0.15,0.8]})),
 cube('BASIL_1',[0.16,0.03,0.12],'#3f8f3a',[-0.1,0.31,0.0],{rotation:[0,0.4,0],vc:false}),
 cube('BASIL_2',[0.14,0.03,0.1],'#3f8f3a',[0.3,0.31,-0.3],{rotation:[0,-0.3,0],vc:false}),
 cube('CHEESE_DRIP',[0.16,0.2,0.08],'#f4db78',[0.12,0.08,-1.02],{vc:false}),
]));}
// pomegranate
write('food/pomegranate.json',template('pomegranate','Granada',C,[
 fruit('BODY','#a71d2c',1.02,{dimple:0.06}),
 cyl('CROWN_BASE',[0.22,0.3,0.2,6],'#811521',[0,2.0,0]),
 ...[[-0.18,2.18,-0.04],[0,2.24,0.06],[0.18,2.18,-0.04],[-0.06,2.14,0.16],[0.08,2.12,-0.16]].map((p,i)=>pyramid(`CROWN_${i+1}`,[0.16,0.26],'#811521',p,{rotation:[(p[2])*1.5,0,-(p[0])*1.5]})),
 sphere('SHINE',[0.14,5,4],'#e07a80',[-0.45,1.5,0.7],{scale:[1.4,0.6,1],opacity:0.6,vc:false}),
 cube('SPOT',[0.1,0.1,0.04],'#7d1522',[0.55,0.9,0.8],{vc:false}),
]));
// pretzel
write('food/pretzel.json',template('pretzel','Pretzel',C,[
 torus('OUTER',[0.92,0.16,6,12],'#b87731',[0,0.96,0],{rotation:[1.57,0,0]}),
 torus('LOOP_L',[0.38,0.13,6,10],'#b87731',[-0.44,1.28,0],{rotation:[1.57,0,0]}),
 torus('LOOP_R',[0.38,0.13,6,10],'#b87731',[0.44,1.28,0],{rotation:[1.57,0,0]}),
 cube('CROSS_L',[0.9,0.22,0.22],'#b87731',[-0.2,0.86,0],{rotation:[0,0,0.78]}),
 cube('CROSS_R',[0.9,0.22,0.22],'#b87731',[0.2,0.86,0],{rotation:[0,0,-0.78]}),
 ...[[-0.38,1.56,0.14],[0.12,1.68,0.12],[0.46,1.46,-0.12],[-0.8,0.6,0.1],[0.75,0.4,-0.1],[0,0.1,0.2]].map((p,i)=>cube(`SALT_${i+1}`,[0.1,0.04,0.04],'#f8f8f2',p,{rotation:[0,i*0.7,0],vc:false})),
 cube('BAKE_1',[0.2,0.04,0.3],'#8f5a22',[0.3,1.1,0.2],{vc:false}),
 cube('BAKE_2',[0.2,0.04,0.3],'#8f5a22',[-0.5,0.7,-0.1],{vc:false}),
]));
// ramen_bowl
write('food/ramen_bowl.json',template('ramen_bowl','Ramen',C,[
 lathe('BOWL',{points:[[0,-0.41],[0.7,-0.41],[0.86,-0.3],[1.02,0.35],[1.06,0.41]],segments:12},'#b33b2c',[0,0.41,0]),
 cyl('BOWL_FOOT',[0.6,0.6,0.08,12],shade('#b33b2c',0.75),[0,0.04,0]),
 torus('BOWL_RIM',[1.04,0.05,4,12],'#f3f4f6',[0,0.82,0],{rotation:[PI/2,0,0],vc:false}),
 cube('BOWL_STRIPE',[0.6,0.12,0.06],'#f3f4f6',[0,0.5,1.0],{vc:false}),
 cyl('BROTH',[0.96,0.96,0.12,12],'#d39d43',[0,0.76,0],{vc:[0.15,0.9]}),
 ...[[1.34,-0.14,0.12,0.84],[1.22,0.12,-0.16,0.88],[1.08,0.26,0.08,0.82],[1.0,-0.4,-0.3,0.86]].map(([w,z,r,y],i)=>cube(`NOODLE_${i+1}`,[w,0.06,0.08],'#f1df8d',[0,y,z],{rotation:[0,r,0],vc:false})),
 cyl('NARUTO',[0.18,0.18,0.08,8],'#f6f2ef',[-0.44,0.9,0.22],{vc:false}),
 sphere('NARUTO_SWIRL',[0.08,5,4],'#ec4899',[-0.44,0.96,0.22],{scale:[1,0.3,1],vc:false}),
 sphere('EGG',[0.22,8,6],'#f6f2ef',[0.4,0.88,-0.1],{scale:[1,0.5,0.8],vc:false}),
 sphere('YOLK',[0.11,6,4],'#f0c74a',[0.4,0.96,-0.1],{scale:[1,0.4,1],vc:false}),
 cube('PORK',[0.5,0.08,0.4],'#b46a4a',[0.1,0.84,0.5],{rotation:[0,0.3,0]}),
 cube('PORK_FAT',[0.5,0.04,0.1],'#f3d5c2',[0.1,0.9,0.68],{rotation:[0,0.3,0],vc:false}),
 cube('SCALLION_1',[0.08,0.04,0.08],'#4ade80',[-0.1,0.9,-0.4],{vc:false}),
 cube('SCALLION_2',[0.08,0.04,0.08],'#4ade80',[0.25,0.9,0.3],{vc:false}),
 cube('CHOPSTICK_A',[1.54,0.04,0.04],'#7e5329',[0.56,1.34,-0.12],{rotation:[0,0,0.28],vc:false}),
 cube('CHOPSTICK_B',[1.54,0.04,0.04],'#7e5329',[0.62,1.3,0.08],{rotation:[0,0,0.28],vc:false}),
]));
// salmon_nigiri
write('food/salmon_nigiri.json',template('salmon_nigiri','Nigiri Salmon',C,[
 loft('RICE',{sides:8,sections:[{y:-0.7,radiusX:0.24,radiusZ:0.38},{y:0,radiusX:0.3,radiusZ:0.44},{y:0.7,radiusX:0.24,radiusZ:0.38}]},'#f5f2ea',[0,0.3,0],{rotation:[0,0,1.57],vc:[0.05,0.9]}),
 cube('RICE_GRAIN_1',[0.08,0.05,0.05],'#ffffff',[0.5,0.3,0.45],{vc:false}),
 cube('RICE_GRAIN_2',[0.08,0.05,0.05],'#ffffff',[-0.4,0.25,-0.46],{vc:false}),
 tbox('FISH',{wb:1.56,db:0.92,wt:1.4,dt:0.8,h:0.24},'#f28558',[0,0.66,0],{rotation:[0.04,0,0]}),
 ...[[0.62,-0.18],[0.52,0.12],[0.57,-0.02]].map(([y,z],i)=>cube(`FISH_STRIPE_${i+1}`,[1.46,0.04,0.08],'#f7c5a9',[0,y+0.12,z],{rotation:[0,0,0.03],vc:false})),
 cube('NORI_BAND',[0.3,0.5,1.0],'#16201d',[0.2,0.4,0],{vc:false}),
 cube('WASABI',[0.14,0.08,0.14],'#86c45a',[0.95,0.08,0.4],{vc:false}),
]));
// strawberry
write('food/strawberry.json',template('strawberry','Fresa',C,[
 lathe('BODY',{points:[[0,-0.9],[0.3,-0.8],[0.75,-0.2],[0.92,0.35],[0.8,0.65],[0.5,0.85],[0,0.9]],segments:8},'#d73334',[0,0.92,0]),
 cyl('CALYX',[0.35,0.3,0.1,6],'#4e8c2d',[0,1.78,0]),
 ...[[0,-0.26,0.35,0],[-0.26,0.08,0.18,0.88],[0.26,0.08,0.18,-0.88],[0.2,-0.2,0.3,-0.5],[-0.2,-0.2,0.3,0.5]].map(([x,z,rx,rz],i)=>wedge(`LEAF_${['A','B','C','D','E'][i]}`,[0.5,0.16,0.3],'#4e8c2d',[x,1.82,z],{rotation:[rx,0,rz]})),
 cyl('STEM',[0.04,0.05,0.3,5],'#4e8c2d',[0,1.95,0],{vc:false}),
 ...[[-0.24,1.1,-0.72],[0.02,1.22,-0.78],[0.26,1.04,-0.68],[-0.12,0.76,-0.66],[0.18,0.8,-0.72],[-0.6,1.3,-0.4],[0.62,1.3,-0.4],[-0.5,0.8,0.5],[0.5,0.8,0.5],[0,1.2,0.82],[-0.3,0.5,0.4],[0.3,0.5,-0.4]].map((p,i)=>cube(`SEED_${i+1}`,[0.06,0.08,0.02],'#f4db73',p,{rotation:[0,Math.atan2(p[0],p[2]),0],vc:false})),
]));
// sushi_maki
write('food/sushi_maki.json',template('sushi_maki','Sushi Maki',C,[
 cyl('NORI',[0.72,0.72,0.62,10],'#16201d',[0,0.72,0],{rotation:[1.57,0,0],vc:[0.15,0.8]}),
 cyl('RICE',[0.6,0.6,0.68,10],'#f4f2ea',[0,0.72,0],{rotation:[1.57,0,0],vc:[0.05,0.92]}),
 cube('FILL_A',[0.18,0.18,0.74],'#f09f3c',[-0.12,0.82,0],{vc:false}),
 cube('FILL_B',[0.18,0.18,0.74],'#78b84c',[0.14,0.72,0],{vc:false}),
 cube('FILL_C',[0.14,0.14,0.74],'#e8d28f',[0.02,0.58,0],{vc:false}),
 cube('FILL_D',[0.12,0.12,0.74],'#e11d48',[0.14,0.9,0],{vc:false}),
 cube('SESAME_1',[0.05,0.03,0.05],'#f5e6c8',[-0.3,1.3,0.1],{vc:false}),
 cube('SESAME_2',[0.05,0.03,0.05],'#f5e6c8',[0.2,1.3,-0.1],{vc:false}),
]));
// taco
write('food/taco.json',template('taco','Taco',C,[
 cube('SHELL_L',[1.52,0.96,0.08],'#e6c45f',[-0.28,0.7,0],{rotation:[0,0,1.02]}),
 cube('SHELL_R',[1.52,0.96,0.08],'#e6c45f',[0.28,0.7,0],{rotation:[0,0,-1.02]}),
 cube('SHELL_BOTTOM',[0.5,0.08,0.96],'#e6c45f',[0,0.06,0]),
 cube('MEAT',[1.1,0.28,0.54],'#7b4022',[0,0.86,0]),
 cube('MEAT_2',[0.3,0.14,0.2],'#8a4a2a',[0.2,1.0,0.3],{rotation:[0,0.5,0],vc:false}),
 cube('LETTUCE',[1.24,0.16,0.62],'#5aa53b',[0,1.08,0]),
 wedge('LETTUCE_EDGE',[0.3,0.1,0.5],'#6fb84a',[-0.6,1.14,0.1],{rotation:[0,0,0.5]}),
 cube('TOMATO',[0.78,0.12,0.52],'#d33d36',[0,1.2,0]),
 cube('TOMATO_2',[0.18,0.12,0.18],'#d33d36',[0.45,1.22,0.1],{rotation:[0,0.7,0],vc:false}),
 cube('CHEESE',[0.92,0.08,0.52],'#f0cd48',[0,0.98,0],{vc:[0.2,0.85]}),
 cube('CHEESE_SHRED',[0.3,0.04,0.04],'#f0cd48',[-0.3,1.3,0.15],{rotation:[0,0.5,0.3],vc:false}),
 cube('CREAM',[0.4,0.06,0.3],'#f8f8f2',[0.1,1.32,-0.1],{vc:false}),
]));
// watermelon_slice
{const t=read('food/watermelon_slice.json');const g=(n)=>t.pieces.find(p=>p.name===n);
write('food/watermelon_slice.json',template('watermelon_slice','Sandia',C,[
 {...g('RIND'),vertexColors:vc('#2d7c2d')},
 {...g('RIND'),name:'RIND_STRIPE',color:'#4aa84a',scale:[1.01,0.4,1.01],vertexColors:vc('#4aa84a')},
 {...g('PITH'),vertexColors:vc('#f6f2cf',0.05,0.92)},
 {...g('FLESH'),vertexColors:vc('#d43d3a')},
 ...[[-0.42,0.36,-0.18],[0,0.38,-0.42],[0.38,0.34,-0.16],[-0.2,0.36,-0.6],[0.2,0.36,-0.6],[0,0.36,0.1],[-0.5,0.36,0.3],[0.5,0.36,0.3]].map((p,i)=>cube(`SEED_${i+1}`,[0.08,0.12,0.04],'#1c1210',p,{rotation:[0.2,0,0],vc:false})),
]));}

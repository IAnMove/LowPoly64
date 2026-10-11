import {cube,cyl,sphere,cone,pyramid,wedge,tbox,torus,capsule,lathe,loft,vc,shade,tint,read,write,template,anim,track,kf,PI} from './lib.mjs';
const C='Efectos';
// Looping particle drifts wrap back to the start; fade each drifting particle out before the
// seam so the restart reads as a fresh puff/flake instead of a jump.
function fadeSeams(anims){for(const a of anims){if(!a.loop)continue;const d=a.duration;
 const drifting=[...new Set(a.tracks.filter(t=>t.property==='position'&&JSON.stringify(t.keyframes[0].value)!==JSON.stringify(t.keyframes.at(-1).value)).map(t=>t.target))];
 for(const target of drifting){let sc=a.tracks.find(t=>t.target===target&&t.property==='scale');
  if(!sc){sc={target,property:'scale',interpolation:'linear',keyframes:[{time:0,value:[1,1,1]},{time:+(d*0.8).toFixed(3),value:[1,1,1]}]};a.tracks.push(sc);}
  else{const last=sc.keyframes.at(-1).value;sc.keyframes=sc.keyframes.filter(k=>k.time<d*0.85);sc.keyframes.push({time:+(d*0.85).toFixed(3),value:last});}
  sc.keyframes.push({time:d,value:[0.05,0.05,0.05]});}}
 return anims;}
const FADE=new Set(['effects/dust_trail.json','effects/ghost_trail.json','effects/smoke_puff.json','effects/snow_flurry.json']);
const A=(rel)=>({animations:FADE.has(rel)?fadeSeams(read(rel).animations):read(rel).animations});
const glow=(c,up=0.3,down=0.85)=>({vc:[up,down]});
// bubble_burst
write('effects/bubble_burst.json',template('bubble_burst','Burbuja',C,[
 sphere('MAIN',[0.68,10,8],'#a5f3fc',[0,0.92,0],{opacity:0.18,...glow('#a5f3fc')}),
 sphere('MAIN_RIM',[0.72,10,8],'#67e8f9',[0,0.92,0],{opacity:0.1,vc:false}),
 sphere('SHINE',[0.14,6,4],'#ffffff',[-0.26,1.28,0.36],{opacity:0.6,vc:false,scale:[1.4,0.8,1]}),
 sphere('SIDE_L',[0.24,6,5],'#cffafe',[-0.46,0.74,0.08],{opacity:0.22,vc:[0.3,0.9]}),
 sphere('SIDE_R',[0.18,6,5],'#ecfeff',[0.4,1.08,-0.12],{opacity:0.22,vc:[0.3,0.9]}),
 sphere('DROPLET',[0.08,5,4],'#cffafe',[0.5,0.5,0.3],{opacity:0.5,vc:false}),
],A('effects/bubble_burst.json')));
// dust_trail
write('effects/dust_trail.json',template('dust_trail','Estela Polvo',C,[
 sphere('PUFF_1',[0.28,6,5],'#d6c3a1',[-0.7,0.3,0],{opacity:0.34,vc:[0.2,0.8]}),
 sphere('PUFF_2',[0.34,6,5],'#c4b08c',[0,0.36,0],{opacity:0.38,vc:[0.2,0.8]}),
 sphere('PUFF_3',[0.24,6,5],'#e7d7b9',[0.58,0.26,0],{opacity:0.28,vc:[0.2,0.8]}),
 sphere('PUFF_4',[0.18,5,4],'#e7d7b9',[-1.15,0.2,0.1],{opacity:0.22,vc:[0.2,0.8]}),
 sphere('PUFF_5',[0.14,5,4],'#d6c3a1',[0.95,0.18,-0.12],{opacity:0.2,vc:[0.2,0.8]}),
 cube('GRIT_1',[0.06,0.06,0.06],'#b89b70',[-0.3,0.62,0.2],{vc:false}),
 cube('GRIT_2',[0.05,0.05,0.05],'#b89b70',[0.4,0.58,-0.16],{vc:false}),
],A('effects/dust_trail.json')));
// energy_orb
write('effects/energy_orb.json',template('energy_orb','Orbe Energia',C,[
 sphere('CORE',[0.36,8,6],'#22d3ee',[0,1.2,0],{opacity:0.88,vc:[0.4,0.8]}),
 sphere('CORE_HOT',[0.18,6,5],'#f0fdff',[0,1.2,0],{opacity:0.95,vc:false}),
 sphere('SHELL',[0.7,10,8],'#67e8f9',[0,1.2,0],{opacity:0.22,vc:[0.3,0.85]}),
 torus('RING_A',[0.82,0.06,4,14],'#a5f3fc',[0,1.2,0],{rotation:[PI/2,0,0],opacity:0.72,vc:false}),
 torus('RING_B',[0.62,0.05,4,14],'#e0f2fe',[0,1.2,0],{rotation:[0.86,0.4,0],opacity:0.68,vc:false}),
 pyramid('SPARK_1',[0.1,0.2],'#e0f2fe',[0.55,1.75,0.1],{opacity:0.8,vc:false}),
 pyramid('SPARK_2',[0.08,0.16],'#e0f2fe',[-0.6,0.7,-0.2],{rotation:[PI,0,0],opacity:0.8,vc:false}),
],A('effects/energy_orb.json')));
// explosion_burst
write('effects/explosion_burst.json',template('explosion_burst','Explosion',C,[
 sphere('CORE',[0.44,8,6],'#f97316',[0,0.8,0],{scale:[0.01,0.01,0.01],opacity:0.84,vc:[0.4,0.8]}),
 torus('RING',[0.7,0.14,4,12],'#fde047',[0,0.8,0],{rotation:[PI/2,0,0],scale:[0.01,0.01,0.01],opacity:0.72,vc:false}),
 pyramid('SHARD_A',[0.26,0.5],'#fb923c',[0,0.8,0],{vc:[0.3,0.8]}),
 pyramid('SHARD_B',[0.26,0.5],'#facc15',[0,0.8,0],{rotation:[0,0.8,0],vc:[0.3,0.8]}),
 pyramid('SHARD_C',[0.26,0.5],'#fdba74',[0,0.8,0],{rotation:[0,-0.8,0],vc:[0.3,0.8]}),
 pyramid('SHARD_D',[0.2,0.4],'#fde68a',[0.35,0.75,0.25],{rotation:[0.5,0,-0.9],vc:[0.3,0.8]}),
 pyramid('SHARD_E',[0.2,0.4],'#f97316',[-0.35,0.7,-0.2],{rotation:[-0.5,0,0.9],vc:[0.3,0.8]}),
 sphere('SMOKE_1',[0.26,6,4],'#475569',[-0.5,0.4,0.3],{opacity:0.4,vc:[0.2,0.8]}),
 sphere('SMOKE_2',[0.22,6,4],'#64748b',[0.55,0.38,-0.3],{opacity:0.4,vc:[0.2,0.8]}),
],A('effects/explosion_burst.json')));
// fire_blast
write('effects/fire_blast.json',template('fire_blast','Rafaga Fuego',C,[
 cone('FLAME_OUTER',[0.52,1.6,8],'#f97316',[0,1.02,0],{opacity:0.82,vc:[0.3,0.8]}),
 cone('FLAME_MID',[0.4,1.3,8],'#fb923c',[0,1.08,0],{opacity:0.85,vc:[0.3,0.85]}),
 cone('FLAME_INNER',[0.28,1.08,8],'#fde68a',[0,1.14,0],{opacity:0.88,vc:[0.1,0.9]}),
 cone('TONGUE_L',[0.16,0.6,6],'#f97316',[-0.4,0.8,0.1],{rotation:[0,0,0.5],opacity:0.8,vc:[0.3,0.8]}),
 cone('TONGUE_R',[0.14,0.55,6],'#fb923c',[0.38,0.75,-0.1],{rotation:[0,0,-0.55],opacity:0.8,vc:[0.3,0.8]}),
 sphere('SPARK',[0.14,6,5],'#fff7ed',[0,1.68,0],{opacity:0.82,vc:false}),
 sphere('SPARK_2',[0.07,5,4],'#fde047',[0.3,1.95,0.1],{opacity:0.8,vc:false}),
 sphere('SPARK_3',[0.06,5,4],'#fde047',[-0.25,2.05,-0.1],{opacity:0.8,vc:false}),
],A('effects/fire_blast.json')));
// ghost_trail
write('effects/ghost_trail.json',template('ghost_trail','Estela Fantasma',C,[
 sphere('TRAIL_1',[0.42,8,6],'#a5f3fc',[0,1.2,0],{opacity:0.28,vc:[0.3,0.85]}),
 sphere('TRAIL_2',[0.34,8,6],'#cffafe',[-0.58,1.02,-0.26],{opacity:0.22,vc:[0.3,0.85]}),
 sphere('TRAIL_3',[0.28,8,6],'#ecfeff',[-1.04,0.88,-0.54],{opacity:0.18,vc:[0.3,0.85]}),
 sphere('TRAIL_4',[0.2,6,5],'#ecfeff',[-1.42,0.78,-0.8],{opacity:0.14,vc:[0.3,0.85]}),
 cube('EYE_L',[0.1,0.14,0.06],'#0f172a',[-0.12,1.28,0.38],{opacity:0.5,vc:false}),
 cube('EYE_R',[0.1,0.14,0.06],'#0f172a',[0.12,1.28,0.38],{opacity:0.5,vc:false}),
 sphere('WISP',[0.08,5,4],'#ffffff',[0.3,1.6,0.1],{opacity:0.6,vc:false}),
],A('effects/ghost_trail.json')));
// healing_aura (budget: 560 -> cheaper tori)
write('effects/healing_aura.json',template('healing_aura','Aura Curacion',C,[
 torus('RING_LOW',[0.82,0.08,4,14],'#4ade80',[0,0.52,0],{rotation:[PI/2,0,0],opacity:0.7,vc:false}),
 torus('RING_HIGH',[0.58,0.06,4,14],'#86efac',[0,1.36,0],{rotation:[PI/2,0,0],opacity:0.72,vc:false}),
 sphere('GLOW',[0.54,8,6],'#dcfce7',[0,0.98,0],{scale:[1,1.5,1],opacity:0.34,vc:[0.2,0.9]}),
 sphere('SPARK',[0.12,6,5],'#f0fdf4',[0,1.72,0],{opacity:0.8,vc:false}),
 cube('CROSS_V',[0.1,0.42,0.06],'#22c55e',[0,1.0,0.3],{opacity:0.85,vc:false}),
 cube('CROSS_H',[0.42,0.1,0.06],'#22c55e',[0,1.0,0.3],{opacity:0.85,vc:false}),
 sphere('MOTE_1',[0.06,5,4],'#bbf7d0',[0.5,1.3,0.2],{opacity:0.8,vc:false}),
 sphere('MOTE_2',[0.05,5,4],'#bbf7d0',[-0.45,0.8,-0.25],{opacity:0.8,vc:false}),
 sphere('MOTE_3',[0.05,5,4],'#bbf7d0',[0.2,0.6,-0.5],{opacity:0.8,vc:false}),
],A('effects/healing_aura.json')));
// hit_flash
write('effects/hit_flash.json',template('hit_flash','Flash Impacto',C,[
 sphere('FLASH',[0.5,8,6],'#ffffff',[0,1,0],{scale:[0.01,0.01,0.01],opacity:0.76,vc:false}),
 pyramid('STAR_TOP',[0.28,0.54],'#fde68a',[0,1.84,0],{vc:[0.3,0.8]}),
 pyramid('STAR_BOTTOM',[0.28,0.54],'#fde68a',[0,0.16,0],{rotation:[PI,0,0],vc:[0.3,0.8]}),
 pyramid('STAR_LEFT',[0.28,0.54],'#fde68a',[-0.84,1,0],{rotation:[0,0,PI/2],vc:[0.3,0.8]}),
 pyramid('STAR_RIGHT',[0.28,0.54],'#fde68a',[0.84,1,0],{rotation:[0,0,-PI/2],vc:[0.3,0.8]}),
 pyramid('STAR_TL',[0.2,0.4],'#fef3c7',[-0.55,1.55,0],{rotation:[0,0,0.785],vc:[0.3,0.8]}),
 pyramid('STAR_TR',[0.2,0.4],'#fef3c7',[0.55,1.55,0],{rotation:[0,0,-0.785],vc:[0.3,0.8]}),
 pyramid('STAR_BL',[0.2,0.4],'#fef3c7',[-0.55,0.45,0],{rotation:[0,0,2.356],vc:[0.3,0.8]}),
 pyramid('STAR_BR',[0.2,0.4],'#fef3c7',[0.55,0.45,0],{rotation:[0,0,-2.356],vc:[0.3,0.8]}),
 cube('CENTER',[0.3,0.3,0.12],'#ffffff',[0,1,0],{rotation:[0,0,0.785],opacity:0.9,vc:false}),
],A('effects/hit_flash.json')));
// ice_shard_burst
write('effects/ice_shard_burst.json',template('ice_shard_burst','Rafaga Hielo',C,[
 pyramid('SHARD_A',[0.32,0.82],'#93c5fd',[0,0.6,0],{opacity:0.82,vc:[0.35,0.75]}),
 pyramid('SHARD_B',[0.28,0.74],'#bfdbfe',[0,0.6,0],{rotation:[0,0.8,0],opacity:0.8,vc:[0.35,0.75]}),
 pyramid('SHARD_C',[0.26,0.66],'#dbeafe',[0,0.6,0],{rotation:[0,-0.8,0],opacity:0.76,vc:[0.35,0.75]}),
 pyramid('SHARD_D',[0.18,0.5],'#bfdbfe',[0.4,0.45,0.2],{rotation:[0.3,0,-0.6],opacity:0.8,vc:[0.35,0.75]}),
 pyramid('SHARD_E',[0.16,0.44],'#dbeafe',[-0.38,0.42,-0.15],{rotation:[-0.2,0,0.65],opacity:0.8,vc:[0.35,0.75]}),
 sphere('MIST',[0.42,8,6],'#e0f2fe',[0,0.54,0],{scale:[1.2,0.6,1.2],opacity:0.28,vc:false}),
 cube('FROST_1',[0.1,0.1,0.1],'#ffffff',[0.55,0.2,-0.3],{rotation:[0.5,0.5,0],opacity:0.9,vc:false}),
 cube('FROST_2',[0.08,0.08,0.08],'#ffffff',[-0.5,0.16,0.35],{rotation:[0.3,0.8,0],opacity:0.9,vc:false}),
],A('effects/ice_shard_burst.json')));
// lava_geyser
write('effects/lava_geyser.json',template('lava_geyser','Geiser Lava',C,[
 cyl('CRUST',[0.72,0.86,0.18,8],'#44403c',[0,0.09,0]),
 cyl('LAVA_POOL',[0.56,0.56,0.08,8],'#f97316',[0,0.2,0],{vc:[0.3,0.8]}),
 cone('PLUME',[0.56,2.2,8],'#ea580c',[0,1.24,0],{opacity:0.82,vc:[0.3,0.8]}),
 cone('CORE',[0.28,1.6,8],'#fde047',[0,1.3,0],{opacity:0.88,vc:[0.1,0.9]}),
 sphere('BLOB_1',[0.12,5,4],'#fb923c',[0.35,2.2,0.1],{opacity:0.9,vc:[0.3,0.8]}),
 sphere('BLOB_2',[0.09,5,4],'#fde047',[-0.3,2.5,-0.1],{opacity:0.9,vc:[0.3,0.8]}),
 sphere('ROCK_L',[0.22,6,4],'#44403c',[-0.52,0.2,0.14],{scale:[1.1,0.7,1]}),
 sphere('ROCK_R',[0.22,6,4],'#57534e',[0.58,0.2,-0.08],{scale:[1,0.68,0.9]}),
 sphere('ROCK_B',[0.18,6,4],'#44403c',[0.1,0.18,-0.6],{scale:[1,0.65,1]}),
],A('effects/lava_geyser.json')));
// lightning_strike
write('effects/lightning_strike.json',template('lightning_strike','Rayo',C,[
 cube('BOLT_TOP',[0.26,1.2,0.18],'#fde047',[-0.12,2.62,0],{rotation:[0,0,0.28],vc:[0.3,0.85]}),
 cube('BOLT_MID',[0.26,1.1,0.18],'#facc15',[0.28,1.54,0],{rotation:[0,0,-0.44],vc:[0.3,0.85]}),
 cube('BOLT_LOW',[0.26,0.96,0.18],'#fde68a',[-0.06,0.56,0],{rotation:[0,0,0.34],vc:[0.3,0.85]}),
 cube('BRANCH_1',[0.14,0.6,0.12],'#fde68a',[0.45,2.35,0],{rotation:[0,0,-0.9],vc:false}),
 cube('BRANCH_2',[0.12,0.5,0.12],'#fde68a',[-0.3,1.2,0],{rotation:[0,0,0.85],vc:false}),
 cube('GLOW',[0.9,3.6,0.3],'#fef9c3',[0,1.82,0],{opacity:0.26,vc:false}),
 cyl('IMPACT',[0.5,0.5,0.04,8],'#fef3c7',[0,0.04,0],{opacity:0.7,vc:false}),
],A('effects/lightning_strike.json')));
// magic_shield (budget 456 -> ok but trim)
write('effects/magic_shield.json',template('magic_shield','Escudo Magico',C,[
 sphere('SHELL',[1.02,10,8],'#60a5fa',[0,1.2,0],{scale:[1,1.26,1],opacity:0.24,vc:[0.3,0.85]}),
 torus('RUNE_RING',[0.92,0.07,4,16],'#bfdbfe',[0,1.2,0],{rotation:[PI/2,0,0],opacity:0.76,vc:false}),
 sphere('CORE',[0.18,6,5],'#eff6ff',[0,1.2,0],{opacity:0.82,vc:false}),
 cube('RUNE_1',[0.12,0.3,0.04],'#dbeafe',[0,1.2,0.98],{opacity:0.9,vc:false}),
 cube('RUNE_2',[0.12,0.3,0.04],'#dbeafe',[0.98,1.2,0],{rotation:[0,PI/2,0],opacity:0.9,vc:false}),
 cube('RUNE_3',[0.12,0.3,0.04],'#dbeafe',[0,1.2,-0.98],{opacity:0.9,vc:false}),
 cube('RUNE_4',[0.12,0.3,0.04],'#dbeafe',[-0.98,1.2,0],{rotation:[0,PI/2,0],opacity:0.9,vc:false}),
 torus('BASE_RING',[0.7,0.05,4,12],'#93c5fd',[0,0.08,0],{rotation:[PI/2,0,0],opacity:0.6,vc:false}),
],A('effects/magic_shield.json')));
// poison_cloud
write('effects/poison_cloud.json',template('poison_cloud','Nube Veneno',C,[
 sphere('PUFF_A',[0.54,8,6],'#84cc16',[-0.42,0.72,0.12],{opacity:0.38,vc:[0.2,0.8]}),
 sphere('PUFF_B',[0.62,8,6],'#65a30d',[0.34,0.9,-0.08],{opacity:0.34,vc:[0.2,0.8]}),
 sphere('PUFF_C',[0.44,8,6],'#a855f7',[0,1.18,0.22],{opacity:0.3,vc:[0.2,0.8]}),
 sphere('CORE',[0.32,6,5],'#d9f99d',[0,0.86,0],{opacity:0.48,vc:[0.2,0.8]}),
 sphere('PUFF_D',[0.3,6,5],'#a3e635',[0.7,0.5,0.4],{opacity:0.3,vc:[0.2,0.8]}),
 sphere('BUBBLE_1',[0.1,5,4],'#d9f99d',[-0.6,1.4,0.1],{opacity:0.7,vc:false}),
 sphere('BUBBLE_2',[0.07,5,4],'#d9f99d',[0.5,1.55,-0.2],{opacity:0.7,vc:false}),
 cube('SKULL',[0.22,0.2,0.08],'#f7fee7',[0,1.1,0.6],{opacity:0.8,vc:false}),
 cube('SKULL_EYE_L',[0.05,0.05,0.04],'#365314',[-0.05,1.12,0.65],{vc:false}),
 cube('SKULL_EYE_R',[0.05,0.05,0.04],'#365314',[0.05,1.12,0.65],{vc:false}),
],A('effects/poison_cloud.json')));
// shockwave
write('effects/shockwave.json',template('shockwave','Onda Choque',C,[
 torus('RING',[0.84,0.08,4,14],'#e0f2fe',[0,0.24,0],{rotation:[PI/2,0,0],scale:[0.01,0.01,0.01],opacity:0.64,vc:false}),
 sphere('CORE',[0.32,8,6],'#bae6fd',[0,0.24,0],{scale:[0.01,0.01,0.01],opacity:0.36,vc:false}),
 cyl('DISC',[0.9,0.9,0.03,12],'#bae6fd',[0,0.05,0],{opacity:0.3,vc:false}),
 torus('RING_INNER',[0.45,0.05,4,12],'#f0f9ff',[0,0.1,0],{rotation:[PI/2,0,0],opacity:0.6,vc:false}),
 cube('DEBRIS_1',[0.08,0.08,0.08],'#94a3b8',[0.7,0.3,0.2],{rotation:[0.4,0.4,0],vc:false}),
 cube('DEBRIS_2',[0.07,0.07,0.07],'#94a3b8',[-0.6,0.36,-0.3],{rotation:[0.2,0.6,0.3],vc:false}),
],A('effects/shockwave.json')));
// slash_arc
write('effects/slash_arc.json',template('slash_arc','Arco Corte',C,[
 torus('ARC',[1,0.08,4,14],'#f8fafc',[0,1,0],{rotation:[0.8,0,0.4],scale:[1.4,1,0.26],opacity:0.72,vc:false}),
 cube('STREAK_A',[1.4,0.12,0.12],'#bae6fd',[-0.34,1.14,0.18],{rotation:[0,0.2,0.72],opacity:0.68,vc:false}),
 cube('STREAK_B',[1.2,0.1,0.1],'#e0f2fe',[0.42,0.86,-0.1],{rotation:[0,-0.2,0.58],opacity:0.62,vc:false}),
 cube('STREAK_C',[0.8,0.06,0.06],'#ffffff',[0.1,1.3,0.05],{rotation:[0,0,0.65],opacity:0.8,vc:false}),
 pyramid('TIP',[0.16,0.4],'#ffffff',[0.9,1.6,0.1],{rotation:[0,0,-0.6],opacity:0.85,vc:false}),
],A('effects/slash_arc.json')));
// smoke_puff
write('effects/smoke_puff.json',template('smoke_puff','Humo',C,[
 sphere('CLOUD_A',[0.5,8,6],'#94a3b8',[-0.36,0.7,0],{opacity:0.46,vc:[0.2,0.8]}),
 sphere('CLOUD_B',[0.62,8,6],'#cbd5e1',[0.24,0.9,0.18],{opacity:0.4,vc:[0.2,0.8]}),
 sphere('CLOUD_C',[0.44,8,6],'#e2e8f0',[0.18,0.54,-0.28],{opacity:0.34,vc:[0.2,0.8]}),
 sphere('CLOUD_D',[0.3,6,5],'#e2e8f0',[-0.2,1.3,0.1],{opacity:0.28,vc:[0.2,0.8]}),
 sphere('CLOUD_E',[0.22,6,5],'#f1f5f9',[0.5,1.45,-0.1],{opacity:0.22,vc:[0.2,0.8]}),
],A('effects/smoke_puff.json')));
// snow_flurry
write('effects/snow_flurry.json',template('snow_flurry','Ventisca',C,[
 cube('FLAKE_1',[0.12,0.12,0.12],'#ffffff',[-0.62,2.1,0.18],{rotation:[0.6,0.6,0],vc:false}),
 cube('FLAKE_2',[0.12,0.12,0.12],'#e0f2fe',[0.26,1.72,-0.22],{rotation:[0.3,0.8,0.2],vc:false}),
 cube('FLAKE_3',[0.12,0.12,0.12],'#ffffff',[0.74,2.34,0.12],{rotation:[0.5,0.2,0.5],vc:false}),
 cube('FLAKE_4',[0.12,0.12,0.12],'#e0f2fe',[-0.18,1.42,-0.3],{rotation:[0.2,0.5,0.7],vc:false}),
 cube('FLAKE_5',[0.09,0.09,0.09],'#ffffff',[0.1,2.6,0.3],{rotation:[0.4,0.4,0.4],vc:false}),
 cube('FLAKE_6',[0.09,0.09,0.09],'#f0f9ff',[-0.9,1.3,0.0],{rotation:[0.7,0.1,0.3],vc:false}),
 cube('FLAKE_7',[0.08,0.08,0.08],'#ffffff',[0.55,1.1,0.35],{rotation:[0.2,0.9,0.1],vc:false}),
 sphere('MIST',[0.78,8,6],'#e0f2fe',[0,1.2,0],{scale:[1.3,0.7,1.3],opacity:0.16,vc:false}),
 cube('DRIFT',[1.4,0.08,0.9],'#f8fafc',[0,0.04,0],{opacity:0.6,vc:false}),
],A('effects/snow_flurry.json')));
// sparkle_ring
write('effects/sparkle_ring.json',template('sparkle_ring','Anillo Brillos',C,[
 torus('RING',[0.88,0.06,4,16],'#fde68a',[0,1,0],{rotation:[PI/2,0,0],opacity:0.76,vc:false}),
 pyramid('SPARK_N',[0.22,0.34],'#fff7ed',[0,1.82,0],{vc:[0.3,0.85]}),
 pyramid('SPARK_S',[0.22,0.34],'#fff7ed',[0,0.18,0],{rotation:[PI,0,0],vc:[0.3,0.85]}),
 pyramid('SPARK_L',[0.22,0.34],'#fff7ed',[-0.82,1,0],{rotation:[0,0,PI/2],vc:[0.3,0.85]}),
 pyramid('SPARK_R',[0.22,0.34],'#fff7ed',[0.82,1,0],{rotation:[0,0,-PI/2],vc:[0.3,0.85]}),
 pyramid('SPARK_F',[0.18,0.28],'#fde68a',[0,1,0.82],{rotation:[-PI/2,0,0],vc:[0.3,0.85]}),
 pyramid('SPARK_B',[0.18,0.28],'#fde68a',[0,1,-0.82],{rotation:[PI/2,0,0],vc:[0.3,0.85]}),
 sphere('CENTER',[0.1,6,5],'#ffffff',[0,1,0],{opacity:0.8,vc:false}),
],A('effects/sparkle_ring.json')));
// teleport_column
write('effects/teleport_column.json',template('teleport_column','Columna Teleport',C,[
 cyl('COLUMN',[0.54,0.7,2.8,10],'#67e8f9',[0,1.4,0],{opacity:0.28,vc:[0.3,0.85]}),
 cyl('PAD',[0.84,0.9,0.12,10],'#164e63',[0,0.06,0]),
 cyl('PAD_GLOW',[0.72,0.72,0.04,10],'#a5f3fc',[0,0.14,0],{opacity:0.7,vc:false}),
 torus('RING_LOW',[0.7,0.08,4,14],'#22d3ee',[0,0.38,0],{rotation:[PI/2,0,0],opacity:0.76,vc:false}),
 torus('RING_HIGH',[0.54,0.06,4,14],'#a5f3fc',[0,2.36,0],{rotation:[PI/2,0,0],opacity:0.72,vc:false}),
 sphere('CORE',[0.22,6,5],'#ecfeff',[0,1.1,0],{opacity:0.86,vc:false}),
 cube('MOTE_1',[0.07,0.07,0.07],'#ecfeff',[0.35,0.9,0.2],{opacity:0.8,vc:false}),
 cube('MOTE_2',[0.06,0.06,0.06],'#ecfeff',[-0.3,1.9,-0.2],{opacity:0.8,vc:false}),
],A('effects/teleport_column.json')));
// water_splash
write('effects/water_splash.json',template('water_splash','Salpicar Agua',C,[
 torus('RING',[0.62,0.08,4,14],'#7dd3fc',[0,0.18,0],{rotation:[PI/2,0,0],scale:[0.01,0.01,0.01],opacity:0.66,vc:false}),
 cyl('PUDDLE',[0.7,0.7,0.03,10],'#38bdf8',[0,0.03,0],{opacity:0.5,vc:false}),
 sphere('DROP_A',[0.16,6,5],'#bae6fd',[0,0.2,0],{opacity:0.8,vc:[0.3,0.85]}),
 sphere('DROP_B',[0.14,6,5],'#e0f2fe',[0,0.2,0],{opacity:0.78,vc:[0.3,0.85]}),
 sphere('DROP_C',[0.12,6,5],'#e0f2fe',[0,0.2,0],{opacity:0.76,vc:[0.3,0.85]}),
 cone('SPOUT',[0.2,0.7,6],'#bae6fd',[0,0.4,0],{opacity:0.5,vc:[0.3,0.85]}),
],A('effects/water_splash.json')));

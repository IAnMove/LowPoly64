import {cube,cyl,sphere,cone,pyramid,wedge,tbox,torus,capsule,lathe,loft,vc,shade,tint,read,write,template,anim,track,kf,PI} from './lib.mjs';
const C='Mobiliario';
// altar
{
 const t=read('furniture/altar.json'); const s1='#475569',s2='#64748b',s3='#94a3b8';
 write('furniture/altar.json',template('altar','Altar',C,[
  tbox('BASE',{wb:3.2,db:2.4,wt:2.8,dt:2.0,h:0.5},s1,[0,0.25,0]),
  cube('BODY',[2.2,1.2,1.6],s2,[0,1.1,0]),
  cube('BODY_PANEL_F',[1.5,0.7,0.1],shade(s2,0.75),[0,1.1,0.78]),
  cube('BODY_PANEL_B',[1.5,0.7,0.1],shade(s2,0.75),[0,1.1,-0.78]),
  cube('BODY_PANEL_L',[0.1,0.7,1.0],shade(s2,0.75),[-1.08,1.1,0]),
  cube('BODY_PANEL_R',[0.1,0.7,1.0],shade(s2,0.75),[1.08,1.1,0]),
  cube('TOP',[3,0.2,2.2],s3,[0,1.82,0]),
  cube('TOP_TRIM',[3.1,0.06,2.3],shade(s3,0.8),[0,1.7,0]),
  cyl('CANDLE_L',[0.09,0.09,0.5,6],'#fef3c7',[-1.1,2.17,0.6]),
  cone('FLAME_L',[0.07,0.2,5],'#fbbf24',[-1.1,2.52,0.6],{vc:[0.3,0.9]}),
  cyl('CANDLE_R',[0.09,0.09,0.4,6],'#fef3c7',[1.1,2.12,-0.5]),
  cone('FLAME_R',[0.07,0.2,5],'#fbbf24',[1.1,2.42,-0.5],{vc:[0.3,0.9]}),
  cyl('CRYSTAL_SOCKET',[0.28,0.34,0.14,6],shade(s1,0.9),[0,1.99,0]),
  pyramid('CRYSTAL',[0.5,0.9],'#67e8f9',[0,2.46,0],{opacity:0.82,vc:[0.35,0.7]}),
 ],{animations:t.animations}));
}
// bed
{
 const wood='#8b4513',sheet='#ffffff',blanket='#b91c1c',pillow='#f1f5f9';
 write('furniture/bed.json',template('bed','Cama',C,[
  cube('FRAME',[3.2,0.4,5.2],wood,[0,0.6,0]),
  cube('MATTRESS',[3,0.6,5],sheet,[0,1.1,0]),
  cube('BLANKET',[3.1,0.3,3.2],blanket,[0,1.5,0.9]),
  cube('BLANKET_FOLD',[3.1,0.12,0.4],tint(blanket,0.2),[0,1.68,-0.6]),
  cube('PILLOW',[2.4,0.36,0.9],pillow,[0,1.56,-1.8],{rotation:[0.12,0,0]}),
  cube('HEADBOARD',[3.2,2,0.3],wood,[0,1.4,-2.5]),
  cube('HEADBOARD_RAIL',[3.4,0.24,0.4],tint(wood,0.1),[0,2.45,-2.5]),
  cube('HEADBOARD_PANEL',[2.4,0.9,0.08],shade(wood,0.8),[0,1.5,-2.32]),
  cube('FOOTBOARD',[3.2,0.9,0.24],wood,[0,0.85,2.5]),
  cube('FOOTBOARD_RAIL',[3.4,0.2,0.34],tint(wood,0.1),[0,1.35,2.5]),
  cyl('LEG_1',[0.18,0.22,0.4,6],'#555555',[-1.4,0.2,-2.3]),
  cyl('LEG_2',[0.18,0.22,0.4,6],'#555555',[1.4,0.2,-2.3]),
  cyl('LEG_3',[0.18,0.22,0.4,6],'#555555',[-1.4,0.2,2.3]),
  cyl('LEG_4',[0.18,0.22,0.4,6],'#555555',[1.4,0.2,2.3]),
 ]));
}
// bench
{
 const wood='#8b5a2b',dark='#6f451f';
 write('furniture/bench.json',template('bench','Banco',C,[
  cube('SEAT',[3.2,0.22,0.46],wood,[0,1.1,0.26]),
  cube('SEAT_2',[3.2,0.22,0.46],wood,[0,1.1,-0.26]),
  cube('BACK',[3.2,0.22,0.16],wood,[0,2.0,-0.46],{rotation:[0.2,0,0]}),
  cube('BACK_2',[3.2,0.2,0.16],wood,[0,1.6,-0.4],{rotation:[0.2,0,0]}),
  cube('BACK_POST_L',[0.18,1.2,0.18],dark,[-1.3,1.6,-0.42],{rotation:[0.2,0,0]}),
  cube('BACK_POST_R',[0.18,1.2,0.18],dark,[1.3,1.6,-0.42],{rotation:[0.2,0,0]}),
  tbox('LEG_L',{wb:0.26,db:1.0,wt:0.22,dt:0.9,h:1.1},dark,[-1.3,0.55,0]),
  tbox('LEG_R',{wb:0.26,db:1.0,wt:0.22,dt:0.9,h:1.1},dark,[1.3,0.55,0]),
  cube('STRETCHER',[2.5,0.14,0.14],dark,[0,0.4,0]),
  cube('ARM_L',[0.14,0.14,0.9],tint(wood,0.1),[-1.4,1.55,0.05]),
  cube('ARM_R',[0.14,0.14,0.9],tint(wood,0.1),[1.4,1.55,0.05]),
 ]));
}
// bookshelf
{
 const wood='#8b4513',shelf='#a0522d',back='#5c2e0e';
 const bookColors=['#b91c1c','#1d4ed8','#15803d','#ca8a04','#7c3aed','#0e7490','#9f1239','#065f46'];
 const books=[];let k=0;
 const rows=[[0.6,1.0],[1.6,0.9],[2.6,0.8]];
 for(const [y,h] of rows){let x=-1.25;let i=0;while(x<1.0&&i<6){const w=0.22+((k*7)%3)*0.08;const hh=h*(0.8+((k*5)%3)*0.1);books.push(cube(`BOOK_${k+1}`,[w,hh,1.1],bookColors[k%bookColors.length],[x+w/2,y+hh/2,0.05],{rotation:[0,0,(k%4===3)?-0.12:0]}));x+=w+0.04;i++;k++;}}
 write('furniture/bookshelf.json',template('bookshelf','Estanteria',C,[
  cube('BACK_PANEL',[3,4,0.08],back,[0,2,-0.7]),
  cube('SIDE_L',[0.3,4,1.5],wood,[-1.5,2,0]),
  cube('SIDE_R',[0.3,4,1.5],wood,[1.5,2,0]),
  cube('SHELF_1',[3,0.2,1.5],shelf,[0,0.5,0]),
  cube('SHELF_2',[3,0.2,1.5],shelf,[0,1.5,0]),
  cube('SHELF_3',[3,0.2,1.5],shelf,[0,2.5,0]),
  cube('SHELF_4',[3,0.2,1.5],shelf,[0,3.5,0]),
  cube('TOP',[3.3,0.24,1.7],wood,[0,4.05,0]),
  cube('PLINTH',[3.3,0.3,1.6],shade(wood,0.8),[0,0.15,0]),
  ...books,
  sphere('VASE',[0.22,6,5],'#0ea5e9',[0.9,3.86,0.2],{scale:[1,1.3,1]}),
 ]));
}
// cabinet
{
 const t=read('furniture/cabinet.json'); const wood='#8b5a2b',door='#9b6a34';
 write('furniture/cabinet.json',template('cabinet','Armario',C,[
  cube('BODY',[2.2,3.6,1.2],wood,[0,1.8,0]),
  cube('PLINTH',[2.3,0.28,1.3],shade(wood,0.75),[0,0.14,0]),
  cube('CROWN',[2.4,0.2,1.4],tint(wood,0.1),[0,3.68,0]),
  cube('DOOR_L',[1.04,3.2,0.08],door,[-0.54,1.8,0.62],{pivot:[-1.06,1.8,0.62]}),
  cube('DOOR_L_PANEL',[0.7,2.4,0.04],shade(door,0.85),[-0.54,1.8,0.68],{parent:'DOOR_L',pivot:[-1.06,1.8,0.62]}),
  cube('DOOR_R',[1.04,3.2,0.08],door,[0.54,1.8,0.62],{pivot:[1.06,1.8,0.62]}),
  cube('DOOR_R_PANEL',[0.7,2.4,0.04],shade(door,0.85),[0.54,1.8,0.68],{parent:'DOOR_R',pivot:[1.06,1.8,0.62]}),
  sphere('KNOB_L',[0.08,6,5],'#fbbf24',[-0.12,1.75,0.72],{parent:'DOOR_L',pivot:[-1.06,1.8,0.62],vc:[0.3,0.8]}),
  sphere('KNOB_R',[0.08,6,5],'#fbbf24',[0.12,1.75,0.72],{parent:'DOOR_R',pivot:[1.06,1.8,0.62],vc:[0.3,0.8]}),
  cube('HINGE_L_TOP',[0.06,0.3,0.06],'#4b5563',[-1.1,3.1,0.62],{vc:false}),
  cube('HINGE_L_BOT',[0.06,0.3,0.06],'#4b5563',[-1.1,0.6,0.62],{vc:false}),
  cube('HINGE_R_TOP',[0.06,0.3,0.06],'#4b5563',[1.1,3.1,0.62],{vc:false}),
  cube('HINGE_R_BOT',[0.06,0.3,0.06],'#4b5563',[1.1,0.6,0.62],{vc:false}),
 ],{animations:t.animations}));
}
// chair
{
 const seat='#ffcc00',wood='#8b4513';
 write('furniture/chair.json',template('chair','Silla',C,[
  cube('SEAT',[3,0.3,3],seat,[0,1,0]),
  cube('SEAT_FRAME',[3.1,0.16,3.1],wood,[0,0.8,0]),
  cube('BACKREST',[0.4,0.5,3],seat,[-1.3,3.75,0]),
  cube('BACK_SLAT_1',[0.3,2.4,0.4],wood,[-1.3,2.3,-1.0]),
  cube('BACK_SLAT_2',[0.3,2.4,0.4],wood,[-1.3,2.3,0]),
  cube('BACK_SLAT_3',[0.3,2.4,0.4],wood,[-1.3,2.3,1.0]),
  cube('BACK_RAIL',[0.3,0.24,3],wood,[-1.3,1.5,0]),
  cyl('LEG_1',[0.18,0.24,1,6],wood,[-1.2,0.5,-1.2]),
  cyl('LEG_2',[0.18,0.24,1,6],wood,[1.2,0.5,-1.2]),
  cyl('LEG_3',[0.18,0.24,1,6],wood,[-1.2,0.5,1.2]),
  cyl('LEG_4',[0.18,0.24,1,6],wood,[1.2,0.5,1.2]),
  cube('STRETCHER_F',[0.12,0.12,2.4],shade(wood,0.9),[1.2,0.35,0]),
  cube('STRETCHER_B',[0.12,0.12,2.4],shade(wood,0.9),[-1.2,0.35,0]),
 ]));
}
// desk
{
 const top='#a0522d',wood='#8b4513';
 write('furniture/desk.json',template('desk','Escritorio',C,[
  cube('TOP',[4,0.3,2],top,[0,2.2,0]),
  cube('TOP_EDGE',[4.1,0.1,2.1],shade(top,0.85),[0,2.0,0]),
  cube('SIDE_L',[0.3,2,2],wood,[-1.85,1.0,0]),
  cube('SIDE_R',[0.3,2,2],wood,[1.85,1.0,0]),
  cube('BACK_PANEL',[3.4,1.4,0.1],shade(wood,0.8),[0,1.3,-0.9]),
  cube('DRAWER',[1.5,0.6,1.8],wood,[1,1.6,0]),
  cube('DRAWER_FRONT',[1.3,0.44,0.08],tint(wood,0.08),[1,1.6,0.94]),
  cube('DRAWER_2',[1.5,0.6,1.8],wood,[1,0.9,0]),
  cube('DRAWER_FRONT_2',[1.3,0.44,0.08],tint(wood,0.08),[1,0.9,0.94]),
  cube('HANDLE_1',[0.4,0.08,0.08],'#fbbf24',[1,1.6,1.0],{vc:[0.3,0.8]}),
  cube('HANDLE_2',[0.4,0.08,0.08],'#fbbf24',[1,0.9,1.0],{vc:[0.3,0.8]}),
  cube('FOOT_L',[0.4,0.14,2.1],shade(wood,0.75),[-1.85,0.07,0]),
  cube('FOOT_R',[0.4,0.14,2.1],shade(wood,0.75),[1.85,0.07,0]),
  cyl('INKWELL',[0.14,0.16,0.26,6],'#1e293b',[-1.2,2.48,-0.5]),
  cube('PAPER',[0.9,0.03,1.2],'#f8fafc',[-0.4,2.37,0.2],{rotation:[0,0.15,0],vc:false}),
 ]));
}
// stool
{
 const seat='#a0522d',wood='#8b4513';
 const legs=[];const pts=[[-0.6,-0.6],[0.6,-0.6],[-0.6,0.6],[0.6,0.6]];
 pts.forEach(([x,z],i)=>legs.push(cyl(`LEG_${i+1}`,[0.13,0.2,1.55,6],wood,[x*1.08,0.75,z*1.08],{rotation:[z*0.14,0,-x*0.14],pivot:[x*1.08,1.4,z*1.08]})));
 write('furniture/stool.json',template('stool','Taburete',C,[
  cyl('SEAT',[1,1,0.3,8],seat,[0,1.5,0]),
  cyl('SEAT_RIM',[1.06,0.96,0.1,8],shade(seat,0.85),[0,1.32,0]),
  cyl('SEAT_CUSHION',[0.86,0.9,0.1,8],tint(seat,0.1),[0,1.7,0]),
  ...legs,
  cube('STRETCHER_X',[1.3,0.1,0.1],shade(wood,0.9),[0,0.55,-0.63]),
  cube('STRETCHER_X2',[1.3,0.1,0.1],shade(wood,0.9),[0,0.55,0.63]),
  cube('STRETCHER_Z',[0.1,0.1,1.3],shade(wood,0.9),[-0.63,0.5,0]),
  cube('STRETCHER_Z2',[0.1,0.1,1.3],shade(wood,0.9),[0.63,0.5,0]),
 ]));
}
// table
{
 const top='#ffcc00',wood='#8b4513';
 write('furniture/table.json',template('table','Mesa',C,[
  cube('TABLETOP',[5,0.4,5],top,[0,2.5,0]),
  cube('APRON_N',[4.6,0.4,0.2],wood,[0,2.1,-2.1]),
  cube('APRON_S',[4.6,0.4,0.2],wood,[0,2.1,2.1]),
  cube('APRON_E',[0.2,0.4,4.6],wood,[2.1,2.1,0]),
  cube('APRON_W',[0.2,0.4,4.6],wood,[-2.1,2.1,0]),
  tbox('LEG_1',{wb:0.34,wt:0.46,h:2.3},wood,[-2,1.15,-2]),
  tbox('LEG_2',{wb:0.34,wt:0.46,h:2.3},wood,[2,1.15,-2]),
  tbox('LEG_3',{wb:0.34,wt:0.46,h:2.3},wood,[-2,1.15,2]),
  tbox('LEG_4',{wb:0.34,wt:0.46,h:2.3},wood,[2,1.15,2]),
  cube('CLOTH',[3.2,0.06,3.2],'#f8fafc',[0,2.73,0],{rotation:[0,0.785,0]}),
 ]));
}

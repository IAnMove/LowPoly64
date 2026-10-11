import fs from 'node:fs';
const MAP={
 'architecture/floating_platform.json':{TILE_LINE_1:'TOP_TILE',TILE_LINE_2:'TOP_TILE',CORNER_1:'PLATFORM',CORNER_2:'PLATFORM',CORNER_3:'PLATFORM',CORNER_4:'PLATFORM',UNDERSIDE:'PLATFORM'},
 'effects/bubble_burst.json':{MAIN_RIM:'MAIN',SHINE:'MAIN'},
 'effects/energy_orb.json':{CORE_HOT:'CORE'},
 'effects/fire_blast.json':{FLAME_MID:'FLAME_OUTER',TONGUE_L:'FLAME_OUTER',TONGUE_R:'FLAME_OUTER'},
 'effects/ghost_trail.json':{EYE_L:'TRAIL_1',EYE_R:'TRAIL_1',WISP:'TRAIL_1'},
 'effects/lava_geyser.json':{BLOB_1:'PLUME',BLOB_2:'PLUME'},
 'effects/lightning_strike.json':{BRANCH_1:'BOLT_TOP',BRANCH_2:'BOLT_MID'},
 'effects/magic_shield.json':{RUNE_1:'SHELL',RUNE_2:'SHELL',RUNE_3:'SHELL',RUNE_4:'SHELL'},
 'effects/poison_cloud.json':{BUBBLE_1:'PUFF_A',BUBBLE_2:'PUFF_B'},
 'effects/slash_arc.json':{STREAK_C:'ARC',TIP:'ARC'},
 'effects/smoke_puff.json':{CLOUD_D:'CLOUD_A',CLOUD_E:'CLOUD_B'},
 'monsters/bat.json':{BELLY:'BODY'},
 'monsters/ghost.json':{TAIL_WISP_L:'TAIL',TAIL_WISP_R:'TAIL',TAIL_DROP:'TAIL',HOOD_FOLD:'BODY',GLOW:'BODY'},
 'monsters/masked_critter.json':{BELLY:'BODY'},
 'monsters/spiked_beetle.json':{SHELL_SPLIT:'SHELL',SPIKE_BL:'SHELL',SPIKE_BR:'SHELL',SPIKE_BACK:'SHELL',SPIKE_TOP:'SHELL',SPIKE_L:'SHELL',SPIKE_R:'SHELL',SHELL_RIM:'BODY',HEAD:'BODY',MANDIBLE_L:'HEAD',MANDIBLE_R:'HEAD',ANTENNA_L:'HEAD',ANTENNA_R:'HEAD'},
 'props/bomb.json':{HIGHLIGHT:'BODY',CAP_RING:'BODY',FUSE_TIP:'FUSE',SPARK_2:'SPARK'},
 'props/breakable_tablet.json':{RUNE_BAR:'RUNE',RUNE_DOT:'RUNE',CRACK:'TABLET_LEFT',CRACK_2:'TABLET_LEFT'},
 'props/bumper.json':{PAD_STRIPE:'PAD'},
 'props/campfire.json':{FLAME_SIDE:'FLAME_OUTER'},
 'props/pressure_plate.json':{GLYPH_BAR:'GLYPH',GLYPH_BAR_2:'GLYPH'},
 'props/spring_pad.json':{SPRING_COIL_1:'SPRING',SPRING_COIL_2:'SPRING',SPRING_COIL_3:'SPRING',TOP_STRIPE:'TOP'},
};
for(const [rel,map] of Object.entries(MAP)){const f='src/data/templates/'+rel;const t=JSON.parse(fs.readFileSync(f));const names=new Set(t.pieces.map(p=>p.name));let n=0;
 for(const p of t.pieces){const par=map[p.name];if(par&&names.has(par)&&p.parent!==par){p.parent=par;n++;}}
 fs.writeFileSync(f,JSON.stringify(t,null,2)+'\n');console.log(rel,'reparented',n);}
// checkpoint crystal back to animated rest height, drop pole cap that would clip it
{const f='src/data/templates/props/checkpoint.json';const t=JSON.parse(fs.readFileSync(f));t.pieces=t.pieces.filter(p=>p.name!=='POLE_CAP');const c=t.pieces.find(p=>p.name==='CRYSTAL');c.position=[0,4.1,0];fs.writeFileSync(f,JSON.stringify(t,null,2)+'\n');console.log('checkpoint crystal fixed');}

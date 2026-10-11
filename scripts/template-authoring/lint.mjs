import fs from 'node:fs'; import path from 'node:path';
const root='src/data/templates';
const only=process.argv.slice(2);
const files=[];
(function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name); if(e.isDirectory())walk(p); else if(e.name.endsWith('.json'))files.push(p);}})(root);
const KNOWN=new Set(['cube','sphere','cylinder','cone','plane','capsule','torus','wedge','pyramid','taperedbox','tapered_box','limbloft','limb_loft','lathe','custom','mesh','label','prism']);
function tris(g){const t=(g.type||'').toLowerCase(),p=g.params||{};
 switch(t){case 'cube':return 12;case 'plane':return 2;case 'wedge':return 8;case 'pyramid':return 6;case 'taperedbox':case 'tapered_box':return 12;
 case 'sphere':{const w=p.widthSegments??8,h=p.heightSegments??6;return 2*w*(h-1);}
 case 'cylinder':{const r=p.radialSegments??8;const caps=((p.radiusTop??1)>0?r:0)+((p.radiusBottom??1)>0?r:0);return 2*r+caps;}
 case 'cone':{const r=p.radialSegments??8;return 2*r;}
 case 'capsule':{const r=p.radialSegments??8,c=p.capSegments??4;return r*2*(c*2+1);}
 case 'torus':{return 2*(p.radialSegments??4)*(p.tubularSegments??8);}
 case 'limbloft':case 'limb_loft':{const s=p.sides??6,n=(p.sections?.length??2);return 2*s*(n-1)+2*s;}
 case 'lathe':{return 2*(p.segments??8)*((p.points?.length??4)-1);}
 case 'custom':case 'mesh':return (g.faces||p.faces||[]).length;
 case 'label':return 0; default:return 0;}}
function halfH(g){const t=(g.type||'').toLowerCase(),p=g.params||{};switch(t){case 'cube':case 'wedge':case 'pyramid':case 'taperedbox':case 'tapered_box':return (p.height??2)/2;case 'sphere':return p.radius??1;case 'cylinder':return (p.height??2)/2;case 'cone':return (p.height??2)/2;case 'capsule':return (p.length??2)/2+(p.radius??0.8);case 'torus':return (p.radius??1)+(p.tube??0.1);case 'plane':return (p.height??3)/2;default:return 0;}}
let total=0,flagged=0;
for(const f of files.sort()){ if(only.length&&!only.some(o=>f.includes(o)))continue; total++;
 const t=JSON.parse(fs.readFileSync(f,'utf8')); const issues=[];
 if(t.archetype&&Array.isArray(t.slots)){ /* CharacterModel: shallow checks */
  const names=t.slots.flatMap(s=>(s.pieces||[]).map(p=>p.name)); const dup=names.filter((n,i)=>names.indexOf(n)!==i); if(dup.length)issues.push('dup:'+dup.join(','));
  if(issues.length){flagged++;console.log(path.relative(root,f)+'  [CM] '+issues.join(' | '));} continue; }
 const pieces=t.pieces||[]; const names=new Map(); let T=0,minY=Infinity; const colors=new Set(); let noVC=0;
 pieces.forEach((p,i)=>{ if(Array.isArray(p)){issues.push(`piece[${i}] is an ARRAY`);return;}
  if(!p.name)issues.push(`piece[${i}] no name`); else {names.set(p.name,(names.get(p.name)||0)+1);}
  const g=p.geometry||{}; const ty=(g.type||'').toLowerCase(); if(!KNOWN.has(ty))issues.push(`${p.name}: unknown geometry "${g.type}"`);
  T+=tris(g); if(p.color)colors.add(p.color.toLowerCase());
  if(!p.vertexColors&&!p.faceColors&&ty!=='label'&&ty!=='plane'&&!p.texture)noVC++;
  const sy=Array.isArray(p.scale)?p.scale[1]:(typeof p.scale==='number'?p.scale:1);
  if(Array.isArray(p.position)&&ty!=='label'){const y=p.position[1]-halfH(g)*sy; if(y<minY)minY=y;}
 });
 for(const [n,c] of names) if(c>1)issues.push(`dup name ${n}x${c}`);
 for(const p of pieces){ if(!Array.isArray(p)&&p.parent&&!names.has(p.parent))issues.push(`${p.name}: parent "${p.parent}" missing`);}
 for(const a of t.animations||[]){for(const tr of a.tracks||[]){if(!names.has(tr.target))issues.push(`anim ${a.name}: target "${tr.target}" missing`);}}
 if(T>800)issues.push(`tris ${T}>800`); if(colors.size>32)issues.push(`colors ${colors.size}>32`);
 if(minY<-0.05)issues.push(`minY ${minY.toFixed(2)}`);
 const summary=`${pieces.length}p ${T}t ${colors.size}c noVC=${noVC}`;
 if(issues.length||process.env.VERBOSE){flagged++;console.log(path.relative(root,f).padEnd(48)+summary.padEnd(28)+issues.join(' | '));}
}
console.error(`lint: ${total} templates, ${flagged} with issues/listed`);

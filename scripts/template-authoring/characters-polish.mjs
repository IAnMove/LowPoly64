// Gradient-contract conversion + light polish for character templates that are NOT redesigned
// by a dedicated script. Reads the pinned source (absolute colors) so reruns are idempotent.
import fs from 'node:fs';
import {vc,read,write,relTemplateColors} from './lib.mjs';
export const CARVE_OUT=/_reference_cm|_mold_cm|_study_cm|voxel_test|n64_elf_hero_cm|capture_humanoid|n64_simple_villager_cm/;
const skip=new Set(process.argv.slice(2)); // ids redesigned elsewhere
const rels=[...fs.readdirSync('src/data/templates/characters').filter(f=>f.endsWith('.json')).map(f=>'characters/'+f),'props/car_cm.json'];
for(const rel of rels){const name=rel.split('/').pop(); const id=name.replace(/\.json$/,'');
 if(CARVE_OUT.test(name)||skip.has(id))continue;
 const t=relTemplateColors(read(rel)); let added=0; const fixed=[];
 const polish=(pc,color)=>{const ty=(pc.geometry?.type||pc.template||'').toLowerCase(); if(['label','plane'].includes(ty)||pc.texture||pc.decal||pc.opacity!=null)return; if(!pc.vertexColors&&!pc.faceColors&&color){pc.vertexColors=vc(color,0.12,0.84);added++;}};
 if(t.slots){for(const s of t.slots)for(const pc of s.pieces||[])polish(pc,pc.material);} else {for(const pc of t.pieces||[])polish(pc,pc.color);}
 const names=new Set((t.pieces||[]).map(x=>x.name));
 for(const a of t.animations||[]){const n=a.tracks.length;a.tracks=a.tracks.map(tr=>names.has(tr.target)||!t.pieces?tr:(tr.target==='NOSE'&&names.has('SNOUT')?{...tr,target:'SNOUT'}:null)).filter(Boolean);if(a.tracks.length!==n)fixed.push(a.name);}
 if(id==='mocap_human')for(const pc of t.pieces){if(pc.geometry?.type==='capsule'){pc.geometry.params.radialSegments=6;pc.geometry.params.capSegments=2;}}
 write(rel,t); if(fixed.length)console.log('  fixed clips',id,fixed.join(','));
}

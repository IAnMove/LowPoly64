import fs from 'node:fs';
for(const f of process.argv.slice(2)){const t=JSON.parse(fs.readFileSync(f));
 console.log(`### ${f.split('/').pop()} id=${t.id} arch=${t.archetype} prof=${t.animationProfile} skel=${t.skeletonId} bindings=${JSON.stringify(t.slotBindings||null)}`);
 console.log('  anims='+(t.animations||[]).map(a=>a.name+'['+a.duration+'](' +a.tracks.map(x=>x.target+'.'+x.property[0]).join(',')+')').join(' '));
 for(const s of t.slots){console.log('  ['+s.slotId+']');for(const p of s.pieces)console.log(`   - ${p.name} ${p.template} ${JSON.stringify(p.size)} @${JSON.stringify(p.offset)} ${p.material}${p.parent?' par='+p.parent:''}${p.pivot?' piv'+JSON.stringify(p.pivot):''}${p.rotation?' rot'+JSON.stringify(p.rotation):''}${p.params?' params'+JSON.stringify(p.params).slice(0,60):''}${p.opacity!=null?' op'+p.opacity:''}`);}}

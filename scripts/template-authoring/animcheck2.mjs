// Real "pop" detector for template-owned clips.
// Track rest = piece pivot (or position) relative to the parent's pivot; explicit humanoid
// rigs may also author root-space values, so either convention is accepted.
import fs from 'node:fs'; import path from 'node:path';
const ROOT='src/data/templates'; const only=process.argv.slice(2);
const NON_REST_START=/release|reset|close|return|recover/i;
const files=[];(function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(p.endsWith('.json'))files.push(p);}})(ROOT);
const dist=(a,b)=>Math.max(...a.map((v,i)=>Math.abs(v-(b[i]??0))));
let total=0;
for(const f of files.sort()){ if(only.length&&!only.some(o=>f.includes(o)))continue;
 const t=JSON.parse(fs.readFileSync(f)); if(!t.animations?.length)continue;
 const pieces=t.pieces||(t.slots||[]).flatMap(s=>s.pieces.map(p=>({name:p.name,position:p.offset,pivot:p.pivot,parent:p.parent,rotation:p.rotation})));
 const by=Object.fromEntries(pieces.map(p=>[p.name,p]));
 const piv=(p)=>p.pivot||p.position||[0,0,0];
 const issues=[];
 for(const a of t.animations){
  for(const tr of a.tracks||[]){const p=by[tr.target];if(!p){issues.push(`${a.name}: missing target ${tr.target}`);continue;}
   const k=tr.keyframes||[];if(!k.length)continue;const k0=k[0].value,kn=k[k.length-1].value;
   if(a.loop&&tr.property!=='visible'&&dist(k0,kn)>0.02)issues.push(`${a.name}[loop] ${tr.target}.${tr.property} ends ${JSON.stringify(kn)} != starts ${JSON.stringify(k0)}`);
   if(NON_REST_START.test(a.name))continue;
   if(tr.property==='position'){const local=piv(p).map((v,i)=>v-(p.parent&&by[p.parent]?piv(by[p.parent])[i]:0));const rootSpace=piv(p);
     const d=Math.min(dist(k0,local),dist(k0,rootSpace));if(d>0.05)issues.push(`${a.name}: ${tr.target}.position starts ${JSON.stringify(k0)} rest ${JSON.stringify(local.map(v=>+v.toFixed(2)))} (d=${d.toFixed(2)})`);}
   if(tr.property==='rotation'){const r=p.rotation||[0,0,0];const d=dist(k0,r);if(d>0.05)issues.push(`${a.name}: ${tr.target}.rotation starts ${JSON.stringify(k0)} rest ${JSON.stringify(r)} (d=${d.toFixed(2)})`);}
   if(tr.property==='scale'){const s=Array.isArray(p.scale)?p.scale:[1,1,1];const d=dist(k0,s);if(d>0.05)issues.push(`${a.name}: ${tr.target}.scale starts ${JSON.stringify(k0)} rest ${JSON.stringify(s)} (d=${d.toFixed(2)})`);}
  }}
 if(issues.length){total+=issues.length;console.log('## '+path.relative(ROOT,f));for(const i of issues)console.log('   '+i);}
}
console.error('animcheck2 issues: '+total);

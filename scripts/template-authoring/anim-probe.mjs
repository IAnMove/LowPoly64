// Measures, in the real app runtime, how far each clip's first frame moves pieces away from
// their rest pose (a visible "pop" when the clip starts) and whether loop clips end where they start.
import fs from 'node:fs';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
const PORT=41741; const ids=process.argv.slice(2);
const vite=await createServer({root:process.cwd(),logLevel:'error',server:{host:'127.0.0.1',port:PORT,strictPort:true}});
await vite.listen();
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||undefined,headless:true,args:['--use-angle=swiftshader','--enable-webgl']});
try{
 const page=await browser.newPage();
 await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'load',timeout:60000});
 await page.waitForFunction(()=>window.__LOWPOLY64_READY__===true,null,{timeout:60000});
 const result=await page.evaluate(async(ids)=>{
  const [{TEMPLATE_REGISTRY},{instantiateTemplateDefinition},THREE]=await Promise.all([import('/src/modules/viewport/template-registry.js'),import('/src/modules/viewport/templates.js'),import('/node_modules/three/build/three.module.js')]);
  const out=[];
  const snap=(group)=>{group.updateMatrixWorld(true);const m=new Map();group.traverse(n=>{if(!n.name&&!n.userData?.name)return;const p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();n.matrixWorld.decompose(p,q,s);m.set(n.userData?.name||n.name,{p,q,s});});return m;};
  const cmp=(a,b,names)=>{let dp=0,dr=0,ds=0,worst='',worstRot='';for(const n of names){const x=a.get(n),y=b.get(n);if(!x||!y)continue;const p=x.p.distanceTo(y.p),r=x.q.angleTo(y.q),s=Math.max(Math.abs(x.s.x-y.s.x),Math.abs(x.s.y-y.s.y),Math.abs(x.s.z-y.s.z));if(p>dp){dp=p;worst=n;}if(r>dr){dr=r;worstRot=n;}ds=Math.max(ds,s);}return {dp,dr,ds,worst,worstRot};};
  for(const def of TEMPLATE_REGISTRY){ if(ids.length&&!ids.includes(def.id))continue;
   let probe=instantiateTemplateDefinition(def);const clips=probe.userData.animationClips||[];if(!clips.length)continue;
   const box=new THREE.Box3().setFromObject(probe);const size=box.getSize(new THREE.Vector3());const span=Math.max(size.x,size.y,size.z)||1;
   for(const clip of clips){
    const g=instantiateTemplateDefinition(def);const rest=snap(g);
    const names=[...new Set(clip.tracks.map(t=>t.name.split('.')[0]))];
    const mixer=new THREE.AnimationMixer(g);const action=mixer.clipAction(clip);action.play();
    mixer.setTime(0);const start=snap(g);
    mixer.setTime(Math.max(0,clip.duration-1e-3));const end=snap(g);
    const s0=cmp(rest,start,names),loop=cmp(start,end,names);
    out.push({id:def.id,clip:clip.name,loop:clip.userData?.loop!==false,duration:clip.duration,span:+span.toFixed(2),startPos:+(s0.dp/span).toFixed(3),startRotDeg:+(s0.dr*57.3).toFixed(1),startScale:+s0.ds.toFixed(2),startWorst:s0.worst,startWorstRot:s0.worstRot,loopPos:+(loop.dp/span).toFixed(3),loopRotDeg:+(loop.dr*57.3).toFixed(1),loopScale:+loop.ds.toFixed(2),loopWorst:loop.worst});
    action.stop();mixer.uncacheRoot(g);
   }}
  return out;},ids);
 fs.writeFileSync('.tmp-anim-probe.json',JSON.stringify(result,null,1));
 console.log('clips probed:',result.length);
}finally{await browser.close();await vite.close();}

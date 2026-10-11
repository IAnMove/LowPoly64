import { chromium } from '@playwright/test';
import { createServer } from 'vite';
const PORT=41744;const ids=process.argv.slice(2);
const vite=await createServer({root:process.cwd(),logLevel:'error',server:{host:'127.0.0.1',port:PORT,strictPort:true}});
await vite.listen();
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||undefined,headless:true,args:['--use-angle=swiftshader','--enable-webgl']});
try{const page=await browser.newPage();page.on('console',m=>{if(['warning','error'].includes(m.type()))console.log('[console]',m.text().slice(0,200));});page.on('pageerror',e=>console.log('[pageerror]',String(e).slice(0,300)));await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'load'});await page.waitForFunction(()=>window.__LOWPOLY64_READY__===true,null,{timeout:60000});
 const r=await page.evaluate(async(ids)=>{const [{TEMPLATE_REGISTRY},{instantiateTemplateDefinition},{buildBoneToTargetMap},{getSkeletonById}]=await Promise.all([import('/src/modules/viewport/template-registry.js'),import('/src/modules/viewport/templates.js'),import('/src/modules/animation/mesh-animation-translation.js'),import('/src/modules/animation/skeleton-registry.js').catch(()=>import('/src/modules/animation/animation-profiles.js'))]);
  return ids.map(id=>{const def=TEMPLATE_REGISTRY.find(d=>d.id===id);const g=instantiateTemplateDefinition(def);const arm=g.getObjectByName('RIGHT_ARM_UPPER');
   const tree=[];g.traverse(n=>{if(n.userData?.isPivot||n.isGroup)tree.push((n.userData?.name||n.name)+'<'+(n.parent?.userData?.name||n.parent?.name||'-'));});const bmap=buildBoneToTargetMap(g,g.userData.slotMap,g.userData.slotBindings);
   return {id,tree:tree.filter(x=>/ARM|PAULDRON|CLAV|TORSO|CHEST/.test(x)).join(' '),bmap:JSON.stringify(bmap),clips:(g.userData.animationClips||[]).map(c=>c.name),slotMapArmR:g.userData.slotMap?.ARM_R,bindingsArmR:g.userData.slotBindings?.ARM_R,armParent:arm?.parent?.name,rig:g.userData.humanoidRigMode,skel:g.userData.skeletonId};});},ids);
 console.log(JSON.stringify(r,null,1));
}finally{await browser.close();await vite.close();}

import { chromium } from '@playwright/test';
import { createServer } from 'vite';
const PORT=41745;const ids=process.argv.slice(2);
const vite=await createServer({root:process.cwd(),logLevel:'error',server:{host:'127.0.0.1',port:PORT,strictPort:true}});
await vite.listen();
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||undefined,headless:true,args:['--use-angle=swiftshader','--enable-webgl']});
try{const page=await browser.newPage();await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'load'});await page.waitForFunction(()=>window.__LOWPOLY64_READY__===true,null,{timeout:60000});
 const r=await page.evaluate(async(ids)=>{const [{TEMPLATE_REGISTRY},{instantiateTemplateDefinition}]=await Promise.all([import('/src/modules/viewport/template-registry.js'),import('/src/modules/viewport/templates.js')]);
  return ids.map(id=>{const g=instantiateTemplateDefinition(TEMPLATE_REGISTRY.find(d=>d.id===id));const rows=[];g.traverse(n=>{if(!n.isMesh)return;const geo=n.geometry;const tri=geo.index?geo.index.count/3:geo.attributes.position.count/3;rows.push([n.parent?.userData?.name||n.name,geo.type,Math.round(tri)]);});rows.sort((a,b)=>b[2]-a[2]);return {id,total:rows.reduce((s,x)=>s+x[2],0),top:rows.slice(0,40).map(x=>x.join(':')).join('  ')};});},ids);
 for(const x of r)console.log(x.id,x.total,'\n   ',x.top);
}finally{await browser.close();await vite.close();}

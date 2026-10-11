import fs from 'node:fs';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
const PORT=41743;
const vite=await createServer({root:process.cwd(),logLevel:'error',server:{host:'127.0.0.1',port:PORT,strictPort:true}});
await vite.listen();
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||undefined,headless:true,args:['--use-angle=swiftshader','--enable-webgl']});
try{const page=await browser.newPage();await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'load'});await page.waitForFunction(()=>window.__LOWPOLY64_READY__===true,null,{timeout:60000});
 const r=await page.evaluate(async()=>{const [{TEMPLATE_REGISTRY},{instantiateTemplateDefinition},{evaluateStyleBudget}]=await Promise.all([import('/src/modules/viewport/template-registry.js'),import('/src/modules/viewport/templates.js'),import('/src/modules/viewport/style-budget.js')]);
  return TEMPLATE_REGISTRY.map(def=>{const g=instantiateTemplateDefinition(def);const e=evaluateStyleBudget(g);return {id:def.id,category:def.category,tris:e.metrics.triangles,meshes:e.metrics.meshes,colors:e.metrics.materialColors.length,within:e.withinBudget,warnings:e.warnings.map(w=>w.id)};});});
 fs.writeFileSync('.tmp-budget.json',JSON.stringify(r,null,1));
 const over=r.filter(x=>!x.within);console.log('templates',r.length,'over budget',over.length);for(const x of over)console.log(' ',x.id.padEnd(30),x.category.padEnd(12),'tris',x.tris,'colors',x.colors,x.warnings.join(','));
}finally{await browser.close();await vite.close();}

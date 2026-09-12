import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const cap = process.argv.includes('--cap');
const output = cap ? 'artifacts/mario64-cap-study' : 'artifacts/mario64-refinement';
const html = `<!doctype html><html lang="es"><meta charset="utf-8"><title>${cap ? "Mario · revisión de la gorra" : "Mario · revisión de la cara"}</title>
<style>*{box-sizing:border-box}body{margin:0;background:#182333;color:#edf2fa;font-family:system-ui,sans-serif}header{height:100px;padding:24px 38px;display:flex;align-items:center;justify-content:space-between}h1{font-size:25px;margin:0}header span{font-size:14px;color:#efc96d}main{display:grid;grid-template-columns:1fr 1fr;gap:2px;background:#405169}figure{margin:0;background:#223044;position:relative}img{display:block;width:100%}figcaption{position:absolute;top:18px;left:24px;font-size:14px;letter-spacing:2px;color:#d1dbea}footer{padding:18px 38px;color:#ced8e6;font-size:15px}</style>
<header><h1>${cap ? "Mario · una gorra con más volumen" : "Mario · una cara más reconocible"}</h1><span>RETROVISOR / N64</span></header>
<main><figure><img src="before-portrait.png" alt="Mario antes del ajuste"><figcaption>ANTERIOR</figcaption></figure><figure><img src="after-portrait.png" alt="Mario después del ajuste"><figcaption>AHORA</figcaption></figure></main>
<footer>${cap ? "Copa abombada · banda estrecha · visera curvada · insignia adaptada a la tela" : "Cejas visibles · ojos más definidos · bigote con contorno · gorra y patillas ajustadas"}</footer></html>`;
await fs.writeFile(`${output}/index.html`, html);
const server = await createServer({ logLevel: 'warn', server: { host: '127.0.0.1', port: 41740, strictPort: true, hmr: false } });
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1100, height: 706 } });
  await page.goto(`http://127.0.0.1:41740/${output}/index.html`);
  await page.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
  await page.screenshot({ path: `${output}/comparison.png`, fullPage: true });
  console.log(`${output}/comparison.png`);
} finally { await browser?.close(); await server.close(); }

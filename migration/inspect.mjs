import puppeteer from 'puppeteer-core';
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const b=await puppeteer.launch({executablePath:CHROME,headless:'new',args:['--no-sandbox']});
const p=await b.newPage();
await p.goto('https://www.ksharma.xyz/protobuf-generate-kotlin-code',{waitUntil:'networkidle2',timeout:60000});
await p.evaluate(async()=>{const s=ms=>new Promise(r=>setTimeout(r,ms));for(let y=0;y<=document.body.scrollHeight;y+=500){scrollTo(0,y);await s(200);}await s(800);});
// all frame urls
console.log('FRAME URLS:');
for(const f of p.frames()){const u=f.url(); if(u && u!=='about:blank') console.log('  '+u);}
// iframe element srcs + any gist references in html
const info=await p.evaluate(()=>{
  const ifr=[...document.querySelectorAll('iframe')].map(f=>f.src).filter(Boolean);
  const gists=[...document.body.innerHTML.matchAll(/gist\.github\.com\/[^"'<>\s)]+/g)].map(m=>m[0]);
  return {iframeSrcs:ifr.slice(0,12), gists:[...new Set(gists)].slice(0,12)};
});
console.log('IFRAME SRCS:', JSON.stringify(info.iframeSrcs,null,1));
console.log('GIST REFS:', JSON.stringify(info.gists,null,1));
await b.close();

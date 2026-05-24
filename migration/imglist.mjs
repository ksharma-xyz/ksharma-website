import puppeteer from 'puppeteer-core';
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const b=await puppeteer.launch({executablePath:CHROME,headless:'new',args:['--no-sandbox']});
const p=await b.newPage();
await p.goto('https://www.ksharma.xyz/protobuf-generate-kotlin-code',{waitUntil:'networkidle2',timeout:60000});
await p.evaluate(async()=>{const s=ms=>new Promise(r=>setTimeout(r,ms));for(let y=0;y<=document.body.scrollHeight;y+=400){scrollTo(0,y);await s(150);}await s(500);});
const list=await p.evaluate(()=>[...document.querySelectorAll('img')].filter(i=>/googleusercontent/.test(i.currentSrc||i.src)).map(i=>({w:i.naturalWidth,h:i.naturalHeight,src:(i.currentSrc||i.src).slice(0,70)})));
console.log(JSON.stringify(list,null,1));
await b.close();

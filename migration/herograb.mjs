import puppeteer from 'puppeteer-core';
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const b=await puppeteer.launch({executablePath:CHROME,headless:'new',args:['--no-sandbox']});
const p=await b.newPage();
await p.goto('https://www.ksharma.xyz/protobuf-generate-kotlin-code',{waitUntil:'networkidle2',timeout:60000});
await p.evaluate(async()=>{const s=ms=>new Promise(r=>setTimeout(r,ms));for(let y=0;y<=2000;y+=400){scrollTo(0,y);await s(150);}});
// the hero: first sizeable googleusercontent image on the page
const src=await p.evaluate(()=>{
  for(const im of document.querySelectorAll('img')){const s=im.currentSrc||im.src; if(/googleusercontent/.test(s)&&im.naturalWidth>300) return s;}
  return '';
});
console.log(src);
await b.close();

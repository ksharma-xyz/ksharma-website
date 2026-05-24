import puppeteer from 'puppeteer-core';
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const b=await puppeteer.launch({executablePath:CHROME,headless:'new',args:['--no-sandbox']});
const p=await b.newPage();
await p.goto('https://www.ksharma.xyz/protobuf-generate-kotlin-code',{waitUntil:'networkidle2',timeout:60000});
await p.evaluate(async()=>{const s=ms=>new Promise(r=>setTimeout(r,ms));for(let y=0;y<=document.body.scrollHeight;y+=600){scrollTo(0,y);await s(150);}await s(600);});
const r=await p.evaluate(()=>{
  document.querySelectorAll('header,nav,[role=banner],[role=navigation],[role=contentinfo],style,script').forEach(e=>e.remove());
  // tag histogram of elements that directly contain text
  const hist={};
  document.querySelectorAll('h1,h2,h3,h4,p,blockquote,li').forEach(e=>{hist[e.tagName]=(hist[e.tagName]||0)+1;});
  // sample: the element wrapping the word "Wire" and a body sentence
  const findTag=(txt)=>{for(const e of document.querySelectorAll('*')){if(e.children.length===0 && e.textContent.trim()===txt) return e.parentElement?e.parentElement.tagName+' > '+e.tagName:e.tagName;}return 'NOT FOUND';};
  return {hist, wire:findTag('Wire'), imgs:document.querySelectorAll('img').length, codeIfr:document.querySelectorAll('iframe.YMEQtf, iframe[class*=YMEQtf]').length};
});
console.log(JSON.stringify(r,null,1));
await b.close();

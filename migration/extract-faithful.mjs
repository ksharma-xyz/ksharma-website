// Faithful blog extractor. Google Sites uses real H1/H2/H3/P/LI tags, embedded
// GitHub gists for code, and googleusercontent images. We read block elements in
// document order, fetch gist code by id, and download images to WebP.
//   cd migration && node extract-faithful.mjs [slug]
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'extracted', 'blog');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ORIGIN = 'https://www.ksharma.xyz';
const ALL = {
 'jetpack-compose-best-practices':'2025-08','google-io-extended-2025-compose-multiplatform-to-city':'2025-06',
 'protobuf-generate-kotlin-code':'2024-07','graphite-improve-dev-velocity-using-git':'2024-06',
 'android-adb-shortcuts-for-productivity':'2024-06','encryption-google-tink-android':'2024-05',
 'jetpack-compose-security-disable-screenshots-recordings':'2024-04','a11y-weather-app-android':'2023-02',
 'accessibility-list-item-android-jetpack-compose':'2023-01'};
const SLUGS = process.argv[2] ? {[process.argv[2]]: ALL[process.argv[2]]} : ALL;
const langFor = fn => ({kt:'kotlin',kts:'kotlin',java:'java',proto:'protobuf',xml:'xml',gradle:'kotlin',yml:'yaml',yaml:'yaml',sh:'bash',bash:'bash',json:'json',toml:'toml',groovy:'groovy'})[(fn||'').split('.').pop().toLowerCase()]||'kotlin';

async function gistCode(id){
  try{
    const r = await fetch(`https://api.github.com/gists/${id}`,{headers:{'User-Agent':'ksharma-site'}});
    if(!r.ok) throw new Error('HTTP '+r.status);
    const j = await r.json();
    return Object.values(j.files||{}).map(f=>'```'+langFor(f.filename)+'\n'+f.content.replace(/\s+$/,'')+'\n```').join('\n\n');
  }catch(e){ console.warn('  ! gist '+id+': '+e.message); return ''; }
}
async function dlImg(src, dest){
  const sized = src.replace(/=w\d+(-h\d+)?$/i,'=w1280').replace(/=s\d+$/i,'=s1280');
  const r = await fetch(sized); if(!r.ok) throw new Error('HTTP '+r.status);
  const buf = Buffer.from(await r.arrayBuffer()); const tmp=dest+'.orig'; fs.writeFileSync(tmp,buf);
  try{ execFileSync('cwebp',['-quiet','-q','82',tmp,'-o',dest]); fs.unlinkSync(tmp); }
  catch{ fs.renameSync(tmp, dest.replace(/\.webp$/,'.png')); }
}

const browser = await puppeteer.launch({executablePath:CHROME, headless:'new', args:['--no-sandbox','--disable-dev-shm-usage']});
for(const [slug,date] of Object.entries(SLUGS)){
  const page = await browser.newPage(); await page.setViewport({width:1280,height:1000});
  try{
    await page.goto(`${ORIGIN}/${slug}`,{waitUntil:'networkidle2',timeout:60000});
    await page.evaluate(async()=>{const s=ms=>new Promise(r=>setTimeout(r,ms));for(let y=0;y<=document.body.scrollHeight;y+=500){scrollTo(0,y);await s(180);}await s(700);});
    const gistIds = await page.evaluate(()=>[...document.body.innerHTML.matchAll(/gist\.github\.com\/[\w-]+\/([0-9a-f]+)\.js/g)].map(m=>m[1]));
    const { blocks, imgs, cc } = await page.evaluate(()=>{
      document.querySelectorAll('header,nav,footer,[role=banner],[role=navigation],[role=contentinfo],style,script,noscript').forEach(e=>e.remove());
      const md = el=>{ let h=el.innerHTML
        .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,(m,href,t)=>{t=t.replace(/<[^>]+>/g,'').trim(); return t?`[${t}](${href})`:'';})
        .replace(/<(b|strong)>([\s\S]*?)<\/\1>/gi,(m,_,t)=>{t=t.replace(/<[^>]+>/g,'').trim(); return t?`**${t}**`:'';})
        .replace(/<br\s*\/?>/gi,' ').replace(/<[^>]+>/g,'');
        const ta=document.createElement('textarea'); ta.innerHTML=h; return ta.value.replace(/\s+/g,' ').trim(); };
      const blocks=[]; const imgs=[]; const seen=new Set(); let seenH=false; let cc=0;
      document.querySelectorAll('h1,h2,h3,p,blockquote,li,img,iframe').forEach(el=>{
        const t=el.tagName;
        if(t==='IFRAME'){ if(/YMEQtf/.test(el.className)){ el.setAttribute('data-ci',cc); blocks.push({type:'code',ci:cc}); cc++; } return; }
        if(t==='IMG'){ const src=el.currentSrc||el.src; if(seenH&&src&&/googleusercontent/.test(src)&&el.naturalWidth>260&&!seen.has(src)){seen.add(src);imgs.push(src);blocks.push({type:'img',i:imgs.length-1});} return; }
        if((t==='P') && el.closest('blockquote,li')) return;   // avoid double-capture
        const txt = md(el); if(!txt || /^Skip to /.test(txt)) return;
        if(t==='H1'){ seenH=true; blocks.push({type:'h',lvl:1,txt}); }
        else if(t==='H2'){ seenH=true; blocks.push({type:'h',lvl:2,txt}); }
        else if(t==='H3'){ seenH=true; blocks.push({type:'h',lvl:3,txt}); }
        else if(t==='BLOCKQUOTE') blocks.push({type:'quote',txt});
        else if(t==='LI') blocks.push({type:'li',txt});
        else blocks.push({type:'p',txt});
      });
      return { blocks, imgs, cc };
    });

    // title = first heading (+ continuation if it ends with a colon)
    let fh = blocks.findIndex(b=>b.type==='h');
    if(fh<0) fh=0;
    const tparts=[]; let i=fh;
    if(blocks[fh] && blocks[fh].type==='h'){
      tparts.push(blocks[fh].txt); i=fh+1;
      if(blocks[fh].txt.trim().endsWith(':') && blocks[i] && blocks[i].type==='h'){ tparts.push(blocks[i].txt); i++; }
    }
    const title = (tparts.join(' ').replace(/\s+/g,' ').trim() || slug.replace(/-/g,' ')).replace(/:$/,'');

    // code for each code-widget: gists when counts match, else read the widget's frame
    const useGists = gistIds.length>0 && gistIds.length===cc;
    const codeByCi=[];
    for(let ci=0; ci<cc; ci++){
      if(useGists){ codeByCi[ci] = await gistCode(gistIds[ci]); }
      else {
        try{ const h=await page.$(`iframe[data-ci="${ci}"]`); const fr=h&&await h.contentFrame();
          let c = fr ? await fr.evaluate(()=>document.body.innerText).catch(()=>'') : '';
          c=(c||'').replace(/\s+$/,'').trim();
          codeByCi[ci] = c ? '```kotlin\n'+c+'\n```' : '';
        }catch{ codeByCi[ci]=''; }
      }
    }
    const imgDir = path.join(OUT,'images',slug); fs.rmSync(imgDir,{recursive:true,force:true}); fs.mkdirSync(imgDir,{recursive:true});
    for(let k=0;k<imgs.length;k++){ try{ await dlImg(imgs[k], path.join(imgDir,`fig-${k+1}.webp`)); }catch(e){ console.warn('  ! img '+k+': '+e.message);} }

    const lines=[];
    for(;i<blocks.length;i++){ const b=blocks[i];
      if(b.type==='h'){ if(/^["“”]/.test(b.txt)) lines.push('\n> '+b.txt+'\n'); else lines.push('\n'+'#'.repeat(b.lvl===1?2:b.lvl)+' '+b.txt+'\n'); }
      else if(b.type==='quote') lines.push('\n> '+b.txt+'\n');
      else if(b.type==='li') lines.push('- '+b.txt);
      else if(b.type==='img') lines.push(`\n![](images/${slug}/fig-${b.i+1}.webp)\n`);
      else if(b.type==='code') lines.push('\n'+(codeByCi[b.ci]||'')+'\n');
      else lines.push('\n'+b.txt+'\n');
    }
    let body = lines.join('\n').replace(/ — /g,', ').replace(/—/g,'-').replace(/\n{3,}/g,'\n\n').trim();
    const fm = `---\ntitle: ${JSON.stringify(title)}\nslug: ${slug}\ndate: ${date}\ntype: blog\n---\n`;
    fs.writeFileSync(path.join(OUT, slug+'.md'), fm+body+'\n');
    console.log(`✓ ${slug}: ${gistIds.length} gists, ${imgs.length} imgs, ${body.length} chars`);
  }catch(e){ console.error('✗ '+slug+': '+e.message); }
  finally{ await page.close(); }
}
await browser.close();

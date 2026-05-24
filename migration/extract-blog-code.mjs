// Re-scrape blog posts and recover code blocks that live inside Google Sites
// code-widget iframes (class "YMEQtf"). Rewrites migration/extracted/blog/<slug>.md
// with fenced ```kotlin blocks in the right positions.
//   cd migration && node extract-blog-code.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import TurndownService from 'turndown';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'extracted', 'blog');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ORIGIN = 'https://www.ksharma.xyz';

const SLUGS = ['jetpack-compose-best-practices','google-io-extended-2025-compose-multiplatform-to-city',
 'protobuf-generate-kotlin-code','graphite-improve-dev-velocity-using-git','android-adb-shortcuts-for-productivity',
 'encryption-google-tink-android','jetpack-compose-security-disable-screenshots-recordings',
 'a11y-weather-app-android','accessibility-list-item-android-jetpack-compose'];
const DATES = {'jetpack-compose-best-practices':'2025-08','google-io-extended-2025-compose-multiplatform-to-city':'2025-06',
 'protobuf-generate-kotlin-code':'2024-07','graphite-improve-dev-velocity-using-git':'2024-06',
 'android-adb-shortcuts-for-productivity':'2024-06','encryption-google-tink-android':'2024-05',
 'jetpack-compose-security-disable-screenshots-recordings':'2024-04','a11y-weather-app-android':'2023-02',
 'accessibility-list-item-android-jetpack-compose':'2023-01'};

const td = new TurndownService({ headingStyle:'atx', codeBlockStyle:'fenced', bulletListMarker:'-' });

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless:'new', args:['--no-sandbox','--disable-dev-shm-usage'] });
  for (const slug of SLUGS) {
    const page = await browser.newPage();
    await page.setViewport({ width:1280, height:1000 });
    try {
      await page.goto(`${ORIGIN}/${slug}`, { waitUntil:'networkidle2', timeout:60000 });
      await page.evaluate(async()=>{const s=ms=>new Promise(r=>setTimeout(r,ms));for(let y=0;y<=document.body.scrollHeight;y+=500){scrollTo(0,y);await s(220);}scrollTo(0,0);await s(600);});
      await new Promise(r=>setTimeout(r,1500));

      // Tag code-widget iframes in DOM order; pick the main content container; emit
      // HTML with each code iframe replaced by a @@CODE_i@@ placeholder text node.
      const nCode = await page.evaluate(() => {
        document.querySelectorAll('header,footer,nav,script,style,[role=banner],[role=navigation],[role=contentinfo]').forEach(e=>e.remove());
        const ifr = [...document.querySelectorAll('iframe')].filter(f => /YMEQtf/.test(f.className));
        ifr.forEach((f,i)=>f.setAttribute('data-ci', i));
        return ifr.length;
      });

      const html = await page.evaluate(() => {
        // Chrome already stripped; use body so code iframes are always included.
        // Drop empty wrapper noise to keep turndown output clean.
        const clone = document.body.cloneNode(true);
        clone.querySelectorAll('iframe[data-ci]').forEach(f=>{ f.replaceWith(document.createTextNode('\n\n@@CODE_'+f.getAttribute('data-ci')+'@@\n\n')); });
        clone.querySelectorAll('iframe').forEach(f=>f.remove());
        return clone.innerHTML;
      });

      // Read each code iframe's text via its frame.
      const codes = [];
      for (let i=0;i<nCode;i++){
        try {
          const h = await page.$(`iframe[data-ci="${i}"]`);
          const fr = h && await h.contentFrame();
          let txt = fr ? await fr.evaluate(()=>document.body.innerText) : '';
          codes[i] = (txt||'').replace(/ /g,' ').replace(/\s+$/,'');
        } catch { codes[i]=''; }
      }

      let md = td.turndown(html);
      const ph = (md.match(/@@CODE_\d+@@/g)||[]).length;
      const codeLens = codes.map(c=>(c||'').length);
      md = md.replace(/\[([^\]]*)\]\(#[^)]*\)/g,'$1').replace(/^#{1,6}[ \t]*$/gm,'');
      md = md.replace(/@@CODE_(\d+)@@/g, (_,i)=> { const c=codes[+i]; return c ? '\n```kotlin\n'+c+'\n```\n' : ''; });
      console.log(`   debug ${slug}: placeholders=${ph} codeLens=[${codeLens.join(',')}]`);
      md = md.replace(/ — /g,', ').replace(/—/g,'-').replace(/\n{3,}/g,'\n\n').trim();

      const date = DATES[slug] || '';
      const fm = `---\ntitle: ${JSON.stringify(slug)}\nsource: ${ORIGIN}/${slug}\n${date?`date: ${date}\n`:''}type: blog\n---\n`;
      fs.writeFileSync(path.join(OUT, slug+'.md'), fm+md+'\n');
      const blocks = (md.match(/```kotlin/g)||[]).length;
      console.log(`✓ ${slug}  (${nCode} code iframes, ${blocks} blocks captured, ${md.length} chars)`);
    } catch(e){ console.error(`✗ ${slug}: ${e.message}`); }
    finally { await page.close(); }
  }
  await browser.close();
}
run().catch(e=>{console.error(e);process.exit(1);});

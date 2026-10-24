async(page)=>{
 const base=new URL(page.url()).origin,checks=[];
 function check(ok,label){if(!ok)throw Error(label);checks.push(label);}
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},hasTouch:true});
 try{
  const p=await context.newPage();await p.goto(base+'/dist/xhs/index.html?board=llm');
  await p.evaluate(()=>{window.__notes=[];window.__files=[];window.__albums=[];window.__cancel=false;window.xhs={miniTool:{postNote:async payload=>{if(window.__cancel)throw {errMsg:'postNote:fail cancelled'};window.__notes.push(payload);},writeTempFile:async payload=>{window.__files.push(payload);return {filePath:'local/ranking.png'};},saveImageToPhotosAlbum:async payload=>window.__albums.push(payload)}};});
  await p.locator('#export').tap();await p.waitForFunction(()=>{const i=document.querySelector('.poster-scroll img');return i&&i.complete&&i.naturalWidth===1080&&!document.querySelector('select[aria-label="结果图画质"]').disabled;});
  check(await p.locator('.pager span').textContent()==='1 / 2','60 models generate two result pages');
  const share=p.getByRole('button',{name:'分享到小红书',exact:true});check(await share.isVisible()&&await share.isEnabled(),'share button available in result dialog');
  await p.getByRole('button',{name:'下一页 →',exact:true}).tap();await p.locator('select[aria-label="结果图画质"]').selectOption('720');await p.waitForFunction(()=>{const i=document.querySelector('.poster-scroll img');return i&&i.complete&&i.naturalWidth===720&&!document.querySelector('select[aria-label="结果图画质"]').disabled;});
  const second=await p.locator('.poster-scroll img').getAttribute('src');await share.tap();await p.waitForFunction(()=>window.__notes.length===1);
  check(await p.evaluate(second=>{const n=window.__notes[0],images=n.mediaInfo.image_resources;return n.pageType==='photo_publish'&&images.length===2&&images[1].url===second&&images[0].url!==second&&images.every(v=>v.url.startsWith('data:image/png;base64,'))&&Array.from(n.title).length<=20&&Array.from(n.content).length<=1000;},second),'native note payload includes ordered PNG pages and valid text lengths');
  check(await p.evaluate(async()=>{const images=window.__notes[0].mediaInfo.image_resources;return (await Promise.all(images.map(v=>new Promise(resolve=>{const i=new Image();i.onload=()=>resolve(i.naturalWidth===720&&i.naturalHeight*i.naturalWidth<=4000000);i.onerror=()=>resolve(false);i.src=v.url;})))).every(Boolean);}),'both shared pages decode within pixel budget');
  await p.getByRole('button',{name:'保存当前页',exact:true}).tap();await p.waitForFunction(()=>window.__albums.length===1);
  check(await p.evaluate(second=>window.__files[0].data===second&&window.__albums[0].filePath==='local/ranking.png',second),'save album receives exact current PNG via temporary file');
  await p.evaluate(()=>window.__cancel=true);await share.tap();await p.waitForFunction(()=>document.querySelector('#toast').textContent.includes('cancelled'));
  check(await share.isEnabled(),'cancelled native share allows retry');await p.evaluate(()=>window.__cancel=false);await share.tap();await p.waitForFunction(()=>window.__notes.length===2);check(true,'share retry succeeds');
  await p.locator('#modal-close').tap();await p.locator('#period').selectOption('2025-h2');await p.locator('#export').tap();await p.waitForFunction(()=>{const i=document.querySelector('.poster-scroll img');return i&&i.complete&&i.naturalWidth===1080&&!document.querySelector('select[aria-label="结果图画质"]').disabled;});
  await share.tap();await p.waitForFunction(()=>window.__notes.length===3);
  check(await p.evaluate(()=>window.__notes[2].mediaInfo.image_resources.length===1&&window.__notes[2].content.includes('2025 下半年')),'filtered result shares one page with selected period');
  await p.screenshot({path:'output/playwright/ai-minitool-share-2026-10-23.png'});
  await p.locator('#modal-close').tap();await p.evaluate(()=>delete window.xhs);await p.locator('#export').tap();await p.waitForFunction(()=>{const b=Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='分享到小红书');return b&&!b.disabled;});await share.tap();await p.waitForFunction(()=>document.querySelector('#toast').textContent.includes('请在小红书小工具内使用分享'));check(await share.isEnabled(),'ordinary browser displays host requirement without hanging');
 }finally{await context.close();}
 return {passed:checks.length,checks,nativeBridge:'mock; physical host not verified'};
}

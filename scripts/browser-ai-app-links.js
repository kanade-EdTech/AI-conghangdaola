async(page)=>{
 const base=new URL(page.url()).origin,checks=[];
 function check(ok,label){if(!ok)throw Error(label);checks.push(label);}
 for(const platform of ['toy','xhs']){
  const context=await page.context().browser().newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  try{
   const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
   await p.goto(base+'/dist/'+platform+'/index.html');
   check(await p.locator('#pool-count').textContent()==='20',platform+' 20 real Apps');
   check(await p.locator('#demo-notice').isHidden(),platform+' no fixture notice');
   await p.waitForFunction(()=>Array.from(document.querySelectorAll('#pool img')).length===20&&Array.from(document.querySelectorAll('#pool img')).every(i=>i.complete&&i.naturalWidth>0));
   check(await p.locator('#pool img').count()===20,platform+' 20 decoded local App icons');
   await p.locator('#category').selectOption('app-domestic');check(await p.locator('#pool-count').textContent()==='10',platform+' domestic filter');
   await p.locator('#category').selectOption('app-overseas');check(await p.locator('#pool-count').textContent()==='10',platform+' overseas filter');
   await p.locator('#clear-filters').click();
   await p.evaluate(()=>{window.__drawn=[];const original=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(i){window.__drawn.push(i.src);return original.apply(this,arguments);};});
   await p.locator('[data-item="builtin:app:appstore:6459478672"]').tap();await p.locator('#selection-tier').selectOption('hang');
   check(await p.locator('[data-dropzone="hang"] .item-card img').count()===1,platform+' App icon survives ranking');
   await p.locator('#export').click();await p.waitForFunction(()=>{const i=document.querySelector('.poster-scroll img');return i&&i.complete&&i.naturalWidth===1080;});
   check(await p.evaluate(()=>window.__drawn.length===20),platform+' poster draws all 20 real App icons');
   await p.locator('#modal-close').click();await p.reload();
   check(await p.locator('[data-dropzone="hang"] [data-item="builtin:app:appstore:6459478672"]').count()===1,platform+' App ranking persists');
   await p.locator('[data-board="llm"]').click();
   check(await p.locator('[data-board="llm"]').textContent()==='02 语言模型',platform+' renamed navigation');
   check(await p.locator('#pool-count').textContent()==='60',platform+' existing 60 models retained');
   check(await p.locator('input').first().inputValue()==='语言模型 从夯到拉',platform+' renamed default title');
   check(errors.length===0,platform+' no script errors');
   await p.locator('[data-board="app"]').click();await p.screenshot({path:'output/playwright/ai-'+platform+'-app-linked.png',fullPage:true});
  }finally{await context.close();}
 }
 return {passed:checks.length,checks};
}

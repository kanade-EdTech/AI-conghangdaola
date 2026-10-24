async(page)=>{
 const base=new URL(page.url()).origin,checks=[];
 function check(ok,label){if(!ok)throw Error(label);checks.push(label);}
 for(const platform of ['toy','xhs']){
  const context=await page.context().browser().newContext({viewport:{width:390,height:844}});
  try{
   const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'/dist/'+platform+'/index.html?board=llm');
   await p.evaluate(()=>{window.__nameDraws=[];const fill=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(text,x,y){if(this.font==='16px sans-serif')window.__nameDraws.push({text,x,y});return fill.apply(this,arguments);};});
   for(const brand of ['Claude','DeepSeek']){
    await p.locator('#search').fill(brand);await p.waitForFunction(brand=>document.querySelector('#scope-summary').textContent.includes('搜索：'+brand),brand);
    await p.locator('#export').click();await p.waitForFunction(()=>{const i=document.querySelector('.poster-scroll img');return i&&i.complete&&i.naturalWidth===1080&&!document.querySelector('select[aria-label="结果图画质"]').disabled;});
    for(const width of [1080,720]){
     if(width===720){await p.evaluate(()=>window.__nameDraws=[]);await p.locator('select[aria-label="结果图画质"]').selectOption('720');await p.waitForFunction(()=>{const i=document.querySelector('.poster-scroll img');return i&&i.complete&&i.naturalWidth===720&&!document.querySelector('select[aria-label="结果图画质"]').disabled;});}
     const result=await p.evaluate(({brand,width})=>{
      const names=AITier.catalogData.items.filter(v=>v.kind==='llm'&&v.name.startsWith(brand+' ')),drawn=window.__nameDraws;
      return names.every(v=>{const match=brand==='Claude'?/^Claude\s+(.+)$/.exec(v.name):/^(DeepSeek\s+\S+)\s+(.+)$/.exec(v.name);if(!match)return drawn.some(d=>d.text===v.name);const first=brand==='Claude'?'Claude':match[1],second=brand==='Claude'?match[1]:match[2];return drawn.some(a=>a.text===first&&drawn.some(b=>b.text===second&&b.x===a.x&&b.y===a.y+18));});
     },{brand,width});
     check(result,platform+' '+brand+' exact line positions '+width);
     check(await p.locator('.poster-scroll img').evaluate(i=>i.naturalWidth*i.naturalHeight<=4000000),platform+' image pixel budget '+brand+' '+width);
     if(platform==='toy'&&width===1080){
      const src=await p.locator('.poster-scroll img').getAttribute('src'),preview=await context.newPage();await preview.setViewportSize({width:1080,height:2200});await preview.setContent('<body style="margin:0"><img style="display:block" src="'+src+'"></body>');await preview.locator('img').screenshot({path:'output/playwright/ai-poster-'+brand.toLowerCase()+'-lines.png'});await preview.close();
     }
    }
    await p.locator('#modal-close').click();await p.evaluate(()=>window.__nameDraws=[]);
   }
   check(errors.length===0,platform+' no script errors');
  }finally{await context.close();}
 }
 return {passed:checks.length,checks};
}

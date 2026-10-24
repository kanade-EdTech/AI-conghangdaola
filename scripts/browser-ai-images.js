async(page)=>{
 const browser=page.context().browser(),base=new URL(page.url()).origin,checks=[];
 const check=(ok,label)=>{if(!ok)throw Error(label);checks.push(label);};
 for(const platform of ['toy','xhs']){
  const context=await browser.newContext({viewport:{width:390,height:844}});
  try{
   const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
   await p.goto(base+'/dist/'+platform+'/index.html?board=llm');
   check(await p.locator('[data-board="llm"]').getAttribute('aria-pressed')==='true',platform+' direct LLM preview link');
   check(await p.locator('#demo-notice').isHidden(),platform+' real LLM board not labelled fixture');
   check(await p.locator('#pool-count').textContent()==='60',platform+' 60 real model records');
   await p.locator('#more-pool').click();await p.waitForFunction(()=>Array.from(document.querySelectorAll('#pool .item-card img')).every(img=>img.complete&&img.naturalWidth>0));
   check(await p.locator('#pool .item-card img').count()===60,platform+' all 60 model cards have decoded images');
   check(await p.locator('#pool .item-card img').evaluateAll(images=>new Set(images.map(img=>img.src)).size)===15,platform+' 60 models share 15 image URLs');
   check(await p.locator('#pool .item-card img').evaluateAll(images=>images.every(img=>new URL(img.src).origin===location.origin&&new URL(img.src).pathname.includes('/assets/ai-icons/'))),platform+' image references are packaged local paths');
   await p.locator('#provider').selectOption('openai');
   check(await p.locator('#pool .item-card img').evaluateAll(images=>new Set(images.map(img=>img.src)).size)===1,platform+' provider versions share same physical logo');
   await p.locator('#clear-filters').click();
   await p.locator('[data-item="builtin:llm:openai:gpt-4o"]').click();await p.locator('#selection-tier').selectOption('hang');
   await p.waitForTimeout(350);await p.reload();
   check(await p.locator('[data-dropzone="hang"] [data-item="builtin:llm:openai:gpt-4o"] img').count()===1,platform+' logo and real model rank survive refresh');
   await p.evaluate(()=>{window.__drawn=[];window.__snapshots=[];const draw=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(image){window.__drawn.push(image.src);return draw.apply(this,arguments);};const render=AITier.poster.render;AITier.poster.render=function(snapshot,index,width){window.__snapshots.push({demo:snapshot.demo,count:Object.values(snapshot.rows).reduce((sum,row)=>sum+row.length,0)});return render(snapshot,index,width);};});
   await p.locator('#export').click();await p.waitForFunction(()=>{const i=document.querySelector('.poster-scroll img');return i&&i.complete&&i.naturalWidth===1080&&!document.querySelector('select[aria-label="结果图画质"]').disabled;});
   check(await p.locator('.pager span').textContent()==='1 / 2',platform+' full 60 model set exports two pages');
   await p.getByRole('button',{name:'下一页 →',exact:true}).click();await p.waitForFunction(()=>window.__drawn.length>=60&&!document.querySelector('select[aria-label="结果图画质"]').disabled);
   check(await p.evaluate(()=>window.__drawn.length===60 && new Set(window.__drawn).size===15),platform+' both poster pages draw all 60 actual logos');
   check(await p.evaluate(()=>window.__snapshots.every(snapshot=>snapshot.demo===false&&snapshot.count===60)),platform+' real model posters not labelled fictional');
   check(await p.locator('.poster-scroll img').evaluate(img=>img.naturalWidth*img.naturalHeight<=4000000),platform+' PNG stays within canvas budget');
   await p.screenshot({path:'output/playwright/ai-'+platform+'-linked-poster.png'});await p.locator('#modal-close').click();
   await p.locator('#more-pool').click();await p.waitForFunction(()=>Array.from(document.querySelectorAll('.item-card img')).every(img=>img.complete));
   await p.screenshot({path:'output/playwright/ai-'+platform+'-linked-models.png',fullPage:true});
   await p.locator('[data-board="app"]').click();check(await p.locator('#demo-notice').isVisible(),platform+' unrelated App board remains labelled fixture');
   check(errors.length===0,platform+' no page script errors');
  }finally{await context.close();}
 }
 return {passed:checks.length,checks};
}

async(page)=>{
 const base=new URL(page.url()).origin,checks=[];
 function check(ok,label){if(!ok)throw Error(label);checks.push(label);}
 for(const platform of ['toy','xhs'])for(const width of [320,1180]){
  const context=await page.context().browser().newContext({viewport:{width,height:844},hasTouch:true});
  try{
   const p=await context.newPage(),prefix=platform+' '+width+' ',errors=[];p.on('pageerror',e=>errors.push(e.message));
   await p.goto(base+'/dist/'+platform+'/index.html?board=llm');
   check(await p.locator('#period-field').isVisible(),prefix+'period control visible');
   for(const [period,count] of Object.entries({'2025-h1':17,'2025-h2':12,'2026-h1':15,'2026-h2':16})){
    await p.locator('#period').selectOption(period);check(await p.locator('#pool-count').textContent()===String(count),prefix+period+' count');
   }
   await p.locator('#period').selectOption('2025-h1');await p.locator('#provider').selectOption('openai');
   await p.locator('#search').fill('GPT-4');await p.waitForFunction(()=>document.querySelector('#pool-count').textContent==='4');
   check(await p.locator('#pool-count').textContent()==='4',prefix+'combined period brand search');
   await p.locator('[data-item="builtin:llm:openai:gpt-4o"]').tap();await p.locator('#selection-tier').selectOption('hang');
   await p.locator('#clear-filters').tap();check(await p.locator('#period').inputValue()==='all',prefix+'reset period');
   check(await p.locator('[data-dropzone="hang"] [data-item="builtin:llm:openai:gpt-4o"]').count()===1,prefix+'rank retained after reset');
   await p.locator('#period').selectOption('2026-h2');check(await p.locator('[data-dropzone="hang"] .item-card').count()===0,prefix+'outside period hidden');
   await p.reload();check(await p.locator('#period').inputValue()==='2026-h2',prefix+'period persists after reload');
   await p.locator('[data-board="app"]').tap();check(await p.locator('#period-field').isHidden(),prefix+'App has no period filter');
   await p.locator('[data-board="llm"]').tap();check(await p.locator('#period').inputValue()==='2026-h2',prefix+'independent board filter');
   await p.locator('#add-item').tap();await p.locator('input[name="name"]').fill('自定义半年模型');await p.locator('select[name="archivePeriod"]').selectOption('2026-h2');await p.getByRole('button',{name:'添加条目',exact:true}).tap();
   check(await p.locator('#pool-count').textContent()==='17',prefix+'custom period included');
   await p.evaluate(()=>{const render=AITier.poster.render;AITier.poster.render=function(snapshot){window.__periodSummary=snapshot.summary;window.__periodRows=snapshot.rows;return render.apply(this,arguments);};});
   await p.locator('#export').tap();await p.waitForFunction(()=>{const i=document.querySelector('.poster-scroll img');return i&&i.complete&&i.naturalWidth===1080;});
   check(await p.evaluate(()=>window.__periodSummary.includes('2026 下半年')&&Object.values(window.__periodRows).reduce((n,row)=>n+row.length,0)===17),prefix+'poster includes only chosen period and label');
   await p.locator('#modal-close').tap();
   check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),prefix+'no horizontal overflow');
   check(errors.length===0,prefix+'no script errors');
   if(width===320)await p.screenshot({path:'output/playwright/ai-'+platform+'-period-filter.png',fullPage:true});
  }finally{await context.close();}
 }
 return {passed:checks.length,checks};
}

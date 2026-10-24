async(page)=>{
 const base=new URL(page.url()).origin,checks=[];
 function check(ok,label){if(!ok)throw Error(label);checks.push(label);}
 const additions={app:['星野','Qwen Studio','NotebookLM'],llm:['GPT-6.1 Sol','GPT-6 Astra','GPT-5.6 Sol','Claude Fable 5','Claude Sonnet 5.5','Kimi K3','DeepSeek V3.1 Terminus']};
 for(const platform of ['toy','xhs']){
  const context=await page.context().browser().newContext({viewport:{width:390,height:844},hasTouch:true});
  try{
   const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'/dist/'+platform+'/index.html');
   for(const kind of ['app','llm']){
    await p.locator('[data-board="'+kind+'"]').tap();check(await p.locator('#pool-count').textContent()===(kind==='app'?'23':'67'),platform+' '+kind+' updated count');
    for(const name of additions[kind]){
     await p.locator('#search').fill(name);await p.waitForFunction(name=>Array.from(document.querySelectorAll('#pool .card-name')).some(e=>e.textContent===name),name);
     const card=p.locator('#pool .item-card').filter({has:p.getByText(name,{exact:true})});await card.locator('img').evaluate(img=>img.decode());check(await card.locator('img').evaluate(i=>i.naturalWidth>0),platform+' '+name+' searchable and icon decoded');
    }
    await p.locator('#clear-filters').tap();
   }
   for(const [period,count] of Object.entries({'2025-h1':17,'2025-h2':13,'2026-h1':15,'2026-h2':22})){
    await p.locator('#period').selectOption(period);check(await p.locator('#pool-count').textContent()===String(count),platform+' '+period+' updated count');
   }
   await p.locator('#clear-filters').tap();await p.locator('#search').fill('GPT-6.1 Sol');await p.waitForFunction(()=>document.querySelector('#pool-count').textContent==='1');
   await p.locator('#pool .item-card').tap();await p.locator('#selection-tier').selectOption('hang');await p.reload();check(await p.locator('[data-dropzone="hang"] [data-item="builtin:llm:openai:gpt-6.1-sol"]').count()===1,platform+' new model rank survives refresh');
   await p.locator('#export').tap();await p.waitForFunction(()=>{const i=document.querySelector('.poster-scroll img');return i&&i.complete&&i.naturalWidth===1080;});check(true,platform+' new model poster renders');await p.locator('#modal-close').tap();
   check(errors.length===0,platform+' no script errors');
  }finally{await context.close();}
 }
 return {passed:checks.length,checks};
}

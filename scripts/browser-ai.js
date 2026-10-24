async (page) => {
 const browser=page.context().browser(),base=new URL(page.url()).origin,checks=[],errors=[];
 function check(ok,label){if(!ok)throw Error(label);checks.push(label);}
 for(const platform of ['toy','xhs']){
  const context=await browser.newContext({viewport:{width:390,height:844}}),p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
  try{
   await p.goto(base+'/dist/'+platform+'/index.html');const key='ai-tier-list:'+platform+':save:v1';
   const read=()=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
   const waitSaved=()=>p.waitForFunction(k=>!!localStorage.getItem(k),key);
   async function rank(id,t='hang'){await p.locator('[data-item="'+id+'"]').click();await p.locator('#selection-tier').selectOption(t);}
   const id=n=>'builtin:app:example-'+String(n).padStart(2,'0');
   check(await p.title()==='AI 从夯到拉',platform+' product title');
   check(await p.locator('#demo-notice').isVisible(),platform+' explicit fixture banner');
   check(await p.locator('#pool-count').textContent()==='48' && await p.locator('#pool .item-card').count()===40,platform+' full count with batched DOM');
   check(await p.locator('#clear-ranked').isDisabled(),platform+' zero ranked disabled');
   await p.locator('[data-item="'+id(1)+'"]').scrollIntoViewIfNeeded();
   const a=await p.locator('[data-item="'+id(1)+'"]').boundingBox(),b=await p.locator('[data-item="'+id(2)+'"]').boundingBox();
   await p.mouse.move(a.x+a.width/2,a.y+a.height/2);await p.mouse.down();await p.mouse.move(b.x+b.width*.85,b.y+b.height/2,{steps:12});await p.mouse.up();await waitSaved();await p.waitForTimeout(350);
   check((await read()).boards.app.unranked[0]===id(2),platform+' actual mouse same-row drag');
   await rank(id(1));await p.locator('#clear-ranked').click();check(await p.locator('#modal-overlay').isHidden() && await p.locator('[data-dropzone="hang"] .item-card').count()===0,platform+' one clears directly');
   await p.locator('#undo').click();await rank(id(2));await p.locator('#clear-ranked').click();check(await p.locator('#modal-overlay').isHidden() && await p.locator('[data-dropzone="hang"] .item-card').count()===0,platform+' two clears directly');
   await p.locator('#undo').click();await rank(id(3));await p.locator('#clear-ranked').click();check(await p.locator('#modal-title').textContent()==='清空已排',platform+' three requires confirmation');await p.getByRole('button',{name:'取消',exact:true}).click();check(await p.locator('[data-dropzone="hang"] .item-card').count()===3,platform+' cancelled clear unchanged');
   await p.locator('#provider').selectOption('demo-a');await p.locator('#clear-ranked').click();check(await p.locator('[data-dropzone="hang"] .item-card').count()===0,platform+' filtered two clear direct');await p.locator('#clear-filters').click();check(await p.locator('[data-dropzone="hang"] [data-item="'+id(2)+'"]').count()===1,platform+' hidden ranked item retained');
   await p.waitForTimeout(350);await p.reload();check(await p.locator('[data-dropzone="hang"] [data-item="'+id(2)+'"]').count()===1,platform+' refresh keeps ranked position');
   await p.locator('[data-board="llm"]').click();const llmCount=await p.evaluate(()=>AITier.catalogData.items.filter(item=>item.kind==='llm').length);check(Number(await p.locator('#pool-count').textContent())===llmCount,platform+' separate LLM board');await p.locator('[data-board="app"]').click();
   await p.locator('#provider').selectOption('demo-a');await p.locator('#add-item').click();await p.locator('input[name="name"]').fill('我的 AI 🧠');await p.locator('input[name="providerName"]').fill('私人实验室');await p.locator('input[name="subtitle"]').fill('v1');await p.getByRole('button',{name:'添加条目',exact:true}).click();
   check(await p.locator('#modal-title').textContent()==='条目已保存',platform+' filtered custom creation explained');await p.getByRole('button',{name:'清除筛选并查看'}).click();
   check(await p.locator('.item-card.custom').count()===0 && await p.locator('.item-card[data-item^="custom:"]').count()===1,platform+' new custom revealed beyond batch');
   const customId=await p.locator('.item-card[data-item^="custom:"]').getAttribute('data-item');await p.locator('#selection-tier').selectOption('top');await p.locator('#selection-detail').click();await p.locator('input[name="name"]').fill('<img src=x onerror=alert(1)>');await p.getByRole('button',{name:'保存修改',exact:true}).click();
   check(await p.locator('[data-item="'+customId+'"] .card-name').textContent()==='<img src=x onerror=alert(1)>',platform+' user input rendered as text');check(await p.locator('[data-item="'+customId+'"] img').count()===0,platform+' no injected image element');
   await p.locator('#selection-detail').click();await p.getByRole('button',{name:'删除条目',exact:true}).click();await p.getByRole('button',{name:'确认删除',exact:true}).click();check(await p.locator('[data-item="'+customId+'"]').count()===0,platform+' custom deletion removes placement');await p.locator('#undo').click();check(await p.locator('[data-dropzone="top"] [data-item="'+customId+'"]').count()===1,platform+' undo restores custom metadata and tier');
   await p.locator('#add-item').click();await p.locator('input[name="name"]').fill('Example App 01');await p.getByRole('button',{name:'添加条目',exact:true}).click();check(await p.locator('form .error').textContent()!=='',platform+' duplicate requires decision');await p.getByRole('button',{name:'仍然添加同名条目',exact:true}).click();
   await p.locator('#search').fill('no results');await p.waitForTimeout(200);check(await p.locator('#empty-state').isVisible(),platform+' no result state');await p.locator('#clear-filters').click();
   for(const width of [320,390,430,768,1440]){await p.setViewportSize({width,height:844});check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),platform+' responsive '+width);}
   await p.setViewportSize({width:390,height:844});
   await p.locator('#export').click();await p.locator('.poster-scroll img').waitFor();await p.waitForFunction(()=>!!document.querySelector('.poster-scroll img').src);
   check(await p.locator('.pager span').textContent()==='1 / 1',platform+' all 50 entries fit first page');
   await p.locator('select[aria-label="结果图画质"]').selectOption('720');await p.waitForFunction(()=>{const i=document.querySelector('.poster-scroll img');return i && i.complete && i.naturalWidth===720;});
   check(await p.locator('.poster-scroll img').evaluate(i=>i.naturalWidth*i.naturalHeight<=4000000),platform+' PNG dimensions within budget');
   const saveBox=await p.getByRole('button',{name:'保存当前页',exact:true}).boundingBox();check(saveBox.y>=0 && saveBox.y+saveBox.height<=844,platform+' export action visible');
   if(platform==='xhs'){
    await p.evaluate(()=>{window.__notes=[];window.xhs={miniTool:{postNote:async payload=>{window.__notes.push(payload);},writeTempFile:async()=>({filePath:'local/test.png'}),saveImageToPhotosAlbum:async()=>{}}};});
    await p.getByRole('button',{name:'分享到小红书',exact:true}).click();await p.waitForFunction(()=>window.__notes.length===1);check(await p.evaluate(()=>window.__notes[0].mediaInfo.image_resources[0].url.startsWith('data:image/png;base64,')),platform+' native share receives actual PNG data URI');
   }else check(await p.getByRole('button',{name:'分享到小红书',exact:true}).count()===0,'Toy has no XHS native action');
   await p.screenshot({path:'output/playwright/ai-'+platform+'-poster.png'});await p.locator('#modal-close').click();await p.screenshot({path:'output/playwright/ai-'+platform+'-mobile.png',fullPage:true});
   await p.waitForTimeout(350);const saved=await read();check(Object.keys(saved.customItems).length===2,platform+' custom stored with rankings');check(await p.evaluate(()=>!Object.keys(localStorage).some(k=>k.startsWith('ra2-tier-list'))),platform+' no legacy storage touched');
  }finally{await context.close();}
 }
 check(errors.length===0,'no page script errors: '+errors.join(';'));
 return {passed:checks.length,checks};
}

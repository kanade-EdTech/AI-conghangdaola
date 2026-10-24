async(page)=>{
 const browser=page.context().browser(),base=new URL(page.url()).origin,checks=[],metrics=[];
 function check(ok,label){if(!ok)throw Error(label);checks.push(label);}
 const cases=[{width:320,height:568,safe:34},{width:390,height:844,safe:0},{width:430,height:932,safe:34},{width:390,height:844,safe:34,fallback:true}];
 for(const platform of ['toy','xhs'])for(const size of cases){
  const context=await browser.newContext({viewport:{width:size.width,height:size.height},hasTouch:true,isMobile:true});
  const tag=platform+' '+size.width+'x'+size.height+' safe'+size.safe+(size.fallback?' Touch fallback':' Pointer');
  try{
   if(size.fallback)await context.addInitScript(()=>Object.defineProperty(window,'PointerEvent',{value:undefined}));
   const p=await context.newPage(),client=await context.newCDPSession(p),errors=[];p.on('pageerror',error=>errors.push(error.message));
   await p.goto(base+'/dist/'+platform+'/index.html?board=llm');
   await p.evaluate(safe=>document.documentElement.style.setProperty('--safe-area-inset-bottom',safe+'px'),size.safe);
   async function tap(locator){if(!await locator.isVisible())throw Error(tag+' tap target hidden: '+locator.toString());await locator.evaluate(e=>e.scrollIntoView({block:'center'}));const box=await locator.boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;const hit=await locator.evaluate((element,point)=>{const hit=document.elementFromPoint(point.x,point.y);return hit&&element.contains(hit)?null:{id:hit&&hit.id,text:hit&&hit.textContent};},{x,y});if(hit)throw Error(tag+' tap blocked: '+locator.toString()+' by '+JSON.stringify(hit));await p.touchscreen.tap(x,y);}
   async function gesture(from,to,{hold=0,cancel=false}={}){
    await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:from.x,y:from.y}]});
    for(let step=1;step<=10;step++){await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:from.x+(to.x-from.x)*step/10,y:from.y+(to.y-from.y)*step/10}]});await p.waitForTimeout(16);}
    if(hold)await p.waitForTimeout(hold);
    await client.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});
   }
   check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),tag+' no horizontal overflow');
   const nav=p.locator('[data-board="llm"]');check(await nav.evaluate(e=>e.getBoundingClientRect().height>=44),tag+' tab touch target >=44');
   // Scroll on the tier label, outside cards reserved for direct dragging.
   await p.locator('.tier-label.npc').scrollIntoViewIfNeeded();
   const label=await p.locator('.tier-label.npc').boundingBox(),scrollBefore=await p.evaluate(()=>scrollY);
   await gesture({x:label.x+label.width/2,y:Math.min(size.height-150,Math.max(180,label.y+label.height/2))},{x:label.x+label.width/2,y:65});await p.waitForTimeout(100);
   check(await p.evaluate(()=>scrollY)>scrollBefore+20,tag+' native vertical swipe on blank board area');
   check(await p.locator('.drag-ghost').count()===0,tag+' ordinary page swipe does not create a drag');
   const first=p.locator('#pool .item-card').nth(0);await first.scrollIntoViewIfNeeded();let box=await first.boundingBox();await p.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
   check(await p.locator('#selection-bar').isVisible(),tag+' card tap selects once');
   const layout=await p.evaluate(()=>{const selection=document.querySelector('#selection-bar').getBoundingClientRect(),footer=document.querySelector('.action-bar').getBoundingClientRect();return {gap:footer.top-selection.bottom,targets:Array.from(document.querySelectorAll('#selection-bar button,#selection-bar select')).map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})),selectionTop:selection.top};});
   check(layout.gap>=6,tag+' selection bar does not overlap footer');
   check(layout.targets.every(r=>r.width>=44&&r.height>=44),tag+' selection controls all >=44x44');metrics.push({tag,gap:layout.gap,selectionTop:layout.selectionTop});
   const selectedId=await first.getAttribute('data-item');await tap(p.locator('#selection-next'));
   check(await p.locator('#pool .item-card').nth(1).getAttribute('data-item')===selectedId,tag+' touch next moves exactly one position');
   await tap(p.locator('#selection-prev'));check(await p.locator('#pool .item-card').first().getAttribute('data-item')===selectedId,tag+' touch previous restores order');
   await p.locator('#selection-tier').selectOption('hang');await tap(p.locator('#clear-ranked'));
   check(await p.locator('[data-dropzone="hang"] .item-card').count()===0 && await p.locator('#modal-overlay').isHidden(),tag+' one ranked card clears by touch without dialog');
   await tap(p.locator('#undo'));check(await p.locator('[data-dropzone="hang"] .item-card').count()===1,tag+' touch undo restores tier');
   // Same-row direct drag using real touch points.
   if(await p.locator('#selection-close').isVisible())await tap(p.locator('#selection-close'));
   const pending=p.locator('#pool .item-card');await pending.first().scrollIntoViewIfNeeded();const a=await pending.nth(0).boundingBox(),b=await pending.nth(1).boundingBox(),movingId=await pending.nth(0).getAttribute('data-item');
   await gesture({x:a.x+a.width/2,y:a.y+a.height/2},{x:b.x+b.width*.85,y:b.y+b.height/2});
   check(await p.locator('#pool .item-card').nth(1).getAttribute('data-item')===movingId,tag+' touch drag reorders same row');
   // Hold the dragging card at the top edge: the page must scroll upwards.
   await tap(p.locator('#selection-close'));await p.locator('#pool .item-card').first().scrollIntoViewIfNeeded();box=await p.locator('#pool .item-card').first().boundingBox();
   const beforeEdge=await p.evaluate(()=>scrollY);
   await gesture({x:box.x+box.width/2,y:box.y+box.height/2},{x:box.x+box.width/2,y:12},{hold:450,cancel:true});
   const afterEdge=await p.evaluate(()=>scrollY);check(afterEdge<beforeEdge-30,tag+' holding top edge auto-scrolls upward');
   check(await p.locator('.drag-ghost').count()===0,tag+' cancelled edge drag leaves no ghost');
   await p.locator('#pool .item-card').first().evaluate(e=>e.scrollIntoView({block:'center'}));
   const crossCard=p.locator('#pool .item-card').first(),crossId=await crossCard.getAttribute('data-item'),crossFrom=await crossCard.boundingBox(),crossTo=await p.locator('[data-dropzone="la"]').boundingBox();
   await gesture({x:crossFrom.x+crossFrom.width/2,y:crossFrom.y+crossFrom.height/2},{x:crossTo.x+crossTo.width/2,y:crossTo.y+crossTo.height/2});
   check(await p.locator('[data-dropzone="la"] [data-item="'+crossId+'"]').count()===1,tag+' actual touch drag moves pending card into tier');
   await tap(p.locator('#pool .item-card').first());await p.locator('#selection-tier').selectOption('top');
   await tap(p.locator('#clear-ranked'));await p.locator('#modal-overlay').waitFor({state:'visible'});
   check(await p.locator('#modal-title').textContent()==='清空已排',tag+' three cards require confirmation on touch');
   await tap(p.getByRole('button',{name:'取消',exact:true}));await p.locator('#modal-overlay').waitFor({state:'hidden'});
   check(await p.locator('#tier-board .item-card').count()===3,tag+' cancel confirmation preserves all three');
   await tap(p.locator('#clear-ranked'));await tap(p.getByRole('button',{name:'确认清空已排',exact:true}));await p.locator('#modal-overlay').waitFor({state:'hidden'});
   check(await p.locator('#tier-board .item-card').count()===0,tag+' confirmed touch clear returns all three to pool');
   await tap(p.locator('#undo'));check(await p.locator('#tier-board .item-card').count()===3,tag+' one touch undo restores entire confirmed clear');
   await tap(p.locator('#search'));await p.locator('#search').fill('GPT-4o');await p.waitForTimeout(200);
   check(await p.locator('#pool-count').textContent()==='1',tag+' search narrows pending models while ranked match stays ranked');
   await tap(p.locator('#clear-filters'));check((await p.locator('#scope-summary').textContent()).includes('67'),tag+' touch clear filters restores full catalog');
   await tap(p.locator('#add-item'));await p.locator('input[name="name"]').fill('触屏自定义 '+size.width);
   const originalHeight=size.height;await p.setViewportSize({width:size.width,height:Math.min(430,size.height)});
   await tap(p.getByRole('button',{name:'添加条目',exact:true}));await p.setViewportSize({width:size.width,height:originalHeight});
   check(await p.locator('.item-card[data-item^="custom:"]').count()===1,tag+' custom form can save in reduced viewport');
   await tap(p.locator('#selection-close'));await tap(p.locator('#export'));
   await p.waitForFunction(()=>{const i=document.querySelector('.poster-scroll img');return i&&i.complete&&i.naturalWidth>0&&!document.querySelector('select[aria-label="结果图画质"]').disabled;});
   check(await p.locator('.pager span').textContent()==='1 / 2',tag+' result opens by touch and includes all pages');
   check(await p.locator('#toast').isHidden(),tag+' stale success toast cleared on modal open');
   if(platform==='xhs'){
    await p.evaluate(()=>{window.xhs={miniTool:{postNote:async function(){throw {errMsg:'postNote:fail 触屏模拟取消'};}}};});
    await tap(p.getByRole('button',{name:'分享到小红书',exact:true}));await p.waitForFunction(()=>!document.querySelector('#toast').hidden&&!document.querySelector('select[aria-label="结果图画质"]').disabled);
    check(await p.locator('#toast').evaluate(e=>getComputedStyle(e).pointerEvents==='none'),tag+' error toast cannot intercept touch');
   }
   await tap(p.getByRole('button',{name:'下一页 →',exact:true}));await p.waitForFunction(()=>document.querySelector('.pager span').textContent==='2 / 2'&&!document.querySelector('select[aria-label="结果图画质"]').disabled);
   check(await p.locator('.pager span').textContent()==='2 / 2',tag+' touch page button advances once');
   const controlRect=await p.locator('.poster-controls').boundingBox();check(controlRect.y>=0&&controlRect.y+controlRect.height<=size.height,tag+' result action area remains in viewport');
   await tap(p.locator('#modal-close'));check(await p.locator('#modal-overlay').isHidden(),tag+' close result by touch');
   check(errors.length===0,tag+' no page errors');
   if(size.width===320)await p.screenshot({path:'output/playwright/ai-touch-'+platform+'-320.png'});
  }finally{await context.close();}
 }
 return {passed:checks.length,checks,metrics,browserVersion:browser.version(),nativeHost:false};
}

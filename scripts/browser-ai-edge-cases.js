async(page)=>{
 const browser=page.context().browser(),base=new URL(page.url()).origin,checks=[];
 function check(ok,label){if(!ok)throw Error(label);checks.push(label);}
 for(const platform of ['toy','xhs'])for(const fallback of [false,true]){
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  try{
   if(fallback)await context.addInitScript(()=>Object.defineProperty(window,'PointerEvent',{value:undefined}));
   const p=await context.newPage();await p.goto(base+'/dist/'+platform+'/index.html');const tag=platform+' '+(fallback?'Touch fallback':'Pointer touch'),client=await context.newCDPSession(p);
   const first=p.locator('#pool .item-card').nth(0);await first.scrollIntoViewIfNeeded();const a=await first.boundingBox(),b=await p.locator('#pool .item-card').nth(1).boundingBox();
   const x=a.x+a.width/2,y=a.y+a.height/2,tx=b.x+b.width*.85,ty=b.y+b.height/2;
   await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x,y}]});
   for(let n=1;n<=8;n++)await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:x+(tx-x)*n/8,y:y+(ty-y)*n/8}]});
   await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   check(await p.locator('#pool .item-card').first().getAttribute('data-item')==='builtin:app:example-02',tag+' actual touch reorder');
   await p.locator('#selection-tier').selectOption('hang');
   const clear=await p.locator('#clear-ranked').boundingBox();await p.touchscreen.tap(clear.x+clear.width/2,clear.y+clear.height/2);
   check(await p.locator('[data-dropzone="hang"] .item-card').count()===0 && await p.locator('#modal-overlay').isHidden(),tag+' immediate one-card clear tap');
   await p.locator('#undo').click();
   await p.locator('#pool .item-card').first().scrollIntoViewIfNeeded();const c=await p.locator('#pool .item-card').first().boundingBox();
   await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:c.x+30,y:c.y+30}]});
   await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:c.x+40,y:c.y+45}]});
   await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:c.x+40,y:c.y+45},{id:2,x:c.x+60,y:c.y+60}]});
   await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   check(await p.locator('.drag-ghost').count()===0 && await p.locator('[data-dropzone="hang"] .item-card').count()===1,tag+' second touch cancels without commit');
  }finally{await context.close();}
 }
 const context=await browser.newContext({viewport:{width:390,height:844}});
 try{
  const p=await context.newPage(),key='ai-tier-list:xhs:save:v1';await p.goto(base+'/dist/xhs/index.html');
  const seed=await p.evaluate(()=>{const a=window.AITier,e=a.createEngine(a.catalogData);let s=e.initial();for(let i=0;i<5;i++)s=e.custom(s,'app',{name:'多页测试 '+i}).state;return s;});
  await p.addInitScript(({key,seed})=>{if(!sessionStorage.getItem('ai-edge-seeded')){localStorage.setItem(key,JSON.stringify(seed));sessionStorage.setItem('ai-edge-seeded','1');}},{key,seed});await p.reload();
  await p.evaluate(()=>{window.__notes=[];window.__fail=false;window.xhs={miniTool:{postNote:async payload=>{if(window.__fail)throw{errMsg:'postNote:fail cancelled'};window.__notes.push(payload);}}};});
  await p.locator('#export').click();await p.waitForFunction(()=>{const i=document.querySelector('.poster-scroll img');return i&&i.complete&&i.naturalWidth===1080;});
  check(await p.locator('.pager span').textContent()==='1 / 2','53 entries generate two pages');
  await p.getByRole('button',{name:'下一页 →',exact:true}).click();await p.waitForFunction(()=>{const i=document.querySelector('.poster-scroll img');return i&&i.complete&&i.naturalWidth===1080&&!document.querySelector('select[aria-label="结果图画质"]').disabled;});
  await p.locator('select[aria-label="结果图画质"]').selectOption('720');await p.waitForFunction(()=>{const i=document.querySelector('.poster-scroll img');return i&&i.complete&&i.naturalWidth===720;});
  const second=await p.locator('.poster-scroll img').getAttribute('src');
  await p.getByRole('button',{name:'分享到小红书',exact:true}).click();await p.waitForFunction(()=>window.__notes.length===1);
  const images=await p.evaluate(()=>window.__notes[0].mediaInfo.image_resources.map(i=>i.url));
  check(images.length===2 && images[1]===second && images[0]!==images[1],'share both pages in order and reuse current 720 page');
  const sizes=await p.evaluate(async images=>Promise.all(images.map(src=>new Promise(resolve=>{const i=new Image();i.onload=()=>resolve([i.naturalWidth,i.naturalHeight]);i.src=src;}))),images);
  check(sizes.every(s=>s[0]===720&&s[0]*s[1]<=4000000),'all shared PNG pages decode within budget');
  await p.evaluate(()=>window.__fail=true);await p.getByRole('button',{name:'分享到小红书',exact:true}).click();check(await p.getByRole('button',{name:'分享到小红书',exact:true}).isEnabled(),'native cancel unlocks retry');await p.evaluate(()=>window.__fail=false);
  await p.getByRole('button',{name:'分享到小红书',exact:true}).click();await p.waitForFunction(()=>window.__notes.length===2);check(true,'retry succeeds after native cancellation');
  await p.evaluate(()=>{const original=AITier.poster.render;window.__release=null;AITier.poster.render=async(...args)=>{await new Promise(resolve=>window.__release=resolve);return original(...args);};});
  await p.getByRole('button',{name:'分享到小红书',exact:true}).click();await p.waitForFunction(()=>typeof window.__release==='function');await p.locator('#modal-close').click();await p.evaluate(()=>window.__release());await p.waitForTimeout(250);check(await p.evaluate(()=>window.__notes.length===2),'closing during page preparation prevents native share');
  for(const size of [{width:320,height:568},{width:768,height:400}]){await p.setViewportSize(size);await p.locator('#export').click();await p.waitForTimeout(150);const box=await p.locator('#modal-close').boundingBox();check(box.y>=0&&box.y+box.height<=size.height,'close visible '+size.width+'x'+size.height);await p.locator('#modal-close').click();}
 }finally{await context.close();}
 const protectedContext=await browser.newContext();
 try{await protectedContext.addInitScript(()=>localStorage.setItem('ai-tier-list:toy:save:v1','{broken'));const p=await protectedContext.newPage();await p.goto(base+'/dist/toy/index.html');check(await p.locator('#storage-warning').isVisible(),'corrupt save protection UI');await p.locator('[data-board="llm"]').click();await p.waitForTimeout(350);check(await p.evaluate(()=>localStorage.getItem('ai-tier-list:toy:save:v1'))==='{broken','protected original survives user operation');}finally{await protectedContext.close();}
 return {passed:checks.length,checks};
}

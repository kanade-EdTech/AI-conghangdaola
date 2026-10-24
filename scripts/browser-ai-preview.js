async page => {
  const base='http://127.0.0.1:4191', checks=[], browser=page.context().browser();
  const check=(ok,label)=>{if(!ok)throw Error(label);checks.push(label);};
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const errors=[], failed=[];
  try {
    const p=await context.newPage();
    p.on('pageerror',error=>errors.push(error.message));
    p.on('requestfailed',request=>failed.push(request.url()));
    p.on('response',response=>{if(response.status()>=400)failed.push(response.status()+' '+response.url());});
    for(const entry of ['/', '/toy', '/dist/toy/index.html', '/xhs']) {
      const response=await p.goto(base+entry);
      await p.locator('#pool .item-card').first().waitFor();
      const platform=entry==='/xhs'?'xhs':'toy';
      check(response.status()===200,entry+' navigation HTTP 200');
      check(p.url()===base+'/dist/'+platform+'/index.html',entry+' canonical path preserves relative assets');
      check(await p.evaluate(()=>window.AITier && typeof AITier.installDrag==='function' && !!AITier.config),entry+' application scripts initialized');
      check(await p.locator('[data-board="app"]').getAttribute('aria-pressed')==='true',entry+' default App board');
    }
    await p.locator('[data-board="llm"]').click();
    const expected=await p.evaluate(()=>AITier.catalogData.items.filter(item=>item.kind==='llm').length);
    check(Number(await p.locator('#pool-count').textContent())===expected,'LLM board interaction works after opening');
    await p.locator('[data-board="app"]').click();
    await p.locator('#add-item').click();
    await p.locator('input[name="name"]').fill('预览恢复测试');
    await p.getByRole('button',{name:'添加条目',exact:true}).click();
    await p.locator('#selection-tier').selectOption('hang');
    await p.waitForFunction(()=>{const raw=localStorage.getItem('ai-tier-list:xhs:save:v1');return raw&&JSON.parse(raw).boards.app.tiers.hang.length===1;});
    await p.reload();
    check(await p.locator('[data-dropzone="hang"] .card-name').textContent()==='预览恢复测试','ranking and draft survive refresh');
    await p.locator('#clear-ranked').click();
    check(await p.locator('#modal-overlay').isHidden() && await p.locator('[data-dropzone="hang"] .item-card').count()===0,'one-card clear works after refresh');
    for(const width of [320,1440]) {
      await p.setViewportSize({width,height:844});
      check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'layout fits '+width+'px');
    }
    check(errors.length===0,'no JavaScript page errors: '+errors.join(';'));
    check(failed.length===0,'no failed resources: '+failed.join(';'));
    await p.setViewportSize({width:390,height:844});await p.goto(base+'/');
    await p.locator('#pool .item-card').first().waitFor();
    await p.screenshot({path:'output/playwright/ai-preview-open-fixed.png'});
    return {passed:checks.length,checks,browserVersion:browser.version()};
  } finally { await context.close(); }
}

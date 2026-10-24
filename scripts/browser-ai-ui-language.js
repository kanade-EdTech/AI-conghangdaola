async(page)=>{
 const base=new URL(page.url()).origin,checks=[];
 function check(ok,label){if(!ok)throw Error(label);checks.push(label);}
 for(const platform of ['toy','xhs']){
  const context=await page.context().browser().newContext({viewport:{width:320,height:740},hasTouch:true});
  try{
   const p=await context.newPage(),prefix=platform+' ',errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'/dist/'+platform+'/index.html');
   check(await p.getByRole('combobox',{name:'品牌产品',exact:true}).count()===1,prefix+'brand product filter');
   check(await p.locator('#search').getAttribute('placeholder')==='名称、别名或说明…',prefix+'search explanation');
   check(await p.locator('#clear-ranked').textContent()==='清空已排'&&await p.locator('#clear-ranked').isDisabled(),prefix+'clear label and empty disabled');
   check(await p.locator('.section-heading .subtle').textContent()==='拖动卡片，或点按后调档和调整同行顺序。',prefix+'complete interaction hint');
   await p.locator('#help').click();const help=await p.locator('#modal-content').textContent();
   check(help.includes('内置条目随目录更新，排名仅代表你的个人体验。'),prefix+'catalog help');
   check(help.includes('小红书分享进入笔记编辑流程，由你确认是否发布。')===(platform==='xhs'),prefix+'platform-isolated help');await p.locator('#modal-close').click();
   await p.locator('#pool .item-card').first().tap();check(await p.locator('#selection-detail').textContent()==='详情',prefix+'builtin detail action');
   await p.locator('#add-item').click();check(await p.locator('#modal-title').textContent()==='添加自定义条目',prefix+'add title');
   check((await p.locator('#modal-content').textContent()).includes('品牌产品（选填，最多30字）')&&(await p.locator('#modal-content').textContent()).includes('简短说明（选填，最多40字）'),prefix+'consistent form labels');
   await p.locator('input[name="name"]').fill('豆包');await p.getByRole('button',{name:'添加条目',exact:true}).click();
   check(await p.locator('.error').textContent()==='当前榜单已有同名条目，是否继续？',prefix+'duplicate prompt');await p.getByRole('button',{name:'继续添加',exact:true}).click();
   check(await p.locator('.custom-dot').last().textContent()==='自建',prefix+'custom badge');check(await p.locator('#selection-detail').textContent()==='编辑',prefix+'custom edit action');
   await p.locator('#selection-detail').click();check(await p.locator('#modal-title').textContent()==='编辑自定义条目',prefix+'edit title');await p.locator('input[name="name"]').fill('DeepSeek');await p.getByRole('button',{name:'保存修改',exact:true}).click();
   check(await p.getByRole('button',{name:'继续保存',exact:true}).isVisible(),prefix+'duplicate edit confirmation');await p.getByRole('button',{name:'继续保存',exact:true}).click();
   await p.locator('#source').selectOption('builtin');await p.locator('#add-item').click();await p.locator('input[name="name"]').fill('筛选隐藏示例');await p.getByRole('button',{name:'添加条目',exact:true}).click();
   check((await p.locator('#modal-content').textContent()).includes('受当前筛选条件限制，该条目暂未显示，但内容与排名已保存。'),prefix+'filtered item explanation');await p.getByRole('button',{name:'清除筛选并查看',exact:true}).click();
   for(let i=0;i<3;i++){await p.locator('#pool .item-card').first().tap();await p.locator('#selection-tier').selectOption('hang');}
   await p.locator('#clear-ranked').click();check(await p.locator('#modal-title').textContent()==='清空已排'&&await p.getByRole('button',{name:'确认清空已排',exact:true}).isVisible(),prefix+'clear confirmation wording');await p.getByRole('button',{name:'确认清空已排',exact:true}).click();
   check((await p.locator('#toast').textContent()).includes('3 张已排卡片，可撤销'),prefix+'clear toast wording');await p.locator('#undo').click();check(await p.locator('[data-dropzone="hang"] .item-card').count()===3,prefix+'clear remains undoable');
   await p.locator('[data-board="llm"]').click();check((await p.locator('#period-field').textContent()).startsWith('发布时段'),prefix+'period filter wording');check(await p.locator('#period option[value="unknown"]').textContent()==='未标注时段',prefix+'unmarked period wording');
   await p.locator('#provider').selectOption('z-ai');check((await p.locator('#provider option:checked').textContent())==='Z.ai（智谱）'&&(await p.locator('#scope-summary').textContent()).includes('Z.ai（智谱）'),prefix+'Z.ai display');
   await p.locator('#export').click();await p.waitForFunction(()=>{const i=document.querySelector('.poster-scroll img');return i&&i.complete&&i.naturalWidth===1080;});
   const exportText=await p.locator('#modal-content').textContent();check(exportText.includes('分享到小红书')===(platform==='xhs'),prefix+'platform-isolated result actions');
   if(platform==='toy')check(exportText.includes('点击「保存当前页」可下载图片；若 App 内无响应，请使用系统截图。'),prefix+'download hint');
   else {await p.getByRole('button',{name:'保存当前页',exact:true}).click();check(await p.locator('#toast').textContent()==='当前环境暂不支持直接保存，请使用系统截图保存结果图',prefix+'unsupported save hint');}
   await p.locator('#modal-close').click();await p.locator('#clear-filters').click();await p.locator('#period').selectOption('unknown');await p.locator('#add-item').click();check((await p.locator('#modal-content').textContent()).includes('发布时段（选填）')&&await p.locator('select[name="archivePeriod"] option:checked').textContent()==='未标注时段',prefix+'custom period form');
   await p.locator('input[name="name"]').fill('我的无时段模型');await p.getByRole('button',{name:'添加条目',exact:true}).click();check((await p.locator('#scope-summary').textContent()).includes('未标注时段')&&await p.locator('#pool-count').textContent()==='1',prefix+'unmarked filter still works');
   check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),prefix+'no horizontal overflow');check(errors.length===0,prefix+'no script errors');
   const seed=await p.evaluate(()=>AITier.createEngine(AITier.catalogData).initial()),backupContext=await page.context().browser().newContext();
   try{
    await backupContext.addInitScript(({seed,platform})=>{const key='ai-tier-list:'+platform+':save:v1';localStorage.setItem(key,'{broken');localStorage.setItem(key+':backup',JSON.stringify(seed));},{seed,platform});
    const b=await backupContext.newPage();await b.goto(base+'/dist/'+platform+'/index.html');await b.locator('#restore-backup').click();
    check((await b.locator('#modal-content').textContent()).includes('原存档将先备份保留，并恢复到最近一次可用记录。')&&!(await b.locator('#modal-content').textContent()).includes('字节'),prefix+'backup confirmation');
    await b.getByRole('button',{name:'确认恢复',exact:true}).click();check(await b.locator('#storage-warning').isHidden(),prefix+'backup restore still works');
   }finally{await backupContext.close();}
  }finally{await context.close();}
 }
 return {passed:checks.length,checks};
}

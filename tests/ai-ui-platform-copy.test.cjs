const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('platform save hints use user-facing language and keep download on Toy only',async()=>{
 const fallback='当前环境暂不支持直接保存，请使用系统截图保存结果图';
 for(const platform of ['toy','xhs']){
  const window={AITier:{}},document={createElement:()=>({})};
  vm.runInNewContext(fs.readFileSync(require.resolve('../src/ai/platforms/'+platform+'.js'),'utf8'),{window,document});
  assert.equal(await window.AITier.platform.saveImage('data:image/png;base64,aGVsbG8=','test.png'),fallback);
  if(platform==='toy'){assert.equal(window.AITier.platform.hint,'点击「保存当前页」可下载图片；若 App 内无响应，请使用系统截图。');assert.equal(window.AITier.platform.shareImages,undefined);}
 }
});
test('brand display correction changes Z.ai labels without changing provider IDs',async()=>{
 const {prepareCatalog}=await import('../scripts/ai-catalog.mjs'),catalog=await prepareCatalog();
 assert.equal(catalog.providers['z-ai'],'Z.ai（智谱）');const models=catalog.items.filter(v=>v.providerId==='z-ai');assert.ok(models.length>0);assert.ok(models.every(v=>v.providerName==='Z.ai（智谱）'&&v.id.startsWith('builtin:llm:z-ai:')));
});

const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),core=require('../src/ai/core.js');
async function render(entries,width=1080){
 const drawn=[],dimensions=[],ctx={measureText:text=>({width:Array.from(text).length*8}),scale(){},fillRect(){},drawImage(){},fillText(text,x,y){drawn.push({text,x,y});}};
 const canvas={getContext:()=>ctx,toDataURL(){dimensions.push([this.width,this.height]);return 'data:image/png;base64,test';}},app=Object.assign({},core);
 vm.runInNewContext(fs.readFileSync(require.resolve('../src/ai/poster.js'),'utf8'),{window:{AITier:app},document:{createElement:()=>canvas},setTimeout,clearTimeout});
 const rows={};core.locations.forEach(l=>rows[l]=[]);rows.hang=entries.map((v,i)=>Object.assign({id:'builtin:llm:test-'+i,kind:'llm',subtitle:'2026年下半年'},v));
 await app.poster.render({title:'测试',summary:'语言模型',date:'2026-10-24',rows},0,width);
 return {drawn,dimensions};
}
test('poster puts Claude and the model version on separate baselines',async()=>{
 const {drawn}=await render([{name:'Claude Opus 5.5'},{name:'Claude Sonnet 5.5'},{name:'Claude 3.7 Sonnet'}]);
 for(const suffix of ['Opus 5.5','Sonnet 5.5','3.7 Sonnet']){const second=drawn.find(v=>v.text===suffix);assert.ok(second);assert.ok(drawn.some(v=>v.text==='Claude'&&v.x===second.x&&v.y===second.y-18));}
 assert.ok(!drawn.some(v=>v.text==='Claude Opus 5.5'));
});
test('poster keeps DeepSeek base version above full variant/date suffix at both resolutions',async()=>{
 for(const width of [720,1080]){
  const {drawn,dimensions}=await render([{name:'DeepSeek V4.1 Flash 1017'},{name:'DeepSeek V4 Pro 0423'},{name:'DeepSeek V3.1 Terminus'}],width);
  for(const [base,suffix] of [['DeepSeek V4.1','Flash 1017'],['DeepSeek V4','Pro 0423'],['DeepSeek V3.1','Terminus']]){const first=drawn.find(v=>v.text===base);assert.ok(first);assert.ok(drawn.some(v=>v.text===suffix&&v.x===first.x&&v.y===first.y+18));}
  assert.equal(dimensions[0][0],width);assert.ok(dimensions[0][0]*dimensions[0][1]<=4000000);
 }
});
test('poster leaves App and unrelated model labels intact and wraps long custom suffixes safely',async()=>{
 const name='Claude '+('Extended '.repeat(5)).trim(),{drawn}=await render([{kind:'app',name:'Claude'},{name:'GPT-6.1 Sol'},{name:'DeepSeek V3.2'},{name}]);
 for(const text of ['GPT-6.1 Sol','DeepSeek V3.2'])assert.ok(drawn.some(v=>v.text===text));
 const lines=drawn.filter(v=>v.x===645&&v.y>=339&&v.y<=411);assert.ok(lines.length>1);assert.equal(lines[0].text,'Claude');assert.ok(lines.every(v=>v.text.length*8<=133));
});

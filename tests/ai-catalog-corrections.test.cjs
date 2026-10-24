const test=require('node:test'),assert=require('node:assert/strict'),core=require('../src/ai/core.js');
test('confirmed half-years override source pack, Google Play identity preserves ranking ID',async()=>{
 const {prepareCatalog}=await import('../scripts/ai-catalog.mjs');
 const catalog=await prepareCatalog(),expected={
  'openai:gpt-6.1-sol':'2026-h2','openai:gpt-6-astra':'2026-h2','openai:gpt-5.6-sol':'2026-h2',
  'anthropic:claude-fable-5':'2026-h2','anthropic:claude-sonnet-5.5':'2026-h2','moonshotai:kimi-k3':'2026-h2','deepseek:deepseek-v3.1-terminus':'2025-h2'
 };
 for(const [suffix,period] of Object.entries(expected))assert.equal(catalog.items.find(v=>v.id==='builtin:llm:'+suffix).archivePeriod,period);
 const studio=catalog.items.find(v=>v.id==='builtin:app:web:qwen-studio');
 assert.deepEqual(studio.appIdentity,{store:'google-play',packageId:'ai.qwenlm.chat.android'});
 assert.deepEqual(studio.sources,['https://play.google.com/store/apps/details?id=ai.qwenlm.chat.android']);assert.equal(studio.subtitle,'Google Play');assert.ok(studio.aliases.includes('Qwen'));
 const old=core.clone(catalog);old.catalogRevision='before-confirmation';old.items.find(v=>v.id===studio.id).subtitle='国内';old.items.find(v=>v.id==='builtin:llm:anthropic:claude-fable-5').archivePeriod='2026-h1';
 const previous=core.createEngine(old),current=core.createEngine(catalog);let state=previous.initial();state=previous.move(state,'app',studio.id,'hang');state=previous.move(state,'llm','builtin:llm:anthropic:claude-fable-5','top');
 const migrated=current.reconcile(state);assert.deepEqual(migrated.boards.app.tiers.hang,[studio.id]);assert.deepEqual(migrated.boards.llm.tiers.top,['builtin:llm:anthropic:claude-fable-5']);
 assert.ok(!current.visible(current.setFilters(migrated,'llm',{period:'2026-h1'}),'llm').includes('builtin:llm:anthropic:claude-fable-5'));
 assert.ok(current.visible(current.setFilters(migrated,'llm',{period:'2026-h2'}),'llm').includes('builtin:llm:anthropic:claude-fable-5'));
});

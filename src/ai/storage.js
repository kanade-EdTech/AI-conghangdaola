(function (global) {
  'use strict';
  global.AITier.createStorage = function (storage,key,engine) {
    var protectedMode=false;
    function read() {
      var raw;
      try { raw=storage.getItem(key); if(!raw) return {state:engine.initial(),message:'新草稿 · 仅保存在本机'};
        if(raw.length>2000000)throw new Error('存档过大');
        var parsed=JSON.parse(raw), state=engine.reconcile(parsed);
        return {state:state,message:parsed.catalogRevision!==state.catalogRevision?'目录已更新，已有排名已保留':'已恢复本机草稿'};
      } catch(error) { protectedMode=true; return {state:engine.initial(),protected:true,message:'原存档无法读取，已保护原数据。当前为临时会话。'}; }
    }
    function save(state) {
      if(protectedMode) throw new Error('原存档受保护：当前为临时会话，不覆盖原数据');
      engine.validate(state); var next=global.AITier.clone(state); next.savedAt=new Date().toISOString();
      var prior=storage.getItem(key);
      if(prior) { try { engine.reconcile(JSON.parse(prior)); storage.setItem(key+':backup',prior); } catch(error) { if(error && error.name==='QuotaExceededError') throw error; } }
      storage.setItem(key,JSON.stringify(next)); return '已保存到本机';
    }
    function restart() {
      // Preserve exact original bytes before explicitly replacing a protected draft.
      var prior=storage.getItem(key); if(prior) storage.setItem(key+':protected:'+Date.now(),prior);
      var fresh=engine.initial(); storage.setItem(key,JSON.stringify(fresh)); protectedMode=false; return fresh;
    }
    function backup() {
      var raw=storage.getItem(key+':backup'); if(!raw) throw new Error('没有可恢复的备份');
      var state=engine.reconcile(JSON.parse(raw)), original=storage.getItem(key);
      if(original) storage.setItem(key+':protected:'+Date.now(),original);
      storage.setItem(key,JSON.stringify(state)); protectedMode=false; return state;
    }
    return {read:read,save:save,restart:restart,backup:backup,isProtected:function(){return protectedMode;}};
  };
})(window);

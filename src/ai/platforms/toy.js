(function (global) {
  'use strict';
  global.AITier.platform = {
    name: 'toy',
    saveImage: function (data, filename) {
      var link = document.createElement('a');
      if (!('download' in link)) return Promise.resolve('当前环境暂不支持直接保存，请使用系统截图保存结果图');
      link.href = data; link.download = filename; link.style.display = 'none';
      document.body.appendChild(link); link.click(); link.remove();
      return Promise.resolve('已发起图片下载；若 App 内无响应，请使用系统截图。');
    },
    hint: '点击「保存当前页」可下载图片；若 App 内无响应，请使用系统截图。'
  };
})(window);

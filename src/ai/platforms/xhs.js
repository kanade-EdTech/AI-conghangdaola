(function (global) {
  'use strict';
  global.AITier.platform = {
    name: 'xhs',
    canShareImages: function () {
      var bridge = global.xhs && global.xhs.miniTool;
      return !!bridge && typeof bridge.postNote === 'function';
    },
    shareImages: async function (images, details) {
      var bridge = global.xhs && global.xhs.miniTool;
      if (!bridge || typeof bridge.postNote !== 'function') throw new Error('请在小红书小工具内使用分享，也可先保存图片');
      if (!Array.isArray(images) || !images.length || images.length > 18 || images.some(function (data) {
        return typeof data !== 'string' || !/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(data);
      })) throw new Error('分享图片无效，请重新生成结果图');
      details = details || {};
      await bridge.postNote({
        title: Array.from(details.title || 'AI Tier List').slice(0, 20).join(''),
        content: Array.from(details.content || '').slice(0, 1000).join(''),
        pageType: 'photo_publish',
        mediaInfo: { image_resources: images.map(function (data) { return { url: data }; }) }
      });
      return '已交给小红书处理，请在笔记编辑页确认发布';
    },
    saveImage: async function (data) {
      var bridge = global.xhs && global.xhs.miniTool;
      if (!bridge || typeof bridge.writeTempFile !== 'function' || typeof bridge.saveImageToPhotosAlbum !== 'function') {
        return '当前环境暂不支持直接保存，请使用系统截图保存结果图';
      }
      var result = await bridge.writeTempFile({ data: data });
      if (!result || !result.filePath) throw new Error('未取得图片临时文件，请重试');
      await bridge.saveImageToPhotosAlbum({ filePath: result.filePath });
      return '图片已保存到相册';
    },
    hint: '分享将带上全部结果页，可在笔记编辑页修改后发布；也可保存当前页。'
  };
})(window);

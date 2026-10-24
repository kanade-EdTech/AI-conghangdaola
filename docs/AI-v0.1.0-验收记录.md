# AI 从夯到拉：0.1.0-dev.1 本地验收记录

日期：2026-10-22。用户授权“启动开发”。交付为可操作的双端本地开发预览，不是正式名单版，也未上传Toy、提交审核、推送GitHub或公开发布小红书笔记。

## 已实现

- AI App / LLM 独立排名，首次默认App，之后恢复使用的榜；五档、待排名、标题和每榜筛选持久化。
- 搜索名称/别名/副标题，品牌、分类、内置/自定义来源筛选；筛选投影与可见槽位合并，保留隐藏排名和同行相互顺序。
- 鼠标与Pointer/Touch回退拖动、同行插入、边缘滚动、多指/失焦取消、点按调档与前后移动。
- 清空场上：0禁用、1/2直接、3及以上确认，只清当前范围的已排名项，可撤销。
- 自定义增改删、重名确认、字段长度和每榜50项限额、纯文本防注入、短字色块图标。编辑保留ID与位置，删除和元数据同时撤销。
- 自定义添加后可展开定位超过第40项的卡片；被筛选隐藏时显示成功说明和查看入口。
- 每榜20步会话撤销，本榜恢复不回滚另一榜；自动保存、失败反馈、备份、损坏/未知版本保护与明确恢复入口。
- 名单新增/改名/移除/同ID恢复协调，移除项保留快照和位置；稳定ID避免版本改名错绑。
- 结果图冻结快照、完整当前范围含待排名、每页最多50项、720/1080画质、像素预算、空档、分页预览与固定操作区。
- Toy浏览器保存；小红书相册与笔记编辑器适配，完整data URI、页序、字数/张数限制、失败/取消重试、准备阶段关闭不再调用原生。
- 新应用命名空间、存档键、运行资源白名单、按内容哈希去重、独立平台版本、禁止覆盖历史ZIP和旧发布目标的守卫。

## 当前数据与阶段

尚未收到 `data/ai-apps.json` / `data/llm-models.json`，实际名单与模型粒度仍由另一会话负责。当前明确使用 `tests/fixtures/ai.catalog.json`：48个虚构App、12个虚构模型。没有采集真实品牌图标，统一短字色块。正式构建缺名单会失败。

A0 已隔离；A1 接口/校验/fixture已完成，真实名单与真实素材待接；A2～A4 已实现并通过下列检查；A5 本地静态与浏览器通过，真实App/旧WebView待验；A6 已生成开发预览包和交接材料，正式内容验收及发布身份仍待完成。

## 验证证据

`npm test`：**23项**全部通过。覆盖双榜不变量、稳定ID、筛选同行和跨档合并、局部清空、别名/全角搜索、自定义事务及上限、跨榜撤销、目录改名/新增/移除/恢复、损坏存档、配额失败、备份恢复、小红书调用契约以及发布目标守卫。

`scripts/browser-ai.js`：**65项**通过，两平台分别验证鼠标真实同行拖动、清空阈值及取消、隐藏卡保留、刷新、LLM独立、筛选下新增自定义、超过40项定位、文本注入防护、编辑删除撤销、重名确认、零结果、五种宽度、PNG解码尺寸、可见保存按钮和分享参数。输出保存在 `output/ai-browser-main.log`。

`scripts/browser-ai-edge-cases.js`：**22项**通过。两平台各覆盖Pointer触屏与禁用Pointer后的Touch回退，使用CDP触摸事件验证重排、紧接触摸的直接清空、多指取消；53项两页海报、从第2页720画质分享全部页、真实PNG可解码、原生取消后重试、准备期间关闭不调用原生、窄屏/横屏关闭按钮、坏存档原字节保护。

共计 **87项浏览器检查**。运行环境为本机实际Chromium；确切版本可从 `output/ai-browser-environment.json` 查看。截图位于 `output/playwright/ai-toy-mobile.png`、`ai-xhs-mobile.png`、`ai-toy-poster.png`、`ai-xhs-poster.png`。

`node scripts/ai-check.mjs`：两端文件清单和SHA-256、相对资源、游戏内容隔离、禁用能力、HTML结构、核心初始化、**ES2017 Acorn解析**通过。语法解析使用当前Node内置Acorn，未临时安装依赖；其他Node若无内置解析器会明确报WARN，不能视为同等语法验证。

小工具技能审计：`dist/xhs` 与最终ZIP均通过，**0警告**。ZIP根入口和CRC通过。重点旧源码与用户设计文件与基线哈希一致；仅根package和README按新项目用途更新，原README已保存历史副本。

预计失败门禁亦已检查：无正式名单时 `node scripts/ai-build.mjs` 退出失败；新Toy目标空缺时 `node scripts/ai-release-target.mjs toy` 拒绝发布。它们是预期保护行为，不是未修复的产品异常。

## 开发预览包

| 平台 | 文件 | 文件数 | ZIP字节 | 解压字节 | SHA-256 |
| --- | --- | --- | --- | --- | --- |
| Toy | `release/ai-tier-list-toy-0.1.0-dev.1.zip` | 13 | 27,985 | 89,595 | `d6920c8b38a5b295f70e67fbd433fe9826406717ba3f33a217ce87768c6534aa` |
| 小红书 | `release/ai-tier-list-xhs-0.1.0-dev.1.zip` | 13 | 28,501 | 90,917 | `2d4ee9dad7d1acb30c637816512e582e1e35e3654f41f7aa6a6c2d3b471bc306` |

各包清单为 `release/ai-<platform>-0.1.0-dev.1-manifest.json`。预览包均明确为虚构数据，不能作为正式名单产品发布。不存在真实AI条目或真实图标的数量/来源验收。

## 未实测与后续

1. 正式名单、模型粒度、真实素材来源到位后，执行正式构建并重新检查搜索、图标、计数、长名称和海报；当前脚本的48/12示例断言仅适用于fixture。
2. 小红书 `postNote/writeTempFile/saveImageToPhotosAlbum` 采用模拟接口；实际App中的图片交付、编辑器打开、相册权限/保存未实测。Chrome61和iOS真机未实测。未声称真实发布成功或达到具体帧率。
3. 图片缺失回退、快照冻结、边缘滚动和页面中断取消已有代码路径，但未穷举全部失败时序与设备。正式数据可能带来新的布局和素材问题，应补充针对性检查。
4. 新GitHub远程和Toy ID/slug待指定；旧origin没有修改。之后取得发布授权再核对目标、预览及审核。

## 复现

```powershell
npm run build:demo
npm test
npm run check
node scripts/serve.mjs 4191
# 用Playwright CLI打开http://127.0.0.1:4191/dist/toy/index.html
# run-code --filename scripts/browser-ai.js
# run-code --filename scripts/browser-ai-edge-cases.js
npm run package
python C:/Users/墨家修士/.agents/skills/minitool-zip-builder/scripts/audit_artifact.py release/ai-tier-list-xhs-0.1.0-dev.1.zip
```

后续实施以 [开发计划](AI从夯到拉-开发计划-v0.1.0.md)、[数据接入说明](AI-数据接入说明.md)和本记录交叉核对，禁止把旧红警验收或当前fixture结果当成真实AI名单版已经验收。

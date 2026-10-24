# AI 项目隔离记录

日期：2026-10-22。当前根目录 `F:\VS_Code_Project\AI-conghangdaola`。

## 改造方式

采用独立 `src/ai` 源码和 `scripts/ai-*` 构建工具，在新目录内保留旧源码、历史ZIP和文档，避免覆盖另一会话及复制来的未提交工作。根 `package.json` 已改为AI项目并指向新工具；根README改为AI入口，原README完整副本保存为 `docs/legacy-ra2-README.md`。

通用输入状态机、命中检测、拖动和平台适配器从当前副本复制到AI目录，改用 `window.AITier` 和 `.item-card`。排序、目录、自定义、存储、页面与海报为AI独立实现。旧游戏目录解析与存档迁移不进入AI运行链。

修改前基线位于 `output/ai-baseline/baseline.json`，记录原远程、工作区状态与重点文件SHA-256；根package和README原字节另有 `.before` 副本。`output` 为本地工作记录，不进入ZIP。

## 身份隔离

- 应用ID：`ai-tier-list`，运行命名空间：`window.AITier`。
- Toy存档：`ai-tier-list:toy:save:v1`；小红书：`ai-tier-list:xhs:save:v1`，各有备份键。无红警存档读取或迁移。
- 两端各自构建到 `dist/toy`、`dist/xhs`，只复制新白名单；旧游戏素材不进入包。
- 新发行名为 `ai-tier-list-<platform>-<version>.zip`，不覆盖 `ra2-tier-list-*`。
- `ai-project.json` 的GitHub与Toy发布目标留空。`scripts/ai-release-target.mjs` 会拒绝缺失目标、红警Toy ID `43912508997632`、slug `ra2-conghangdaola` 和原红警GitHub仓库。

Git `origin` 仍保留原地址，本轮未修改Git远程、推送、创建线上作品或提交审核。新工具没有上传入口；今后接入发布流程时须调用发布目标守卫并核对真实目标。保留的旧发布脚本属于历史材料，不是AI发布工具。

## 数据和证据边界

未收到最终真实名单，当前仅生成 `0.1.0-dev.1` 虚构示例预览。正式构建缺任一名单即失败；不会悄悄使用fixture出正式包。没有AI官方图标采集行为，目前均用稳定ID色块。

浏览器的Toy、小红书分别验证草稿键；通过新项目操作不会创建红警存档。小红书桥接为模拟测试，原生App与Chrome61真机未实测。旧项目的测试与发布记录不作为本项目验收证据。

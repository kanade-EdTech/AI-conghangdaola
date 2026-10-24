# AI 从夯到拉

用拖动和点按，把 AI App 与语言模型排进“夯、顶级、人上人、NPC、拉”五档。适配 B站 Toy 和小红书 minitool，数据与排名保存在本机。

[Toy 在线使用](https://www.bilibili.com/toy/ai-conghangdaola/index.html) · [GitHub](https://github.com/kanade-EdTech/AI-conghangdaola)

## 当前版本

**0.1.4**：23 款 App、67 款语言模型，共 90 个内置条目；37 张去重后的本地图标。支持添加、编辑和删除自己的条目。

- App 与语言模型两榜分别保存排名、同行顺序、标题和筛选。
- 支持品牌产品、分类、来源、搜索及模型发布时段组合筛选；切换筛选不丢失排名。
- 模型时段分为 2025 上半年／下半年、2026 上半年／下半年，数量分别为 17、13、15、22；依照项目资料及用户确认维护，不保证代表模型首次发布日期。
- “清空已排”只处理当前筛选下的已排条目；3 张及以上先确认，支持撤销。
- 支持本机备份恢复及存档异常保护。Toy 与小红书使用独立存储键，不自动跨设备同步。
- 结果图支持 720／1080 画质、分页与模型名称分行。小红书内可保存相册或携带全部分页进入笔记编辑页，由用户确认发布。

## 本地运行

需要 Node.js 22 或更新版本，以及 Python 3.9 或更新版本。无需安装第三方 npm 依赖。

```sh
npm run dev
```

打开 <http://127.0.0.1:4191/>。小红书页面为 <http://127.0.0.1:4191/xhs>。

Windows 可双击 `启动AI预览.cmd`，或执行 `npm run preview:start` 启动后台预览。双榜资料已内置，不依赖本机原始研究资料包。

## 构建、测试与打包

```sh
npm test
npm run build
npm run check
npm run package
```

产物位于 `dist/toy`、`dist/xhs`，ZIP 位于 `release`。正式构建要求两份真实名单齐备；`npm run build:demo` 用于开发预览，缺名单时明确展示示例提示。旧版本 ZIP 不允许被不同内容覆盖。

当前版本通过 49 项自动测试和 58 项双端界面检查。浏览器交互检查脚本位于 `scripts/browser-ai*.js`，需另行准备 Playwright CLI；运行前先启动本地预览。小红书原生桥接通过模拟测试，实体手机及真实小红书容器仍待验证。

## 最新下载

- [Toy 0.1.4 ZIP](release/ai-tier-list-toy-0.1.4.zip)
- [小红书 minitool 0.1.4 ZIP](release/ai-tier-list-xhs-0.1.4.zip)

包体约 2.69MiB，超过项目建议的 2MiB，低于小红书 10MiB 上限。2026-10-24 已将 Toy 0.1.4 提交审核并保留公开设置；实时审核结果以平台为准。

## 项目结构

| 目录 | 用途 |
| --- | --- |
| `src/ai` | 页面、排序、拖动、存档、结果图及平台适配 |
| `data` | App／模型名单、图标映射及用户确认修正 |
| `assets/ai-icons` | 随包交付的本地图标和来源清单 |
| `scripts/ai-*` | 构建、检查、打包、本地预览与发布目标保护 |
| `tests` | 自动测试与示例数据 |
| `docs` | 开发计划、提示词、数据接入与验证记录 |
| `release` | 最新平台包与提交记录 |

用户确认的修正位于 `data/ai-catalog-overrides.json`，优先于原始导入资料。发布及更新目标配置在 `ai-project.json`；不得将 AI 包提交到旧红警作品或仓库。

- [开发计划](docs/AI从夯到拉-开发计划-v0.1.0.md)
- [开发提示词](docs/AI从夯到拉-开发提示词-v0.1.0.md)
- [数据与图标接入](docs/AI-数据接入说明.md)
- [0.1.4 界面文案记录](docs/2026-10-24-界面文案统一.md)
- [0.1.4 Toy 审核记录](docs/2026-10-24-Toy-0.1.4审核记录.md)

## 许可

项目代码采用 [MIT License](LICENSE)。应用图标及商标归各权利人所有，不因本仓库的 MIT 协议而变更授权；LobeHub 图标的 MIT 授权声明保留在素材目录。详见 [第三方素材说明](THIRD_PARTY_NOTICES.md)。

# Toy 审核与小红书 minitool 导出

日期：2026-10-23。用户明确授权提交审核及导出带图片分享功能的小红书包。

## Toy

- 作品：AI 从夯到拉；ID：`47043330441216`；slug：`ai-conghangdaola`；分类 TOOL。
- 已提交用户确认的 `0.1.0-dev.5` ZIP，状态 `auditing`（审核中）。未宣称已通过或公开发布，沿用 link-only 默认可见性。
- 本次提交返回预览：https://www.bilibili.com/toy/preview/author_t8gaCdsL/index.html
- Toy 首次上传在分片上传时超时；重试报 `307009 缺少必要文件`。补齐独立的 AI 产品封面（1200×900）及图标（512×512，11603 字节）后成功。图片按现有界面风格排版生成，未使用旧红警素材。
- `release/ai-toy-submission-0.1.0-dev.5.json` 保存返回值、包路径及 SHA256；`ai-project.json` 绑定新作品身份，后续更新应使用此 ID，不能再新建。
- doctor 无 ERROR，只有资源文件未带内容指纹的建议，已告知用户。已授权审核，不再请求重复确认。

## 小红书包

- 交付：`release/ai-tier-list-xhs-0.1.0.zip`。
- 大小：2696582 字节；48 个文件；入口 `index.html` 位于根目录。
- SHA256：`1faeef8278687ab68a8bcf93ba275110a4af53e2543bac17456025df38741483`。
- 包含 20 款 App、60 款语言模型、本地图标、四个半年归档筛选、存档及自定义条目等当前功能。
- 本地预览启动器按资料齐备情况重新构建为正式 `0.1.0`；导出使用这份已验证构建。相对于 dev.5，业务内容相同，版本配置采用 `0.1.0`；dev.5 历史包保留。未改动 Toy 已提交 ZIP。
- XHS 分享功能此前已实现，本次核验后直接随包导出，没有为导出重复修改业务代码。

## 使用及验证

在小工具中选择榜单和筛选、完成排名，点击“生成结果图”，在图片预览中点击“分享到小红书”。通过 `window.xhs.miniTool.postNote` 传入完整 PNG data URI，按页序提交全部结果页，进入笔记编辑流程，用户自行确认发布。保存相册通过 `writeTempFile` 和 `saveImageToPhotosAlbum`，只保存当前预览页。

- 5 项平台契约测试通过。
- 新增 `scripts/browser-ai-minitool-share.js`，9 项浏览器分享专项通过：60 模型两页、分享按钮、页序及原生参数、PNG 解码和像素预算、当前页相册保存、取消后解锁、重试成功、按半年筛选后只分享一页、普通浏览器提示宿主要求。
- 使用模拟 `window.xhs.miniTool` 验证参数和用户流程；未测试实体手机的小红书容器，不把模拟成功写成真机发布成功。
- 两端业务代码未修改；正式 XHS 产物静态检查、资源哈希、项目隔离、禁用能力扫描与 ES2017 解析通过。ZIP 审计通过，约 2.57MiB 超过 2MiB 建议值，低于 10MiB 上限，已向用户说明。

使用的技能：[Toy](C:/Users/墨家修士/.agents/skills/toy/SKILL.md)、[minitool-zip-builder](C:/Users/墨家修士/.agents/skills/minitool-zip-builder/SKILL.md)。

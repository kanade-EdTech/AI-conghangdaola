# AI 名单与素材接入

更新：2026-10-23。`data/llm-models.json` 已接入用户资料包中的60款模型，图标关联见[逐项图片链接](AI-LLM图片链接.md)。App名单尚未提供，开发预览仅App榜保留48个示例。`tests/fixtures/ai.catalog.json` 中的原始48个App与12个LLM继续用于确定性的纯逻辑测试，不代表实际收录名单。

## 输入文件

由名单会话维护 `data/ai-apps.json` 和 `data/llm-models.json`。每个文件可为条目数组，或包含 `catalogRevision/items/providers/categories` 的对象。对象格式推荐如下：

```json
{
  "catalogRevision": "2026-10-22.1",
  "providers": { "example-lab": "示例开发者（仅格式示意）" },
  "categories": { "chat": "对话" },
  "items": [
    {
      "id": "builtin:app:example-assistant",
      "kind": "app",
      "name": "示例助手（仅格式示意）",
      "aliases": [],
      "providerId": "example-lab",
      "providerName": "",
      "categoryIds": ["chat"],
      "subtitle": "",
      "iconKey": null,
      "lifecycle": "unknown",
      "sources": ["填写真实官方资料URL"],
      "verifiedAt": "2026-10-22"
    }
  ]
}
```

上述条目只是格式示意，不得直接作为已核验数据发行。LLM 文件使用 `kind: llm` 和 `builtin:llm:...` ID。ID 尾部限字母、数字、点、下划线、冒号及连字符，不接受 `__proto__`；显示名不要用于生成后续会变化的ID。模型粒度以用户和名单会话决定为准。

必需身份字段为 `id/kind/name`。名称1～40字、副标题0～40字、开发者显示文字0～30字，按Unicode码点计数。别名最多20个、单个最多80字；分类最多12个。`providerId/iconKey` 可为空；缺图标使用首字短字色块。

正式构建要求每个内置条目有核验日期和非空来源字符串数组。此门禁验证结构，不证明URL内容已人工核验；名单维护者仍需核对事实。生命周期支持 `active/preview/deprecated/retired/unknown`，不明填 `unknown`。

`modelIdentity` 为可选原始身份记录；程序不靠此字段决定是否按版本或系列建卡。不同供应商的无日期模型ID含义可能不同，勿按名称猜测。

## 图标清单

可选文件 `assets/ai-icons/manifest.json`：

```json
{
  "icons": [
    {
      "key": "example-lab",
      "path": "assets/ai-icons/example-lab.png",
      "source": "填写真实素材来源URL",
      "acquiredAt": "2026-10-22",
      "usageNotes": "填写使用说明",
      "sha256": "填写实际文件哈希"
    }
  ]
}
```

支持 PNG/WebP/JPG/JPEG；路径限 `assets/ai-icons` 内安全相对路径，不允许 `..`。条目 `iconKey` 必须存在于清单，或为空。构建期以实际文件 SHA-256 去重；重复图标仅保留一个物理文件，条目ID保持独立。正式名单没有图标清单也能构建，只要条目不引用不存在的 `iconKey`。

两个输入文件若同用字典键，应提供一致显示名称。源文件由名单会话控制；构建只读，不回写输入。已有其他结构可先协商适配 `scripts/ai-catalog.mjs`，不要直接覆盖运行代码。

## 构建

```powershell
# 开发预览：使用已到位的真实榜，缺失的榜保留示例提示
npm run build:demo

# 正式名单齐备后：无名单会报错，不会自动退回示例
npm run build
npm run check
npm test
npm run package
```

开发版使用 `ai-project.json` 中每平台的 `previewVersion`，正式版使用 `version`。打包脚本不允许相同版本ZIP内容发生变化，修改发行内容后应先递增对应平台版本。`package.json` 当前记录开发版本，不代替各平台发行版本配置。

## 名单更新

改名保留ID，新增身份用新ID。新增进入待排名；移除条目保存原位置与快照到 `unavailablePlacements`，相同ID恢复时回位；所有协调都通过完整排名不变量校验。不要用刷新名单覆盖用户自定义条目。真实名单接入前后的截图和计数需重新验收，当前虚构名单的测试计数不构成真实名单验收。

## 图片关联

`data/ai-image-links.json` 支持 `items`（稳定条目ID）、`families`（familyId）、`providers`（providerId）三个映射对象，值为图标清单中的key。优先级为逐项映射 → 条目原有iconKey → 家族映射 → 品牌映射；不按模糊名称猜图标。原始名单不用为了换图片而改名或换ID。

正式与开发预览均读取相同图片清单。构建检查路径边界、文件存在、PNG/JPEG/WebP签名、重复key和可选SHA-256。使用到的图片进入包，未使用图片不进入；同内容图片只保留一个文件。页面与海报共用关联结果，加载异常才显示短字回退。

`npm run images:check -- --demo` 列出当前开发预览的图片路径；加 `--require-all` 时有缺图返回失败。当前LLM为60/60，App为0/48（尚未提供真实素材）；分榜覆盖与逐项结果保存在 `output/ai-image-links-toy.json` 和 `output/ai-image-links-xhs.json`。

用户提供的LLM资料包通过以下可重现命令导入；源包只读，按CSV而非汇总款数建立60个稳定模型ID与15个图片映射。导入器遇到非自身生成的既有LLM名单会拒绝覆盖。

```powershell
python scripts/import-llm-image-pack.py "output/LLM模型图标_2025-2026_60款"
npm run build:demo
```

LobeHub图标的MIT声明保存在 `assets/ai-icons/LobeHub-Icons-LICENSE.txt`，并随有图片的构建写入 `catalog.js` 注释，离线包内同样保留声明。
# 用户确认修正的优先级

`data/ai-catalog-overrides.json` 的用户确认值在源目录导入后、构建和图标验证前应用。源资料包保持只读，重新导入不能覆盖用户指定的分期及应用身份。当前修正含七款模型的半年归档以及 Qwen Studio 的 Google Play 来源；详细记录见 [用户确认分期与商店版](2026-10-23-用户确认分期与Qwen商店版.md)。读取运行数据应使用 `prepareCatalog()`，不能把未经修正的原始 JSON 当作最终构建目录。


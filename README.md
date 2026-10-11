# The Kallang 工作地图

适用于电脑和手机的响应式网站，直接显示用户提供的完整 The Kallang 原图。场馆点击、高亮和设施标记使用独立图层；原图文件不重绘、不转换、不压缩。

## 使用原本的地图

在网站点击「选择原图」，选择完整横版地图的 JPG、PNG 或 WebP 文件。图片原始字节保存在当前浏览器的 IndexedDB 中，刷新后仍会显示；清除浏览器网站数据会删除这份本地缓存。

若要所有设备自动显示同一张图，请[直接上传原图到 GitHub](https://github.com/yasakomsaki-hash/TKG-agent/upload/main/public/maps)，完成提交后等待 Pages 部署：

1. 将完整原图放进 `public/maps/`，保持原来的文件内容。
2. 目录只有一张图片时，文件名可以不改。若有多张图片，将默认图命名为 `site-map.jpg`、`site-map.png` 或 `site-map.webp`，并只保留一个 `site-map` 文件。
3. 构建会自动选取原图并随网站一起部署。已有本地图片的浏览器继续显示自己的选择。

当前聊天提供了原图预览，但执行环境没有得到该图片的二进制附件；`public/maps/` 暂无默认图片。没有图片时，网站会明确提示选择原图。图片到位后还需要对真实底图做场馆边界的视觉核对。

点击图层基于提供图片的 1684 × 1190 坐标，使用同一完整地图的更高分辨率版本也可以。请勿裁剪原图，否则点击区域会错位。新增共享原图后，本地开发服务器需重新启动以读取文件。

## 已实现

- 场馆搜索与简称：OCBC Arena、AQC、NST、KTH、SIS，以及 Kallang Wave Mall 等场馆。
- 点击场馆或设施后，其他区域变成黑白，选中区域保留颜色并显示明亮边框。
- 储物柜、饮水机、制冰机标签筛选；透明 PNG 图标由图像生成工具制作。
- 编辑模式：点击地图添加设施、填写所属场馆和说明、修改、重新定位、删除。
- 原始地图文件在浏览器本地保存；设施 JSON 备份导出、校验与合并导入。
- 地图拖动、缩放和重置，手机与电脑布局。

初版的设施数据为空，因为准确位置尚未提供；不会预设未经确认的 locker、饮水机或制冰机位置。场馆名称与相对布局来自用户提供的参考地图；官网请求返回 403 / 503，现时场馆资讯尚待核实。WACA 的当前用途需要单独确认。

## 开发

Node.js 22.12+（云环境和 CI 使用 Node.js 24）。

```bash
npm ci
npm run dev
```

生产构建和预览：

```bash
npm run build
npm run preview
```

云环境使用已有 `/workspace/TKG-agent`，不需要另建 Git worktree。如果默认 npm 缓存不可写：

```bash
export npm_config_cache=/tmp/tkg-npm-cache
npm ci --no-audit --no-fund
```

## GitHub Pages

网站地址：[The Kallang 工作地图](https://yasakomsaki-hash.github.io/TKG-agent/)。

`.github/workflows/pages.yml` 会在 `main` 更新时构建和部署网站。首次需要仓库 **Settings → Pages → Build and deployment → Source → GitHub Actions**。如果 Actions 未启用，先启用它。随后进入 **Actions → Deploy work map to GitHub Pages → Run workflow → main** 运行首次部署，或重新运行已失败的部署。部署进度可在仓库的 Actions 中查看。

仓库必须符合 GitHub Pages 的账户方案要求：公开仓库可以使用 GitHub Free；私有仓库需要支持 Pages 的方案。本项目不会自动修改仓库可见性。

仓库现已公开，GitHub Pages 已启用，使用 GitHub Actions 部署。此前首次启用受集成权限限制；当前公网网站已可使用。

Vite 使用相对资源路径，图标和设施 JSON 在 `/TKG-agent/` 子路径下也可加载。没有后端、API 密钥或外部字体依赖。

## 保存设施位置

「编辑地图」中的修改自动保存到**当前浏览器**的 localStorage。其他设备不会自动同步；清除网站数据或使用隐私模式可能导致本地记录丢失。

1. 在编辑模式中选择设施标签，点击「添加设施」，再点击地图位置。
2. 填写名称、设施类型、所属场馆及详细位置说明，然后保存。
3. 使用「导出备份」下载 `tkg-locations.json`。
4. 在其他设备使用「导入数据」。导入按设施 ID 合并；同一 ID 使用导入记录，其他记录保留；无效文件不会覆盖原有资料。
5. 若想让所有访问者看到相同设施，把导出的 JSON 内容保存为 `public/data/locations.json`，提交到 `main`，等待 Pages 部署完成。已有本地记录的浏览器仍使用本地版本，可导入最新备份进行更新。

网站不直接持有 GitHub 凭据，也不会自动将浏览器编辑推送到仓库。可以把导出的 JSON 交给 Codex 提交并推送。共享内容包括代码、图标，以及明确上传并提交的原图和设施 JSON。

旧版示意图上保存的设施不会被删除或猜测性移动。它们会带上 `needsPositionReview` 标记；请在编辑模式中使用「重新选择位置」，在原图上重新定位。已有说明、名称和 ID 均保留。JSON 导出记录 `mapId`；原图坐标备份可以直接恢复，旧备份会提示检查位置。

JSON 格式：

```json
{
  "version": 1,
  "mapId": "original-map-1684x1190-v1",
  "locations": [
    {
      "id": "unique-id",
      "type": "water",
      "name": "由你填写的设施名称",
      "venueId": "aqc",
      "description": "由你确认的楼层与位置说明",
      "x": 300,
      "y": 250
    }
  ]
}
```

`type` 为 `locker`、`water` 或 `ice`。坐标属于 SVG 的 1200 × 900 坐标系；建议使用地图编辑器定位。上面的数据仅展示文件结构，不表示真实设施位置。

## 验证

```bash
npm run build
npx playwright install chromium
npm test
```

云环境已有系统 Chromium，无需下载：

```bash
TKG_CHROMIUM_PATH=/usr/bin/chromium npm test
```

10 项测试覆盖图片字节完整保留、刷新后恢复图片、无效图片拒绝、原图高亮、旧设施保护与重新定位，以及场馆搜索、设施编辑、导入导出和手机触屏操作。测试使用明确标注的人工色块图检查文件与交互，测试图片不会作为产品底图发布。可使用 `TKG_TEST_URL` 对已启动的生产预览运行同一套测试。

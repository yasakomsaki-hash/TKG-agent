# The Kallang 工作地图

适用于电脑和手机的响应式网站。基于提供的 The Kallang 场地图，重绘为 SVG 工作定位示意图；不是按比例的路线导航。

## 已实现

- 场馆搜索与简称：OCBC Arena、AQC、NST、KTH、SIS，以及 Kallang Wave Mall 等场馆。
- 点击场馆或设施后，其他区域变成黑白，选中区域保留颜色并显示明亮边框。
- 储物柜、饮水机、制冰机标签筛选；透明 PNG 图标由图像生成工具制作。
- 编辑模式：点击地图添加设施、填写所属场馆和说明、修改、重新定位、删除。
- 浏览器本地自动保存，JSON 备份导出、校验与合并导入。
- 地图拖动、缩放和重置，手机与电脑布局。

初版的设施数据为空，因为准确位置尚未提供；不会预设未经确认的 locker、饮水机或制冰机位置。场馆名称与相对布局来自用户提供的参考地图；官网访问目前受云环境网络限制，现时场馆资讯尚待核实。WACA 的当前用途需要单独确认。

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

部署目标是 `https://yasakomsaki-hash.github.io/TKG-agent/`。这个地址只有 GitHub Pages 成功发布后才可使用。

`.github/workflows/pages.yml` 会在 `main` 更新时构建和部署网站。首次需要仓库 **Settings → Pages → Build and deployment → Source → GitHub Actions**。如果 Actions 未启用，先启用它。部署进度可在仓库的 Actions 中查看。

仓库必须符合 GitHub Pages 的账户方案要求：公开仓库可以使用 GitHub Free；私有仓库需要支持 Pages 的方案。本项目不会自动修改仓库可见性。

Vite 使用相对资源路径，图标和设施 JSON 在 `/TKG-agent/` 子路径下也可加载。没有后端、API 密钥或外部字体依赖。

## 保存设施位置

「编辑地图」中的修改自动保存到**当前浏览器**的 localStorage。其他设备不会自动同步；清除网站数据或使用隐私模式可能导致本地记录丢失。

1. 在编辑模式中选择设施标签，点击「添加设施」，再点击地图位置。
2. 填写名称、设施类型、所属场馆及详细位置说明，然后保存。
3. 使用「导出备份」下载 `tkg-locations.json`。
4. 在其他设备使用「导入数据」。导入按设施 ID 合并；同一 ID 使用导入记录，其他记录保留；无效文件不会覆盖原有资料。
5. 若想让所有访问者看到相同设施，把导出的 JSON 内容保存为 `public/data/locations.json`，提交到 `main`，等待 Pages 部署完成。已有本地记录的浏览器仍使用本地版本，可导入最新备份进行更新。

网站不直接持有 GitHub 凭据，也不会自动将浏览器编辑推送到仓库。可以把导出的 JSON 交给 Codex 提交并推送。GitHub 中只保存代码、图标和已提交的设施 JSON。

JSON 格式：

```json
{
  "version": 1,
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

测试覆盖场馆搜索与黑白高亮、设施新增 / 编辑 / 移动 / 删除、刷新后保留记录、导出、导入校验与合并，以及手机布局。可使用 `TKG_TEST_URL` 对已启动的生产预览运行同一套测试。

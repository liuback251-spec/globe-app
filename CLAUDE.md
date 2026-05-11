# 3D Interactive Globe

Three.js 3D 可交互地球，悬停显示国家信息，支持搜索和飞行定位。

## 技术栈
- Three.js 0.160.0 (CDN, importmap)
- 纯 HTML/CSS/JS，无构建工具
- GitHub Pages 部署

## 项目结构
- `index.html` — 页面入口
- `css/style.css` — 全部样式
- `js/main.js` — 场景、渲染循环、事件串联
- `js/globe.js` — 球体、纹理、大气层
- `js/picking.js` — Picking texture 国家识别
- `js/countries.js` — 国家数据查询
- `js/camera-controls.js` — 飞行动画
- `js/ui.js` — 信息面板、搜索
- `assets/data/` — GeoJSON + 国家信息 JSON
- `assets/textures/` — 地球纹理

## 约束
- ES modules (import/export)，不用 CommonJS
- 所有外部依赖走 CDN
- 纹理必须是等距圆柱投影 (equirectangular)
- 色彩空间：纹理设 `colorSpace = THREE.SRGBColorSpace`
- picking texture 设 `flipY = false`

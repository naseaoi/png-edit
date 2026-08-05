# 图片批量处理

浏览器端的图片批量处理工具。文件只在当前浏览器中读取和处理，不上传服务器。

## 功能

- 批量选择、拖放或读取文件夹中的 PNG、JPG 和 WebP
- 背景、尺寸、边距、透明输出与压缩均可独立启用
- PNG、JPG 与 WebP 共用统一的图片压缩质量设置
- 模块开关状态保存在当前浏览器中，首次使用时全部关闭
- 串行处理、进度显示和取消
- 单张下载或打包为 ZIP
- 修改参数后自动使旧结果失效

## 输出规则

- 关闭的设置模块不参与处理，其内部参数变化也不会使已有结果失效
- 默认保留原图片格式；启用背景颜色时输出 JPG，启用保留透明时输出 PNG
- 图片压缩对 JPG、WebP 使用浏览器原生质量编码；PNG 在不透明图像上优先使用调色板压缩，含透明像素时保留 RGBA 编码；质量 100% 时 PNG 无损
- 边距启用后可分别设置上、右、下、左四边
- 文件名会清洗 Windows 保留字符，ZIP 中的重复名称会自动编号

## 输入限制

- 支持 PNG、JPG/JPEG 和静态 WebP
- 最多 100 张图片
- 单张不超过 25 MB，批次总大小不超过 250 MB
- 原图最大边长 16,384px，总像素不超过 4,000 万
- 文件夹递归最多 20 层，最多读取 500 个文件

## 开发

~~~bash
corepack pnpm install --frozen-lockfile
pnpm dev
~~~

默认访问 `http://localhost:3000`。
项目锁定 pnpm 10.7.1，并明确允许构建链所需的原生安装脚本，无需运行交互式 `pnpm approve-builds`。

~~~bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm audit --prod
~~~

## 结构

~~~text
app/                         Next.js App Router
components/image-processor/  页面编排、上传区、参数台、任务队列
hooks/                       设置与批处理状态
lib/image-validation.ts      图片签名、格式、尺寸和输入边界校验
lib/image-processing.ts      模块化处理配置、Canvas 输出和文件命名
lib/file-system.ts           文件夹递归读取
~~~

## 许可

MIT

# PNG 批量处理

浏览器端的 PNG 批量处理工具。文件只在当前浏览器中读取和处理，不上传服务器。

## 功能

- 批量选择、拖放或读取文件夹中的 PNG
- 填充预设或自定义背景色
- 添加四边透明边框
- 串行处理、进度显示和取消
- 单张下载或打包为 ZIP
- 修改参数后自动使旧结果失效

## 输出规则

- 未启用透明边框：输出 JPG，默认质量 90%
- 启用透明边框：输出 PNG，边框区域保留 alpha 透明度
- 文件名会清洗 Windows 保留字符，ZIP 中的重复名称会自动编号

## 输入限制

- 最多 100 张图片
- 单张不超过 25 MB，批次总大小不超过 250 MB
- 原图最大边长 16,384px，总像素不超过 4,000 万
- 文件夹递归最多 20 层，最多读取 500 个文件

## 开发

~~~bash
pnpm install
pnpm dev
~~~

默认访问 `http://localhost:3000`。

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
lib/image-validation.ts      PNG 签名、尺寸和输入边界校验
lib/image-processing.ts      Canvas 输出和文件命名
lib/file-system.ts           文件夹递归读取
~~~

## 许可

MIT

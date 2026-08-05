import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '图片批量处理',
  description: '在浏览器中批量调整、压缩和处理 PNG、JPG 与 WebP 图片',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}

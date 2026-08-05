import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PNG 批量处理',
  description: '批量填充 PNG 背景并设置边距与透明边框',
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

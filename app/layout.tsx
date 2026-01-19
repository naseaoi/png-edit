import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PNG图片绿幕处理',
  description: '给PNG图片添加各种颜色的绿幕',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 求职",
  description: "基于真实经历，为目标岗位定制简历。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}


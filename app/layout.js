import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// app/layout.js

export const metadata = {
  title: "SHIORI | 専門ブックマークアーカイブ", // ← ここがタブに表示される名前
  description: "自分だけの特別なコレクションを整理するためのパーソナルアーカイブ",
  // おまけ：スマホでホーム画面に追加した時のアイコンなどの設定もここで行います
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

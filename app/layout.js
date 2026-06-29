import "./globals.css";

export const metadata = {
  title: "Cafe MORE 日報",
  description: "Cafe MORE の日報・勤怠アプリ",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, title: "Cafe MORE", statusBarStyle: "default" },
};

export const viewport = {
  themeColor: "#2A211B",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}

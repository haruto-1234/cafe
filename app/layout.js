import "./globals.css";

export const metadata = {
  title: "Cafe MORE 日報",
  description: "Cafe MORE の日報・勤怠アプリ",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}

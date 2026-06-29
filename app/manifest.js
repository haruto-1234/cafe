// PWA（ホーム画面に追加できるアプリ）の情報
export default function manifest() {
  return {
    name: "Cafe MORE 日報",
    short_name: "Cafe MORE",
    description: "Cafe MORE の日報・勤怠アプリ",
    start_url: "/",
    display: "standalone",
    background_color: "#E9DFCC",
    theme_color: "#2A211B",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}

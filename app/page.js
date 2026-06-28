export default function Home() {
  return (
    <div className="wrap">
      <header>
        <div className="brand">
          <span aria-hidden="true" style={{ fontSize: 20, lineHeight: 1 }}>
            ☕
          </span>
          <h1>
            <span className="cafe">Cafe</span>
            <span className="more">
              MORE<i></i>
            </span>
          </h1>
          <span className="sub">日報</span>
        </div>

        <div className="head-row" style={{ justifyContent: "flex-end" }}>
          <span className="mode demo">
            <span className="dot" style={{ background: "#E7C98A" }}></span>
            デモ表示
          </span>
        </div>
      </header>

      <main>
        <div className="empty">
          <div className="em-ic">☕</div>
          <h3>Next.js 版のスタートです</h3>
          <p>ここに日報や勤怠を少しずつ移していきます。</p>
        </div>
      </main>
    </div>
  );
}

// ☕ ヘッダー部品（コンポーネント）
// ログイン中は名前・役割・ログアウトボタンも表示する。
import { roleLabel } from "@/lib/constants";

export default function Header({ profile, onLogout, onPwChange }) {
  return (
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

      {profile && (
        <div className="head-row">
          <span className="who">
            {profile.full_name || "名無し"}
            <span className="who-role">{roleLabel(profile.role)}</span>
          </span>
          <span style={{ display: "flex", gap: 6 }}>
            <button type="button" className="logout" onClick={onPwChange}>
              パスワード変更
            </button>
            <button type="button" className="logout" onClick={onLogout}>
              ログアウト
            </button>
          </span>
        </div>
      )}

      <div className="head-row" style={{ justifyContent: "flex-end" }}>
        <span className="mode live">
          <span className="dot" style={{ background: "#7FD3A1" }}></span>
          本番
        </span>
      </div>
    </header>
  );
}

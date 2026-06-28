"use client"; // 入力・クリック・状態を使うのでブラウザで動かす部品

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toEmail } from "@/lib/constants";

export default function Login({ onLoggedIn }) {
  const [no, setNo] = useState(""); // スタッフ番号
  const [pw, setPw] = useState(""); // パスワード
  const [showPw, setShowPw] = useState(false); // パスワードを表示するか
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false); // 処理中か

  // Supabaseのエラーを日本語に
  function errorJa(e) {
    const m = e?.message || String(e);
    if (/Invalid login credentials/i.test(m))
      return "スタッフ番号またはパスワードが違います。";
    if (/Email not confirmed/i.test(m))
      return "メール確認設定がONです。Supabaseで『Confirm email』をOFFにしてください。";
    return "うまくいきませんでした：" + m;
  }

  async function submit() {
    if (!no) return setError("スタッフ番号を入力してください。");
    if (!pw) return setError("パスワードを入力してください。");
    setError("");
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: toEmail(no),
        password: pw,
      });
      if (error) throw error;

      // 退職（無効化）されたアカウントははじく
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const { data: prof } = await supabase
        .from("profiles")
        .select("active")
        .eq("id", session.user.id)
        .single();
      if (prof && prof.active === false) {
        await supabase.auth.signOut();
        setError("このアカウントは無効です。管理者にお問い合わせください。");
        return;
      }

      onLoggedIn(); // ログイン成功をAppShellに知らせる
    } catch (e) {
      setError(errorJa(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen" style={{ display: "flex" }}>
      <div className="card auth-card">
        <p className="form-title">
          <span className="bar"></span>Cafe MORE にログイン
        </p>

        <div className="field">
          <label htmlFor="authStaffNo">スタッフ番号</label>
          <input
            id="authStaffNo"
            type="text"
            inputMode="numeric"
            placeholder="例：1001"
            autoComplete="username"
            value={no}
            onChange={(e) => setNo(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="authPassword">パスワード</label>
          <div className="pw-wrap">
            <input
              id="authPassword"
              type={showPw ? "text" : "password"}
              placeholder="6文字以上"
              autoComplete="current-password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
            <button
              type="button"
              className="pw-toggle"
              onClick={() => setShowPw(!showPw)}
            >
              {showPw ? "隠す" : "表示"}
            </button>
          </div>
        </div>

        {error && <div className="error show">{error}</div>}

        <button
          className="submit"
          type="button"
          onClick={submit}
          disabled={busy}
        >
          {busy ? "処理中…" : "ログイン"}
        </button>

        <a
          href="/kiosk"
          style={{
            display: "block",
            textAlign: "center",
            marginTop: 16,
            fontSize: 13,
            fontWeight: 700,
            color: "var(--ink2)",
            textDecoration: "none",
          }}
        >
          📟 打刻はこちら（共有タブレット用）
        </a>
      </div>
    </div>
  );
}

"use client"; // 入力・保存を行うのでブラウザで動かす部品

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// ログイン中の自分のパスワードを変更する画面。
export default function PwChange({ onClose }) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setError("");
    if (!a || a.length < 6)
      return setError("パスワードは6文字以上にしてください。");
    if (a !== b) return setError("2つのパスワードが一致しません。");
    if (!confirm("パスワードを変更します。よろしいですか？")) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: a });
      if (error) throw error;
      alert("パスワードを変更しました");
      onClose();
    } catch (e) {
      setError("変更できませんでした：" + (e?.message || ""));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen" style={{ display: "flex" }}>
      <div className="card auth-card">
        <p className="form-title">
          <span className="bar"></span>パスワードの変更
        </p>

        <div className="field">
          <label htmlFor="pwNew">新しいパスワード</label>
          <input
            id="pwNew"
            type="password"
            placeholder="6文字以上"
            autoComplete="new-password"
            value={a}
            onChange={(e) => setA(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="pwNew2">もう一度</label>
          <input
            id="pwNew2"
            type="password"
            placeholder="確認のため再入力"
            autoComplete="new-password"
            value={b}
            onChange={(e) => setB(e.target.value)}
          />
        </div>

        {error && <div className="error show">{error}</div>}

        <button className="submit" type="button" onClick={save} disabled={busy}>
          {busy ? "変更中…" : "変更する"}
        </button>
        <button
          className="act-btn"
          type="button"
          style={{ width: "100%", marginTop: 8 }}
          onClick={onClose}
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}

"use client"; // 登録・退職・役割変更を行うのでブラウザで動かす部品

import { useEffect, useState } from "react";
import { supabase, createTempClient } from "@/lib/supabaseClient";
import { STORES, roleLabel, toEmail } from "@/lib/constants";
import { ALL_ROLES, canManageRoles, assignableRoles } from "@/lib/permissions";

// スタッフ管理（管理者・店長だけに表示）。
export default function StaffPanel({ profile }) {
  const [staff, setStaff] = useState([]);
  // 新規登録フォーム
  const [no, setNo] = useState("");
  const [name, setName] = useState("");
  const [store, setStore] = useState(STORES[0].name);
  const [role, setRole] = useState("part");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const allowed = assignableRoles(profile);

  async function loadStaff() {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: true });
    if (!error) setStaff(data || []);
  }

  useEffect(() => {
    loadStaff();
  }, []);

  // 権限が無い人には何も出さない
  if (!canManageRoles(profile)) return null;

  async function createStaff() {
    setError("");
    if (!no) return setError("スタッフ番号を入力してください。");
    if (!name) return setError("名前を入力してください。");
    if (!pw || pw.length < 6)
      return setError("初期パスワードは6文字以上にしてください。");
    setBusy(true);
    try {
      // 一時クライアントで作成 → 自分（管理者）のログインは切れない
      const temp = createTempClient();
      const { data, error } = await temp.auth.signUp({
        email: toEmail(no),
        password: pw,
        options: { data: { staff_no: no, full_name: name, store } },
      });
      if (error) throw error;
      // 役割が「パート」以外なら、管理者の権限で設定し直す
      if (role !== "part" && data && data.user) {
        const { error: e2 } = await supabase
          .from("profiles")
          .update({ role })
          .eq("id", data.user.id);
        if (e2) console.error(e2);
      }
      setNo("");
      setName("");
      setPw("");
      await loadStaff();
      alert(name + " を登録しました");
    } catch (e) {
      setError("登録できませんでした：" + (e?.message || ""));
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(p, newRole) {
    if (newRole === p.role) return;
    const ok = confirm(
      `${p.full_name || "このスタッフ"} の役割を「${roleLabel(
        p.role
      )}」→「${roleLabel(newRole)}」に変更します。よろしいですか？`
    );
    if (!ok) {
      setStaff((prev) => [...prev]); // キャンセル時：選択を元に戻すため描き直す
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", p.id);
    if (error) {
      alert("変更できませんでした");
      setStaff((prev) => [...prev]);
      return;
    }
    setStaff((prev) =>
      prev.map((s) => (s.id === p.id ? { ...s, role: newRole } : s))
    );
    alert(`${p.full_name || "スタッフ"} を「${roleLabel(newRole)}」にしました`);
  }

  async function toggleActive(p) {
    const toInactive = p.active !== false; // いま在籍中なら→退職へ
    const msg = toInactive
      ? `${p.full_name || "このスタッフ"} を退職（無効化）します。ログインできなくなります。よろしいですか？`
      : `${p.full_name || "このスタッフ"} を復帰させます。よろしいですか？`;
    if (!confirm(msg)) return;
    const { error } = await supabase
      .from("profiles")
      .update({ active: !toInactive })
      .eq("id", p.id);
    if (error) {
      alert("変更できませんでした");
      return;
    }
    setStaff((prev) =>
      prev.map((s) => (s.id === p.id ? { ...s, active: !toInactive } : s))
    );
    alert(toInactive ? "退職にしました" : "復帰しました");
  }

  return (
    <section className="card form">
      <p className="form-title">
        <span className="bar"></span>スタッフ管理
      </p>

      {/* 新規登録 */}
      <div className="staff-add">
        <p className="staff-add-title">新しいスタッフを登録</p>
        <div className="row">
          <div className="field">
            <label htmlFor="newStaffNo">スタッフ番号</label>
            <input
              id="newStaffNo"
              type="text"
              inputMode="numeric"
              placeholder="例：1004"
              value={no}
              onChange={(e) => setNo(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="newStaffName">名前</label>
            <input
              id="newStaffName"
              type="text"
              maxLength={40}
              placeholder="例：鈴木"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label>店舗</label>
          <div className="seg" role="group" aria-label="店舗を選択">
            {STORES.map((s) => {
              const on = s.name === store;
              return (
                <button
                  key={s.name}
                  type="button"
                  className={on ? "on" : ""}
                  style={
                    on ? { background: s.color, borderColor: s.color } : undefined
                  }
                  onClick={() => setStore(s.name)}
                >
                  {s.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="row">
          <div className="field">
            <label htmlFor="newStaffRole">役割</label>
            <select
              id="newStaffRole"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {allowed.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="newStaffPw">初期パスワード</label>
            <input
              id="newStaffPw"
              type="text"
              placeholder="6文字以上"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
            />
          </div>
        </div>

        {error && <div className="error show">{error}</div>}

        <button
          className="submit"
          type="button"
          onClick={createStaff}
          disabled={busy}
        >
          {busy ? "登録中…" : "このスタッフを登録する"}
        </button>
      </div>

      {/* 役割の割り当て・退職／復帰 */}
      <p className="form-title" style={{ marginTop: 22 }}>
        <span className="bar"></span>役割の割り当て
      </p>

      <div>
        {!staff.length ? (
          <p className="staff-meta">スタッフがまだいません。</p>
        ) : (
          staff.map((p) => {
            const inactive = p.active === false;
            const isSelf = p.id === profile.id;
            // 自分の役割は変えられない（誤って権限を外す事故ふせぎ）
            const canEdit =
              !isSelf &&
              (allowed.includes(p.role) || allowed.length === ALL_ROLES.length);
            return (
              <div
                className="staff-row"
                key={p.id}
                style={inactive ? { opacity: 0.55 } : undefined}
              >
                <div className="staff-main">
                  <div className="staff-name">
                    {(p.full_name || "名無し") + (inactive ? "（退職）" : "")}
                  </div>
                  <div className="staff-meta">
                    番号 {p.staff_no || "未設定"}　{p.store || "店舗未設定"}
                  </div>
                </div>

                {isSelf ? (
                  <span className="me-tag">{roleLabel(p.role)}（あなた）</span>
                ) : !canEdit ? (
                  <span className="me-tag">{roleLabel(p.role)}</span>
                ) : (
                  <select
                    value={p.role}
                    onChange={(e) => changeRole(p, e.target.value)}
                  >
                    {allowed.map((r) => (
                      <option key={r} value={r}>
                        {roleLabel(r)}
                      </option>
                    ))}
                  </select>
                )}

                {!isSelf && canEdit && (
                  <button
                    type="button"
                    className={"act-btn" + (inactive ? " primary" : " danger")}
                    onClick={() => toggleActive(p)}
                  >
                    {inactive ? "復帰" : "退職"}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

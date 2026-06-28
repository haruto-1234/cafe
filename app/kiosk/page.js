"use client"; // 共有タブレット用の打刻専用ページ（ログイン不要・1画面）

import { useEffect, useState } from "react";
import { supabase, createTempClient } from "@/lib/supabaseClient";
import { toEmail } from "@/lib/constants";
import { fmtTime, todayStr } from "@/lib/format";
import { localDateStr } from "@/lib/attendance";

const PUNCH_LABELS = {
  in: "出勤",
  break_start: "休憩開始",
  break_end: "休憩終了",
  out: "退勤",
};
const STATUS_TEXT = {
  none: "未出勤",
  working: "勤務中",
  on_break: "休憩中",
  finished: "退勤済み",
};
const ALLOWED = {
  none: ["in"],
  working: ["break_start", "out"],
  on_break: ["break_end"],
  finished: ["in"],
};

function attState(today) {
  if (!today.length) return "none";
  const last = today[today.length - 1].type;
  if (last === "out") return "finished";
  if (last === "break_start") return "on_break";
  return "working";
}

export default function KioskPage() {
  const [staff, setStaff] = useState([]);
  const [staffId, setStaffId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  // 名前一覧を取得（ログイン不要の安全な関数を呼ぶ）
  useEffect(() => {
    supabase.rpc("kiosk_staff_list").then(({ data, error }) => {
      if (!error) setStaff(data || []);
    });
  }, []);

  const selected = staff.find((s) => s.id === staffId) || null;

  async function loadToday(client, id) {
    const { data } = await client
      .from("attendance")
      .select("*")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(50);
    const t = todayStr();
    return (data || [])
      .filter((r) => localDateStr(r.created_at) === t)
      .sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  }

  // ボタンを押す → パスワード確認 → 状態チェック → 記録（すべてこの1画面で）
  async function punch(type) {
    setError("");
    setMsg("");
    if (!staffId) return setError("名前を選んでください。");
    if (!password) return setError("パスワードを入力してください。");
    setBusy(true);
    const temp = createTempClient();
    try {
      // その人として一瞬ログイン（＝パスワード確認）
      const { error } = await temp.auth.signInWithPassword({
        email: toEmail(selected.staff_no),
        password,
      });
      if (error) {
        setError("パスワードが違います。");
        return;
      }
      // いまの状態を見て、その打刻が可能かチェック
      const before = await loadToday(temp, selected.id);
      const st = attState(before);
      if (!ALLOWED[st].includes(type)) {
        setError(
          `いま「${PUNCH_LABELS[type]}」はできません（状態：${STATUS_TEXT[st]}）。`
        );
        return;
      }
      // 記録
      const { error: e2 } = await temp
        .from("attendance")
        .insert({ user_id: selected.id, type, store: selected.store || null });
      if (e2) throw e2;
      const after = await loadToday(temp, selected.id);
      const last = after[after.length - 1];
      setMsg(
        `${selected.full_name} さん、${PUNCH_LABELS[type]}を記録しました（${
          last ? fmtTime(last.created_at) : ""
        }）✅`
      );
      // 次の人のためにリセット
      setStaffId("");
      setPassword("");
    } catch (e) {
      setError("記録できませんでした。もう一度お試しください。");
    } finally {
      try {
        await temp.auth.signOut();
      } catch {}
      setBusy(false);
    }
  }

  const buttons = [
    { type: "in", label: "出勤", danger: false },
    { type: "break_start", label: "休憩開始", danger: false },
    { type: "break_end", label: "休憩終了", danger: false },
    { type: "out", label: "退勤", danger: true },
  ];

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
          <span className="sub">打刻</span>
        </div>
      </header>

      <main>
        <section className="card form">
          <p className="form-title">
            <span className="bar"></span>出勤・退勤の打刻
          </p>

          <div className="field">
            <label htmlFor="kstaff">名前</label>
            <select
              id="kstaff"
              value={staffId}
              onChange={(e) => {
                setStaffId(e.target.value);
                setError("");
                setMsg("");
              }}
              style={{
                width: "100%",
                border: "1.5px solid var(--line)",
                borderRadius: 11,
                padding: "12px 13px",
                fontSize: 15,
                fontFamily: "inherit",
                background: "#fff",
                color: "var(--ink)",
              }}
            >
              <option value="">— 選んでください —</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name || "名無し"}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="kpw">パスワード</label>
            <input
              id="kpw"
              type="password"
              placeholder="ログイン用パスワード"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <div className="error show">{error}</div>}
          {msg && (
            <div
              className="att-status"
              style={{
                background: "#1F3A2C",
                color: "#7FD3A1",
                marginBottom: 12,
              }}
            >
              {msg}
            </div>
          )}

          <div className="att-buttons">
            {buttons.map((b) => (
              <button
                key={b.type}
                type="button"
                className={"att-btn ready" + (b.danger ? " danger" : "")}
                disabled={busy}
                onClick={() => punch(b.type)}
              >
                {b.label}
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

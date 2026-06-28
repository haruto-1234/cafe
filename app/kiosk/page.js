"use client"; // 共有タブレット用の打刻専用ページ（ログイン不要）

import { useEffect, useRef, useState } from "react";
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
  const [stage, setStage] = useState("select");
  const [today, setToday] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const tempRef = useRef(null);

  // 名前一覧を取得（ログイン不要の安全な関数を呼ぶ）
  useEffect(() => {
    supabase.rpc("kiosk_staff_list").then(({ data, error }) => {
      if (!error) setStaff(data || []);
    });
  }, []);

  const selected = staff.find((s) => s.id === staffId) || null;

  async function cleanupTemp() {
    if (tempRef.current) {
      try {
        await tempRef.current.auth.signOut();
      } catch {}
      tempRef.current = null;
    }
  }

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

  // 名前＋パスワードを確認（その人として一瞬ログイン）
  async function verify() {
    if (!staffId) return setError("名前を選んでください。");
    if (!password) return setError("パスワードを入力してください。");
    setBusy(true);
    setError("");
    try {
      await cleanupTemp();
      const temp = createTempClient();
      const { error } = await temp.auth.signInWithPassword({
        email: toEmail(selected.staff_no),
        password,
      });
      if (error) {
        setError("パスワードが違います。");
        return;
      }
      tempRef.current = temp;
      setToday(await loadToday(temp, selected.id));
      setMsg("");
      setStage("punch");
    } catch (e) {
      setError("確認できませんでした。通信状況を確認してください。");
    } finally {
      setBusy(false);
    }
  }

  async function punch(type) {
    if (!tempRef.current || !selected) return;
    setBusy(true);
    try {
      const { error } = await tempRef.current
        .from("attendance")
        .insert({ user_id: selected.id, type, store: selected.store || null });
      if (error) throw error;
      setToday(await loadToday(tempRef.current, selected.id));
      setMsg(`${PUNCH_LABELS[type]} を記録しました ✅`);
    } catch (e) {
      setMsg("記録できませんでした。もう一度お試しください。");
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    await cleanupTemp();
    setStaffId("");
    setPassword("");
    setToday([]);
    setError("");
    setMsg("");
    setStage("select");
  }

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
        {stage === "select" && (
          <section className="card form">
            <p className="form-title">
              <span className="bar"></span>出勤・退勤の打刻
            </p>
            <div className="field">
              <label htmlFor="kstaff">名前</label>
              <select
                id="kstaff"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
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
                onKeyDown={(e) => {
                  if (e.key === "Enter") verify();
                }}
              />
            </div>
            {error && <div className="error show">{error}</div>}
            <button className="submit" onClick={verify} disabled={busy}>
              {busy ? "確認中…" : "次へ"}
            </button>
          </section>
        )}

        {stage === "punch" &&
          selected &&
          (() => {
            const st = attState(today);
            const allowed =
              {
                none: ["in"],
                working: ["break_start", "out"],
                on_break: ["break_end"],
                finished: ["in"],
              }[st] || [];
            const statusText = {
              none: "未出勤",
              working: "勤務中 🟢",
              on_break: "休憩中 🟡",
              finished: "退勤済み ✅（再出勤できます）",
            }[st];
            const buttons = [
              { type: "in", label: "出勤", danger: false },
              { type: "break_start", label: "休憩開始", danger: false },
              { type: "break_end", label: "休憩終了", danger: false },
              { type: "out", label: "退勤", danger: true },
            ];
            return (
              <div>
                <p className="form-title" style={{ fontSize: 16 }}>
                  <span className="bar"></span>
                  {selected.full_name} さん
                </p>
                <div className="att-status">今の状態：{statusText}</div>
                {msg && (
                  <div
                    className="att-status"
                    style={{ background: "#1F3A2C", color: "#7FD3A1" }}
                  >
                    {msg}
                  </div>
                )}
                <div className="att-buttons">
                  {buttons.map((b) => {
                    const ok = allowed.includes(b.type);
                    return (
                      <button
                        key={b.type}
                        className={
                          "att-btn" +
                          (ok ? " ready" : "") +
                          (b.danger ? " danger" : "")
                        }
                        disabled={!ok || busy}
                        onClick={() => punch(b.type)}
                      >
                        {b.label}
                      </button>
                    );
                  })}
                </div>

                {today.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    {today.map((r) => (
                      <div className="att-log" key={r.id}>
                        <span className="t">{fmtTime(r.created_at)}</span>
                        <span className="lbl">{PUNCH_LABELS[r.type]}</span>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  className="submit"
                  style={{ marginTop: 16 }}
                  onClick={reset}
                >
                  とじる（次の人へ）
                </button>
              </div>
            );
          })()}
      </main>
    </div>
  );
}

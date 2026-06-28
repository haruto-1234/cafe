"use client"; // 共有タブレット用の打刻専用ページ（ログイン不要・1画面）

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
const STATUS_TEXT = {
  none: "未出勤",
  working: "勤務中 🟢",
  on_break: "休憩中 🟡",
  finished: "退勤済み ✅",
};
const ALLOWED = {
  none: ["in"],
  working: ["break_start", "out"],
  on_break: ["break_end"],
  finished: ["in"],
};
const WEEK = ["日", "月", "火", "水", "木", "金", "土"];

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
  const [today, setToday] = useState(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(null);
  const tempRef = useRef(null);
  const resetTimer = useRef(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    supabase.rpc("kiosk_staff_list").then(({ data, error }) => {
      if (!error) setStaff(data || []);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
      if (tempRef.current) tempRef.current.auth.signOut().catch(() => {});
    };
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

  function resetAll() {
    if (resetTimer.current) {
      clearTimeout(resetTimer.current);
      resetTimer.current = null;
    }
    cleanupTemp();
    setStaffId("");
    setPassword("");
    setToday(null);
    setError("");
    setMsg("");
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

  async function verify() {
    setError("");
    setMsg("");
    if (!staffId) return setError("名前を選んでください。");
    if (!password) return setError("パスワードを入力してください。");
    setBusy(true);
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
    } catch (e) {
      setError("確認できませんでした。通信状況を確認してください。");
    } finally {
      setBusy(false);
    }
  }

  async function punch(type) {
    if (!tempRef.current || today === null) return;
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const { error } = await tempRef.current
        .from("attendance")
        .insert({ user_id: selected.id, type, store: selected.store || null });
      if (error) throw error;
      const after = await loadToday(tempRef.current, selected.id);
      const last = after[after.length - 1];
      const name = selected.full_name;
      setToday(after);
      setMsg(
        `${name} さん、${PUNCH_LABELS[type]}を記録しました（${
          last ? fmtTime(last.created_at) : ""
        }）✅`
      );
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => resetAll(), 4000);
    } catch (e) {
      setError("記録できませんでした。もう一度お試しください。");
    } finally {
      setBusy(false);
    }
  }

  function onSelectName(v) {
    setStaffId(v);
    setPassword("");
    setToday(null);
    setError("");
    setMsg("");
    cleanupTemp();
  }

  const verified = today !== null;
  const st = verified ? attState(today) : null;
  const allowed = verified ? ALLOWED[st] : [];
  const buttons = [
    { type: "in", label: "出勤", danger: false },
    { type: "break_start", label: "休憩", danger: false },
    { type: "break_end", label: "休憩戻り", danger: false },
    { type: "out", label: "退勤", danger: true },
  ];

  const clock = now
    ? `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`
    : "--:--";
  const dateStr = now
    ? `${now.getMonth() + 1}月${now.getDate()}日(${WEEK[now.getDay()]})`
    : "";

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
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div
              style={{
                fontSize: 44,
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: 1,
                color: "var(--ink)",
              }}
            >
              {clock}
            </div>
            <div style={{ fontSize: 13, color: "var(--ink2)", fontWeight: 700 }}>
              {dateStr}
            </div>
          </div>

          <div className="field">
            <label htmlFor="kstaff">名前</label>
            <select
              id="kstaff"
              value={staffId}
              onChange={(e) => onSelectName(e.target.value)}
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

          {!verified && (
            <>
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
              <button className="submit" onClick={verify} disabled={busy}>
                {busy ? "確認中…" : "確認"}
              </button>
            </>
          )}

          {verified && (
            <div className="att-status">
              {selected?.full_name} さん｜今の状態：{STATUS_TEXT[st]}
            </div>
          )}

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

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 8,
              marginTop: 12,
            }}
          >
            {buttons.map((b) => {
              const ok = allowed.includes(b.type);
              return (
                <button
                  key={b.type}
                  type="button"
                  className={
                    "att-btn" +
                    (ok ? " ready" : "") +
                    (b.danger && ok ? " danger" : "")
                  }
                  disabled={!ok || busy}
                  onClick={() => punch(b.type)}
                  style={{ padding: "16px 2px", fontSize: 13.5 }}
                >
                  {b.label}
                </button>
              );
            })}
          </div>

          {!verified && (
            <p
              style={{
                textAlign: "center",
                fontSize: 12,
                color: "var(--ink3)",
                marginTop: 10,
              }}
            >
              名前とパスワードを入れて「確認」を押すと、押せるボタンが光ります。
            </p>
          )}

          {verified && (
            <>
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
                className="act-btn"
                style={{ width: "100%", marginTop: 14 }}
                onClick={resetAll}
              >
                終わる（次の人へ）
              </button>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

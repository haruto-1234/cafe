"use client"; // 共有タブレット用の打刻モード（ブラウザで動かす部品）

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

// 今の状態：none(未出勤)/working(勤務中)/on_break(休憩中)/finished(退勤済)
function attState(today) {
  if (!today.length) return "none";
  const last = today[today.length - 1].type;
  if (last === "out") return "finished";
  if (last === "break_start") return "on_break";
  return "working";
}

export default function Kiosk({ onExit }) {
  const [staff, setStaff] = useState([]); // 在籍スタッフ一覧
  const [stage, setStage] = useState("grid"); // grid → password → punch
  const [selected, setSelected] = useState(null); // 選んだスタッフ
  const [password, setPassword] = useState("");
  const [today, setToday] = useState([]); // 選んだ人の今日の打刻
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const tempRef = useRef(null); // その人として一時的にログインしたクライアント

  // 名前ボタンの一覧を読み込む（店長セッションで読める）
  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, full_name, staff_no, store, active")
      .order("full_name")
      .then(({ data }) =>
        setStaff((data || []).filter((p) => p.active !== false))
      );
  }, []);

  async function cleanupTemp() {
    if (tempRef.current) {
      try {
        await tempRef.current.auth.signOut();
      } catch {}
      tempRef.current = null;
    }
  }

  async function backToGrid() {
    await cleanupTemp();
    setSelected(null);
    setPassword("");
    setToday([]);
    setError("");
    setMsg("");
    setStage("grid");
  }

  function pickStaff(p) {
    setSelected(p);
    setPassword("");
    setError("");
    setStage("password");
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

  // パスワードを確認（その人として一瞬ログイン）→ 今日の打刻を読む
  async function verify() {
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
    if (!tempRef.current) return;
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

  return (
    <div
      className="auth-screen"
      style={{ display: "block", padding: 0, overflowY: "auto" }}
    >
      <div style={{ maxWidth: 520, margin: "0 auto", padding: 16 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 4px 16px",
          }}
        >
          <strong style={{ fontSize: 18 }}>📟 打刻モード</strong>
          <button
            className="act-btn"
            onClick={async () => {
              if (confirm("打刻モードを終了しますか？")) {
                await cleanupTemp();
                onExit();
              }
            }}
          >
            終了
          </button>
        </div>

        {/* ① 名前を選ぶ */}
        {stage === "grid" && (
          <div>
            <div className="att-status">自分の名前をタップしてください</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              {staff.map((p) => (
                <button
                  key={p.id}
                  className="att-btn ready"
                  onClick={() => pickStaff(p)}
                >
                  {p.full_name || "名無し"}
                </button>
              ))}
            </div>
            {!staff.length && (
              <p style={{ padding: 16, color: "#7A6B5C" }}>
                スタッフを読み込んでいます…
              </p>
            )}
          </div>
        )}

        {/* ② パスワード入力 */}
        {stage === "password" && selected && (
          <div className="card form">
            <p className="form-title">
              <span className="bar"></span>
              {selected.full_name} さん
            </p>
            <div className="field">
              <label htmlFor="kpw">パスワード</label>
              <input
                id="kpw"
                type="password"
                autoFocus
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
            <button
              className="act-btn"
              style={{ width: "100%", marginTop: 8 }}
              onClick={backToGrid}
            >
              もどる
            </button>
          </div>
        )}

        {/* ③ 打刻 */}
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
                  onClick={backToGrid}
                >
                  とじる（次の人へ）
                </button>
              </div>
            );
          })()}
      </div>
    </div>
  );
}

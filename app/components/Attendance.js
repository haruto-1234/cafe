"use client"; // 打刻（クリックして保存）を行うのでブラウザで動かす部品

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { fmtTime, todayStr } from "@/lib/format";
import { localDateStr, fmtDur, computeWork } from "@/lib/attendance";
import { canManageRoles } from "@/lib/permissions";
import AttendanceAdmin from "./AttendanceAdmin";
import MonthlyReport from "./MonthlyReport";

const PUNCH_LABELS = {
  in: "出勤",
  break_start: "休憩開始",
  break_end: "休憩終了",
  out: "退勤",
};

export default function Attendance({ profile }) {
  const [today, setToday] = useState([]); // 今日の打刻（古い順）
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // 今日の自分の打刻を読み込む
  async function load() {
    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error) {
      const t = todayStr();
      const mine = (data || [])
        .filter((r) => localDateStr(r.created_at) === t)
        .sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
      setToday(mine);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // いまの状態：none(未出勤)/working(勤務中)/on_break(休憩中)/finished(退勤済)
  function state() {
    if (!today.length) return "none";
    const last = today[today.length - 1].type;
    if (last === "out") return "finished";
    if (last === "break_start") return "on_break";
    return "working"; // in または break_end
  }

  async function punch(type) {
    setBusy(true);
    try {
      const store = profile?.store || null;
      const { error } = await supabase
        .from("attendance")
        .insert({ user_id: profile.id, type, store });
      if (error) throw error;
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p style={{ padding: 16, color: "#7A6B5C" }}>読み込み中…</p>;
  }

  const st = state();
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
  const sum = today.length ? computeWork(today) : null;

  const buttons = [
    { type: "in", label: "出勤", danger: false },
    { type: "break_start", label: "休憩開始", danger: false },
    { type: "break_end", label: "休憩終了", danger: false },
    { type: "out", label: "退勤", danger: true },
  ];

  return (
    <div>
      <div className="att-status">今の状態：{statusText}</div>

      <div className="att-buttons">
        {buttons.map((b) => {
          const ok = allowed.includes(b.type);
          return (
            <button
              key={b.type}
              type="button"
              className={
                "att-btn" + (ok ? " ready" : "") + (b.danger ? " danger" : "")
              }
              disabled={!ok || busy}
              onClick={() => punch(b.type)}
            >
              {b.label}
            </button>
          );
        })}
      </div>

      <div className="list-head">
        <h2>今日の記録</h2>
        <span>
          {sum ? `勤務 ${fmtDur(sum.worked)}（休憩 ${fmtDur(sum.brk)}）` : ""}
        </span>
      </div>

      {!today.length ? (
        <div className="empty">
          <div className="em-ic">⏰</div>
          <h3>今日の打刻はまだありません</h3>
          <p>「出勤」から始めましょう。</p>
        </div>
      ) : (
        today.map((r) => (
          <div className="att-log" key={r.id}>
            <span className="t">{fmtTime(r.created_at)}</span>
            <span className="lbl">{PUNCH_LABELS[r.type]}</span>
          </div>
        ))
      )}

      {/* 店長以上には「全員の勤怠」と「月次集計」を表示 */}
      {canManageRoles(profile) && (
        <>
          <AttendanceAdmin />
          <MonthlyReport />
        </>
      )}
    </div>
  );
}

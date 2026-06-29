"use client"; // 自分の勤怠（打刻記録）の閲覧。打刻は共有タブレットの /kiosk で行う。

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { fmtTime, todayStr } from "@/lib/format";
import { localDateStr, fmtDur, computeWork } from "@/lib/attendance";
import { canManageRoles } from "@/lib/permissions";
import AttendanceAdmin from "./AttendanceAdmin";
import MonthlyReport from "./MonthlyReport";
import StoreDashboard from "./StoreDashboard";
import AuditLog from "./AuditLog";

const PUNCH_LABELS = {
  in: "出勤",
  break_start: "休憩開始",
  break_end: "休憩終了",
  out: "退勤",
};

export default function Attendance({ profile }) {
  const [today, setToday] = useState([]); // 今日の打刻（古い順）
  const [loading, setLoading] = useState(true);

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

  function state() {
    if (!today.length) return "none";
    const last = today[today.length - 1].type;
    if (last === "out") return "finished";
    if (last === "break_start") return "on_break";
    return "working";
  }

  if (loading) {
    return <p style={{ padding: 16, color: "#7A6B5C" }}>読み込み中…</p>;
  }

  const statusText = {
    none: "未出勤",
    working: "勤務中 🟢",
    on_break: "休憩中 🟡",
    finished: "退勤済み ✅",
  }[state()];
  const sum = today.length ? computeWork(today) : null;

  return (
    <div>
      <div className="att-status">今の状態：{statusText}</div>
      <p
        style={{
          textAlign: "center",
          fontSize: 12.5,
          color: "var(--ink3)",
          margin: "0 0 14px",
        }}
      >
        打刻はお店のタブレット（打刻ページ）で行います。
      </p>

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
          <p>お店のタブレットで出勤を記録してください。</p>
        </div>
      ) : (
        today.map((r) => (
          <div className="att-log" key={r.id}>
            <span className="t">{fmtTime(r.created_at)}</span>
            <span className="lbl">{PUNCH_LABELS[r.type]}</span>
          </div>
        ))
      )}

      {/* 店長以上には集計・管理を表示 */}
      {canManageRoles(profile) && (
        <>
          <StoreDashboard />
          <AttendanceAdmin profile={profile} />
          <MonthlyReport />
          <AuditLog />
        </>
      )}
    </div>
  );
}

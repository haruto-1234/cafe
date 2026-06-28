"use client"; // 日付を選んで全員分を集計するのでブラウザで動かす部品

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { fmtTime, todayStr } from "@/lib/format";
import { localDateStr, fmtDur, computeWork } from "@/lib/attendance";

// 全員の勤怠（管理者・店長だけ）。日付を選ぶと、その日の全員の勤務時間を表示。
export default function AttendanceAdmin() {
  const [date, setDate] = useState(todayStr());
  const [rows, setRows] = useState([]); // その日の打刻
  const [staff, setStaff] = useState([]); // 名前を引くためのスタッフ一覧
  const [loading, setLoading] = useState(true);

  // 名前一覧は最初に1回だけ読む
  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, full_name")
      .then(({ data }) => setStaff(data || []));
  }, []);

  // 選んだ日付が変わるたび、その日の打刻を読み込む
  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("attendance")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(3000);
      setRows((data || []).filter((r) => localDateStr(r.created_at) === date));
      setLoading(false);
    }
    load();
  }, [date]);

  const nameOf = (id) => {
    const p = staff.find((s) => s.id === id);
    return p ? p.full_name || "名無し" : "(不明)";
  };

  // スタッフごとに打刻をまとめる
  const byUser = {};
  rows.forEach((r) => {
    (byUser[r.user_id] = byUser[r.user_id] || []).push(r);
  });
  const ids = Object.keys(byUser);

  return (
    <div>
      <div className="list-head">
        <h2>全員の勤怠</h2>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{
            border: "1.5px solid var(--line)",
            borderRadius: 9,
            padding: "7px 9px",
            fontFamily: "inherit",
            fontSize: 13,
          }}
        />
      </div>

      {loading ? (
        <p style={{ padding: 16, color: "#7A6B5C" }}>読み込み中…</p>
      ) : !ids.length ? (
        <div className="empty">
          <div className="em-ic">⏰</div>
          <h3>この日の打刻はありません</h3>
        </div>
      ) : (
        ids.map((id) => {
          const s = computeWork(byUser[id]);
          const inT = s.firstIn ? fmtTime(s.firstIn.created_at) : "—";
          const outT = s.lastOut ? fmtTime(s.lastOut.created_at) : "勤務中";
          return (
            <div className="att-log" key={id}>
              <div className="staff-main">
                <div className="staff-name">{nameOf(id)}</div>
                <div className="staff-meta">
                  {inT} 〜 {outT}
                </div>
              </div>
              <span className="lbl">{fmtDur(s.worked)}</span>
            </div>
          );
        })
      )}
    </div>
  );
}

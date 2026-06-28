"use client"; // 月次の勤怠集計＋CSV出力（店長以上）

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { localDateStr, computeWork, fmtDur } from "@/lib/attendance";

const pad = (n) => String(n).padStart(2, "0");

// CSVのセルを安全に（カンマや改行を含む場合はクォート）
function csvCell(s) {
  const v = String(s ?? "");
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export default function MonthlyReport() {
  const [month, setMonth] = useState(""); // "YYYY-MM"
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // 初期値：今月（マウント後にセット）
  useEffect(() => {
    const d = new Date();
    setMonth(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  }, []);

  // 月が変わるたびに集計
  useEffect(() => {
    if (!month) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [y, m] = month.split("-").map(Number);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 1);
      const lo = new Date(start.getTime() - 86400000).toISOString();
      const hi = new Date(end.getTime() + 86400000).toISOString();

      const [{ data: att }, { data: profs }] = await Promise.all([
        supabase
          .from("attendance")
          .select("*")
          .gte("created_at", lo)
          .lt("created_at", hi)
          .order("created_at", { ascending: true })
          .limit(10000),
        supabase.from("profiles").select("id, full_name"),
      ]);
      if (cancelled) return;

      const nameOf = (id) => {
        const p = (profs || []).find((x) => x.id === id);
        return p ? p.full_name || "名無し" : "(不明)";
      };

      // user → day → events（その月のぶんだけ）
      const byUser = {};
      (att || []).forEach((r) => {
        const day = localDateStr(r.created_at);
        if (day.slice(0, 7) !== month) return;
        byUser[r.user_id] = byUser[r.user_id] || {};
        (byUser[r.user_id][day] = byUser[r.user_id][day] || []).push(r);
      });

      const result = Object.keys(byUser).map((id) => {
        let totalMs = 0;
        let days = 0;
        Object.values(byUser[id]).forEach((events) => {
          const { worked } = computeWork(events);
          if (worked > 0) {
            totalMs += worked;
            days += 1;
          }
        });
        return { id, name: nameOf(id), days, totalMs };
      });
      result.sort((a, b) => a.name.localeCompare(b.name, "ja"));
      setRows(result);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [month]);

  function downloadCsv() {
    const header = ["名前", "出勤日数", "合計勤務時間", "合計分"];
    const lines = [header.join(",")];
    rows.forEach((r) => {
      const mins = Math.floor(r.totalMs / 60000);
      const hm = `${Math.floor(mins / 60)}:${pad(mins % 60)}`;
      lines.push([csvCell(r.name), r.days, hm, mins].join(","));
    });
    // 先頭のBOMでExcelが日本語を正しく開ける
    const csv = "﻿" + lines.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `勤怠_${month}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ marginTop: 8 }}>
      <div className="list-head">
        <h2>月次の勤怠集計</h2>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
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
      ) : !rows.length ? (
        <div className="empty">
          <div className="em-ic">📄</div>
          <h3>この月の打刻はありません</h3>
        </div>
      ) : (
        <>
          <button
            className="submit"
            onClick={downloadCsv}
            style={{ marginBottom: 12 }}
          >
            📄 CSVをダウンロード（給与計算用）
          </button>
          {rows.map((r) => (
            <div className="att-log" key={r.id}>
              <div className="staff-main">
                <div className="staff-name">{r.name}</div>
                <div className="staff-meta">{r.days}日出勤</div>
              </div>
              <span className="lbl">{fmtDur(r.totalMs)}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

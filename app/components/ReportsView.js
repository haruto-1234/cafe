"use client"; // 日報を読み込んで持っておく（state）のでブラウザで動かす部品

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ReportForm from "./ReportForm";
import ReportList from "./ReportList";

// 「投稿フォーム」と「一覧」をまとめ、日報データ(reports)をここで管理する。
export default function ReportsView({ profile }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // 画面を開いたときに日報を読み込む（新しい順）
  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error) setReports(data || []);
      setLoading(false);
    }
    load();
  }, []);

  // 投稿成功 → 一覧の先頭に追加（すぐ画面に出る）
  function addReport(r) {
    setReports((prev) => [r, ...prev]);
  }

  return (
    <div>
      <ReportForm profile={profile} onPosted={addReport} />

      <div className="list-head">
        <h2>みんなの日報</h2>
        <span>{reports.length ? `${reports.length}件` : ""}</span>
      </div>

      {loading ? (
        <p style={{ padding: 16, color: "#7A6B5C" }}>読み込み中…</p>
      ) : (
        <ReportList reports={reports} />
      )}
    </div>
  );
}

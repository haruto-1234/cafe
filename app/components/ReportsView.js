"use client"; // 日報を読み込んで持っておく（state）のでブラウザで動かす部品

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ReportForm from "./ReportForm";
import ReportList from "./ReportList";
import StaffPanel from "./StaffPanel";

// 「投稿フォーム」「スタッフ管理」「一覧」をまとめ、日報データ(reports)をここで管理する。
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

  // 投稿成功 → 一覧の先頭に追加
  function addReport(r) {
    setReports((prev) => [r, ...prev]);
  }
  // 編集成功 → その1件を差し替え
  function updateReport(r) {
    setReports((prev) => prev.map((x) => (x.id === r.id ? r : x)));
  }
  // 削除成功 → その1件を取り除く
  function removeReport(id) {
    setReports((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <div>
      <ReportForm profile={profile} onPosted={addReport} />

      <StaffPanel profile={profile} />

      <div className="list-head">
        <h2>みんなの日報</h2>
        <span>{reports.length ? `${reports.length}件` : ""}</span>
      </div>

      {loading ? (
        <p style={{ padding: 16, color: "#7A6B5C" }}>読み込み中…</p>
      ) : (
        <ReportList
          reports={reports}
          profile={profile}
          onUpdated={updateReport}
          onDeleted={removeReport}
        />
      )}
    </div>
  );
}

"use client"; // 日報を読み込んで持っておく（state）のでブラウザで動かす部品

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { STORES } from "@/lib/constants";
import ReportForm from "./ReportForm";
import ReportList from "./ReportList";
import StaffPanel from "./StaffPanel";

export default function ReportsView({ profile }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStore, setFilterStore] = useState("all");

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

  function addReport(r) {
    setReports((prev) => [r, ...prev]);
  }
  function updateReport(r) {
    setReports((prev) => prev.map((x) => (x.id === r.id ? r : x)));
  }
  function removeReport(id) {
    setReports((prev) => prev.filter((x) => x.id !== id));
  }

  // しぼり込み：店舗 → 検索キーワード（名前・本文）
  let shown = reports;
  if (filterStore !== "all") shown = shown.filter((r) => r.store === filterStore);
  const q = search.trim().toLowerCase();
  if (q) {
    shown = shown.filter((r) =>
      `${r.author || ""} ${r.body || ""}`.toLowerCase().includes(q)
    );
  }

  const chips = [
    { name: "全店", value: "all", color: "#2A211B" },
    ...STORES.map((s) => ({ name: s.name, value: s.name, color: s.color })),
  ];

  return (
    <div>
      <ReportForm profile={profile} onPosted={addReport} />

      <StaffPanel profile={profile} />

      <div className="list-head">
        <h2>みんなの日報</h2>
        <span>{shown.length ? `${shown.length}件` : ""}</span>
      </div>

      <div className="filters">
        <input
          id="search"
          type="text"
          placeholder="名前や本文で検索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="store-filter">
          {chips.map((c) => {
            const on = filterStore === c.value;
            return (
              <button
                key={c.value}
                type="button"
                className={"chip" + (on ? " on" : "")}
                style={on ? { background: c.color } : undefined}
                onClick={() => setFilterStore(c.value)}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <p style={{ padding: 16, color: "#7A6B5C" }}>読み込み中…</p>
      ) : (
        <ReportList
          reports={shown}
          profile={profile}
          onUpdated={updateReport}
          onDeleted={removeReport}
        />
      )}
    </div>
  );
}

"use client"; // クリックや状態(state)を使うので「ブラウザで動かす部品」の印

import { useState } from "react";
import ReportsView from "./ReportsView";
import Attendance from "./Attendance";

export default function Tabs({ profile }) {
  // tab = 今どっちのタブを見ているか。"report"(日報) か "att"(勤怠)。
  const [tab, setTab] = useState("report");

  return (
    <>
      <div className="tabbar">
        <button
          className={"tabbtn" + (tab === "report" ? " on" : "")}
          onClick={() => setTab("report")}
        >
          📝 日報
        </button>
        <button
          className={"tabbtn" + (tab === "att" ? " on" : "")}
          onClick={() => setTab("att")}
        >
          ⏰ 勤怠
        </button>
      </div>

      {tab === "report" ? (
        <ReportsView profile={profile} />
      ) : (
        <Attendance profile={profile} />
      )}
    </>
  );
}

"use client"; // 編集・削除（クリックと状態）を行うのでブラウザで動かす部品

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { STORES, storeColor } from "@/lib/constants";
import { fmtDate, fmtTime } from "@/lib/format";
import { findNgWord } from "@/lib/ng";
import { canEditReport, canDeleteReport } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

// 写真の保存パス → 表示用のURL に変換
function photoUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  return supabase.storage.from("report-photos").getPublicUrl(path).data
    .publicUrl;
}

// 日報リストを表示し、編集・削除も行う部品。
// onUpdated / onDeleted で、親(ReportsView)が持つデータを更新してもらう。
export default function ReportList({ reports, profile, onUpdated, onDeleted }) {
  const [editingId, setEditingId] = useState(null);
  const [editBody, setEditBody] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editStore, setEditStore] = useState("");
  const [busy, setBusy] = useState(false);

  function startEdit(r) {
    setEditingId(r.id);
    setEditBody(r.body);
    setEditDate(r.report_date);
    setEditStore(r.store);
  }

  async function saveEdit(r) {
    const val = editBody.trim();
    if (!val) return alert("本文を入力してください");
    const ng = findNgWord(val);
    if (ng) return alert(`不適切な言葉が含まれています（「${ng}」）`);
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("reports")
        .update({ body: val, report_date: editDate, store: editStore })
        .eq("id", r.id)
        .select()
        .single();
      if (error) throw error;
      onUpdated(data);
      setEditingId(null);
    } catch (e) {
      alert("更新できませんでした");
    } finally {
      setBusy(false);
    }
  }

  async function del(r) {
    if (!confirm("この日報を削除します。よろしいですか？")) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("reports").delete().eq("id", r.id);
      if (error) throw error;
      // 写真も保管庫から消す（パス形式のものだけ）
      if (r.photos && r.photos.length) {
        const paths = r.photos.filter((p) => p && !/^https?:\/\//.test(p));
        if (paths.length) {
          try {
            await supabase.storage.from("report-photos").remove(paths);
          } catch (err) {
            console.error(err);
          }
        }
      }
      if (editingId === r.id) setEditingId(null);
      logAudit(profile, "日報削除", `${r.author || ""} ${r.report_date || ""}`);
      onDeleted(r.id);
    } catch (e) {
      alert("削除できませんでした");
    } finally {
      setBusy(false);
    }
  }

  if (!reports.length) {
    return (
      <div className="empty">
        <div className="em-ic">📋</div>
        <h3>まだ日報がありません</h3>
        <p>上のフォームから最初の1件を投稿してみましょう。</p>
      </div>
    );
  }

  return (
    <div>
      {reports.map((r) => {
        const c = storeColor(r.store);
        const editing = r.id === editingId;
        return (
          <article
            key={r.id}
            className="item"
            style={{ boxShadow: `inset 4px 0 0 ${c}` }}
          >
            <div className="item-top">
              <span className="pill" style={{ background: c }}>
                {r.store}
              </span>
              <span className="author">{r.author}</span>
              <span className="when">
                {fmtDate(r.report_date)} {fmtTime(r.created_at)}
              </span>
            </div>

            {editing ? (
              <>
                <div className="edit-fields">
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                  />
                  <select
                    value={editStore}
                    onChange={(e) => setEditStore(e.target.value)}
                  >
                    {STORES.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  className="edit-area"
                  rows={4}
                  maxLength={2000}
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                />
                <div className="item-actions">
                  <button
                    className="act-btn primary"
                    disabled={busy}
                    onClick={() => saveEdit(r)}
                  >
                    保存
                  </button>
                  <button
                    className="act-btn"
                    disabled={busy}
                    onClick={() => setEditingId(null)}
                  >
                    キャンセル
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="body">{r.body}</p>

                {r.photos && r.photos.length > 0 && (
                  <div className="photos">
                    {r.photos.map((p, i) => {
                      const u = photoUrl(p);
                      return (
                        <a
                          key={i}
                          href={u}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={u} alt="写真" loading="lazy" />
                        </a>
                      );
                    })}
                  </div>
                )}

                {(canEditReport(r, profile) || canDeleteReport(r, profile)) && (
                  <div className="item-actions">
                    {canEditReport(r, profile) && (
                      <button className="act-btn" onClick={() => startEdit(r)}>
                        編集
                      </button>
                    )}
                    {canDeleteReport(r, profile) && (
                      <button
                        className="act-btn danger"
                        onClick={() => del(r)}
                      >
                        削除
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </article>
        );
      })}
    </div>
  );
}

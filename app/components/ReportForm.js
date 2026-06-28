"use client"; // 入力・写真選択・保存を行うのでブラウザで動かす部品

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { STORES } from "@/lib/constants";
import { todayStr } from "@/lib/format";
import { findNgWord } from "@/lib/ng";

const MAX_PHOTOS = 10;

export default function ReportForm({ profile, onPosted }) {
  const [date, setDate] = useState(todayStr());
  const [store, setStore] = useState(profile?.store || STORES[0].name);
  const [author, setAuthor] = useState(profile?.full_name || "");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState([]); // 選んだ写真
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // 写真をえらんだとき（最大10枚）
  function onPickPhotos(e) {
    const picked = [...e.target.files];
    setFiles((prev) => {
      const next = [...prev];
      for (const f of picked) {
        if (next.length >= MAX_PHOTOS) break;
        next.push(f);
      }
      return next;
    });
    e.target.value = ""; // 同じ写真も選び直せるように
  }

  function removePhoto(idx) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  // 写真を保管庫(Storage)に送り、パスの一覧を返す
  async function uploadPhotos() {
    const paths = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const ext =
        (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") ||
        "jpg";
      const path = `${profile.id}/${Date.now()}_${i}.${ext}`;
      const { error } = await supabase.storage
        .from("report-photos")
        .upload(path, f, { upsert: false });
      if (error) throw error;
      paths.push(path);
    }
    return paths;
  }

  async function submit() {
    const a = author.trim();
    const b = body.trim();
    if (!a) return setError("名前を入力してください。");
    if (!b) return setError("本文を入力してください。");
    const ng = findNgWord(b);
    if (ng)
      return setError(
        `不適切な言葉が含まれています（「${ng}」）。表現を直してください。`
      );
    setError("");
    setBusy(true);
    try {
      let photos = [];
      if (files.length) photos = await uploadPhotos();
      const { data, error } = await supabase
        .from("reports")
        .insert({
          report_date: date,
          store,
          author: a,
          body: b,
          user_id: profile.id,
          photos,
        })
        .select()
        .single();
      if (error) throw error;
      onPosted(data); // 一覧の先頭に追加してもらう
      setBody(""); // 本文だけ消す（日付・店舗・名前は次の投稿用に残す）
      setFiles([]);
    } catch (e) {
      const m = e?.message || "";
      if (m.includes("10件"))
        setError("1日に投稿できる日報は10件までです。明日また投稿してください。");
      else
        setError("保存できませんでした。通信状況やSupabaseの設定を確認してください。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card form">
      <p className="form-title">
        <span className="bar"></span>日報を投稿する
      </p>

      <div className="row">
        <div className="field">
          <label htmlFor="date">日付</label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="field">
          <label>店舗</label>
          <div className="seg" role="group" aria-label="店舗を選択">
            {STORES.map((s) => {
              const on = s.name === store;
              return (
                <button
                  key={s.name}
                  type="button"
                  className={on ? "on" : ""}
                  style={on ? { background: s.color, borderColor: s.color } : undefined}
                  onClick={() => setStore(s.name)}
                >
                  {s.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="field">
        <label htmlFor="author">
          名前 <em className="req">必須</em>
        </label>
        <input
          id="author"
          type="text"
          maxLength={40}
          placeholder="例：田中"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="body">
          本文 <em className="req">必須</em>
        </label>
        <textarea
          id="body"
          maxLength={2000}
          rows={4}
          placeholder="混雑状況、品切れ、クレーム、よかったことなど。箇条書きでもOK。"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="photoInput">
          写真{" "}
          <span style={{ fontWeight: 600, color: "var(--ink3)", fontSize: "11.5px" }}>
            （最大10枚・任意）
          </span>
        </label>
        <input
          id="photoInput"
          type="file"
          accept="image/*"
          multiple
          onChange={onPickPhotos}
        />
        {files.length > 0 && (
          <div className="photo-previews">
            {files.map((f, i) => (
              <div className="thumb" key={i}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={URL.createObjectURL(f)} alt="" />
                <button
                  type="button"
                  className="rm"
                  aria-label="この写真を外す"
                  onClick={() => removePhoto(i)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <div className="error show">{error}</div>}

      <button className="submit" type="button" onClick={submit} disabled={busy}>
        {busy ? "投稿中…" : "日報を投稿する"}
      </button>
    </section>
  );
}

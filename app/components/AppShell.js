"use client"; // ログイン状態(state)で表示を切り替えるのでブラウザで動かす部品

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Header from "./Header";
import Tabs from "./Tabs";
import Login from "./Login";
import PwChange from "./PwChange";

export default function AppShell() {
  const [session, setSession] = useState(null); // ログイン情報（無ければ未ログイン）
  const [profile, setProfile] = useState(null); // スタッフ情報（名前・役割など）
  const [loading, setLoading] = useState(true); // 最初の確認中か
  const [showPw, setShowPw] = useState(false); // パスワード変更画面を出すか

  // 今ログインしているか確認し、していればスタッフ情報も読む
  async function loadSession() {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    if (data.session) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.session.user.id)
        .single();
      setProfile(prof || null);
    } else {
      setProfile(null);
    }
  }

  // 画面を開いた最初の1回だけ、ログイン状態を確認する
  useEffect(() => {
    loadSession().finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }

  if (loading) {
    return (
      <div className="wrap">
        <p style={{ padding: 20, color: "#7A6B5C" }}>読み込み中…</p>
      </div>
    );
  }

  // 未ログインならログイン画面
  if (!session) {
    return <Login onLoggedIn={loadSession} />;
  }

  // ログイン済みなら本体
  return (
    <div className="wrap">
      <Header
        profile={profile}
        onLogout={handleLogout}
        onPwChange={() => setShowPw(true)}
      />
      <main>
        <Tabs profile={profile} />
      </main>
      {showPw && <PwChange onClose={() => setShowPw(false)} />}
    </div>
  );
}

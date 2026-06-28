// だれが何をできるか（権限）の判定をまとめた部品。

export const ALL_ROLES = ["admin", "manager", "fulltime", "leader", "part"];

// スタッフ管理（登録・退職・役割変更）ができるのは 管理者・店長 だけ
export function canManageRoles(profile) {
  return !!profile && (profile.role === "admin" || profile.role === "manager");
}

// 自分が割り当てられる役割（店長は 管理者/店長 を付与できない）
export function assignableRoles(profile) {
  if (profile && profile.role === "admin") return ALL_ROLES;
  return ["fulltime", "leader", "part"];
}

// この日報を編集できるか：自分の投稿だけ
export function canEditReport(report, profile) {
  return !!profile && !!report.user_id && report.user_id === profile.id;
}

// この日報を削除できるか：
// 自分=OK / 管理者・店長=全店 / 正社員・リーダー=自店 / パート=他人不可
export function canDeleteReport(report, profile) {
  if (!profile) return false;
  if (report.user_id && report.user_id === profile.id) return true;
  const role = profile.role;
  if (role === "admin" || role === "manager") return true;
  if (role === "fulltime" || role === "leader")
    return report.store === profile.store;
  return false;
}

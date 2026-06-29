// 画面下にスッと出る通知（トースト）。どの部品からでも toast("保存しました") で呼べる。
// CSSの .toast / .toast.show は globals.css にある。
export function toast(message, ok = true) {
  if (typeof document === "undefined") return;
  let el = document.getElementById("app-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "app-toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  // 中身を作り直す（textContent で安全に）
  el.textContent = "";
  if (ok) {
    const c = document.createElement("span");
    c.className = "check";
    c.textContent = "✓";
    el.appendChild(c);
    el.appendChild(document.createTextNode(" "));
  }
  el.appendChild(document.createTextNode(message));
  el.classList.add("show");
  if (el._timer) clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove("show"), 2600);
}

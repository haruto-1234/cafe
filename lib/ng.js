// 不適切な言葉（NGワード）のチェック。ここに足したり消したりできます。
const NG_WORDS = [
  "死ね", "しね", "殺す", "ころす", "殺せ", "ころせ",
  "ばか", "馬鹿", "あほ", "アホ", "きもい", "気持ち悪い",
  "うざい", "ぶす", "クズ", "くず", "カス", "かす", "ボケ", "ぼけ",
];

// 文字をそろえる：小文字化・空白除去・カタカナ→ひらがな（表記ゆれ対策）
function normalize(s) {
  return String(s)
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

// NGワードが含まれていればその語を返す。無ければ null。
export function findNgWord(text) {
  const t = normalize(text);
  for (const w of NG_WORDS) {
    if (t.includes(normalize(w))) return w;
  }
  return null;
}

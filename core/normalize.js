function normalizeText(rawText) {
  const source = typeof rawText === "string" ? rawText : "";

  const normalized = source
    .normalize("NFKC")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t\u3000]+/g, " ")
    .replace(/[，､]/g, "、")
    .replace(/[．｡]/g, "。")
    .replace(/[！!]+/g, "！")
    .replace(/[？?]+/g, "？")
    .replace(/宜しく/g, "よろしく")
    .replace(/致します/g, "いたします")
    .replace(/下さい/g, "ください")
    .replace(/有難うございます/g, "ありがとうございます")
    .replace(/\n{3,}/g, "\n\n");

  return normalized.trim();
}

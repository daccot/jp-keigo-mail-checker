function splitToSentences(normalizedText) {
  const text = typeof normalizedText === "string" ? normalizedText : "";
  const sentences = [];
  let start = 0;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const isBoundary = char === "。" || char === "！" || char === "？" || char === "\n";

    if (!isBoundary) {
      continue;
    }

    const candidate = text.slice(start, index + 1).trim();
    if (candidate) {
      const realStart = text.indexOf(candidate, start);
      sentences.push({
        text: candidate,
        start: realStart,
        end: realStart + candidate.length
      });
    }
    start = index + 1;
  }

  if (start < text.length) {
    const tail = text.slice(start).trim();
    if (tail) {
      const realStart = text.indexOf(tail, start);
      sentences.push({
        text: tail,
        start: realStart,
        end: realStart + tail.length
      });
    }
  }

  return sentences;
}

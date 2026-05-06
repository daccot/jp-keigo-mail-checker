function matchAll(sentences, dictionaries) {
  const highlights = [];
  const warnings = [];

  sentences.forEach((sentence) => {
    collectPhraseHits(sentence, dictionaries.phraseDict || [], highlights);
    collectTokenHits(sentence, dictionaries.tokenDict || [], highlights);
    collectPatternHits(sentence, dictionaries.patternDict || [], highlights, warnings);
    collectBlacklistHits(sentence, dictionaries.blacklistDict || [], highlights, warnings);
  });

  highlights.sort((a, b) => a.start - b.start || a.end - b.end);
  warnings.sort((a, b) => a.range.start - b.range.start || a.range.end - b.range.end);

  return {
    highlights,
    warnings
  };
}

function collectPhraseHits(sentence, phraseDict, highlights) {
  phraseDict.forEach((entry) => {
    findAllIndices(sentence.text, entry.normalized || entry.surface).forEach((relativeIndex) => {
      highlights.push({
        id: entry.id,
        text: entry.surface,
        type: entry.category === "template" ? "TMP" : (entry.keigoType || "TMP"),
        start: sentence.start + relativeIndex,
        end: sentence.start + relativeIndex + entry.surface.length,
        score: entry.weight || 1
      });
    });
  });
}

function collectTokenHits(sentence, tokenDict, highlights) {
  tokenDict.forEach((entry) => {
    findAllIndices(sentence.text, entry.normalized || entry.surface).forEach((relativeIndex) => {
      highlights.push({
        id: entry.id,
        text: entry.surface,
        type: entry.keigoType || "TEI",
        start: sentence.start + relativeIndex,
        end: sentence.start + relativeIndex + entry.surface.length,
        score: entry.weight || 1
      });
    });
  });
}

function collectPatternHits(sentence, patternDict, highlights, warnings) {
  patternDict.forEach((entry) => {
    const regex = new RegExp(entry.pattern, "g");
    let match;

    while ((match = regex.exec(sentence.text)) !== null) {
      const start = sentence.start + match.index;
      const end = start + match[0].length;

      highlights.push({
        id: entry.id,
        text: match[0],
        type: "WRN",
        start,
        end,
        score: -(entry.severityWeight || 1)
      });

      warnings.push({
        ruleId: entry.id,
        message: entry.message,
        severity: entry.severity || "warning",
        range: { start, end }
      });
    }
  });
}

function collectBlacklistHits(sentence, blacklistDict, highlights, warnings) {
  blacklistDict.forEach((entry) => {
    findAllIndices(sentence.text, entry.surface).forEach((relativeIndex) => {
      const start = sentence.start + relativeIndex;
      const end = start + entry.surface.length;

      highlights.push({
        id: entry.id,
        text: entry.surface,
        type: "WRN",
        start,
        end,
        score: -(entry.weight || 1)
      });

      warnings.push({
        ruleId: entry.id,
        message: entry.message,
        severity: entry.severity || "warning",
        range: { start, end }
      });
    });
  });
}

function findAllIndices(text, keyword) {
  const indices = [];
  if (!keyword) {
    return indices;
  }

  let fromIndex = 0;
  while (fromIndex < text.length) {
    const found = text.indexOf(keyword, fromIndex);
    if (found === -1) {
      break;
    }
    indices.push(found);
    fromIndex = found + keyword.length;
  }
  return indices;
}

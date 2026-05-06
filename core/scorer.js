function scoreDocument(sentences, matchResult) {
  const categoryTotals = {
    teineigo: 0,
    sonkeigo: 0,
    kenjougo: 0,
    template: 0,
    warning: 0
  };

  const seenCounts = Object.create(null);

  matchResult.highlights.forEach((hit) => {
    const countKey = `${hit.type}:${hit.text}`;
    const seen = (seenCounts[countKey] || 0) + 1;
    seenCounts[countKey] = seen;
    const decay = seen === 1 ? 1 : seen === 2 ? 0.7 : 0.45;
    const weighted = Math.abs(hit.score || 1) * decay;

    switch (hit.type) {
      case "TEI":
        categoryTotals.teineigo += weighted * 10;
        break;
      case "SON":
        categoryTotals.sonkeigo += weighted * 12;
        break;
      case "KEN":
        categoryTotals.kenjougo += weighted * 12;
        break;
      case "TMP":
        categoryTotals.template += weighted * 11;
        break;
      case "WRN":
        categoryTotals.warning += weighted * 14;
        break;
      default:
        break;
    }
  });

  const warningPenalty = matchResult.warnings.length * 6;
  const total = clampScore(
    48 +
      categoryTotals.teineigo * 0.18 +
      categoryTotals.sonkeigo * 0.16 +
      categoryTotals.kenjougo * 0.16 +
      categoryTotals.template * 0.12 -
      categoryTotals.warning * 0.18 -
      warningPenalty
  );

  return {
    total,
    teineigo: clampScore(categoryTotals.teineigo),
    sonkeigo: clampScore(categoryTotals.sonkeigo),
    kenjougo: clampScore(categoryTotals.kenjougo),
    template: clampScore(categoryTotals.template),
    warning: clampScore(categoryTotals.warning)
  };
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

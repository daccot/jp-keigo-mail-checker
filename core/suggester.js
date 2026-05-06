function suggestTemplates(context) {
  const settings = context.settings || {};
  const tone = settings.baseTone || "external";
  const normalizedText = context.normalizedText || "";
  const phraseDict = context.dictionaries?.phraseDict || [];

  const missingTemplates = phraseDict.filter((entry) => {
    const toneMatches = !entry.tone || entry.tone === "all" || entry.tone === tone;
    const notUsedYet = normalizedText.indexOf(entry.normalized || entry.surface) === -1;
    return entry.category === "template" && toneMatches && notUsedYet;
  });

  return missingTemplates
    .sort((a, b) => (b.weight || 0) - (a.weight || 0))
    .map((entry) => entry.replace || entry.surface);
}

function suggestRewrites(matchResult, dictionaries) {
  const rewriteDict = dictionaries?.rewriteDict || [];
  const sourceSet = new Set();
  const suggestions = [];

  matchResult.highlights.forEach((hit) => {
    rewriteDict.forEach((entry) => {
      if (sourceSet.has(entry.source)) {
        return;
      }
      if (hit.text.includes(entry.source) || entry.patternIds?.includes(hit.id)) {
        suggestions.push({
          source: entry.source,
          candidates: entry.targets.map((target) => target.value)
        });
        sourceSet.add(entry.source);
      }
    });
  });

  matchResult.warnings.forEach((warning) => {
    rewriteDict.forEach((entry) => {
      if (sourceSet.has(entry.source)) {
        return;
      }
      if (entry.patternIds?.includes(warning.ruleId)) {
        suggestions.push({
          source: entry.source,
          candidates: entry.targets.map((target) => target.value)
        });
        sourceSet.add(entry.source);
      }
    });
  });

  return suggestions;
}

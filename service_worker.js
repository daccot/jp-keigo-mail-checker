importScripts(
  "core/normalize.js",
  "core/sentenceSplitter.js",
  "core/matcher.js",
  "core/scorer.js",
  "core/suggester.js",
  "core/storageRepo.js"
);

const MESSAGE_TYPES = {
  ANALYZE_TEXT: "ANALYZE_TEXT",
  GET_SETTINGS: "GET_SETTINGS",
  SAVE_SETTINGS: "SAVE_SETTINGS",
  IMPORT_SELECTION: "IMPORT_SELECTION",
  GET_HISTORY: "GET_HISTORY"
};

let dictionaryCache = null;

chrome.runtime.onInstalled.addListener(() => {
  void ensureDictionaries();
});

chrome.runtime.onStartup.addListener(() => {
  void ensureDictionaries();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) {
    return false;
  }

  void (async () => {
    try {
      switch (message.type) {
        case MESSAGE_TYPES.ANALYZE_TEXT: {
          const settings = await StorageRepo.loadSettings();
          const result = await analyzeText(message.payload?.text || "", settings);
          sendResponse({ ok: true, result });
          break;
        }
        case MESSAGE_TYPES.GET_SETTINGS: {
          const settings = await StorageRepo.loadSettings();
          sendResponse({ ok: true, settings });
          break;
        }
        case MESSAGE_TYPES.SAVE_SETTINGS: {
          const settings = await StorageRepo.saveSettings(message.payload || {});
          sendResponse({ ok: true, settings });
          break;
        }
        case MESSAGE_TYPES.IMPORT_SELECTION: {
          const text = await importSelectionFromActiveTab();
          sendResponse({ ok: true, text });
          break;
        }
        case MESSAGE_TYPES.GET_HISTORY: {
          const history = await StorageRepo.loadHistory(message.payload?.limit || 10);
          sendResponse({ ok: true, history });
          break;
        }
        default:
          sendResponse({ ok: false, error: "Unsupported message type." });
      }
    } catch (error) {
      console.error("Message handling failed.", error);
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : "Unexpected error."
      });
    }
  })();

  return true;
});

async function ensureDictionaries() {
  if (dictionaryCache) {
    return dictionaryCache;
  }

  const paths = {
    phraseDict: "data/phrase_dict.json",
    tokenDict: "data/token_dict.json",
    patternDict: "data/pattern_dict.json",
    rewriteDict: "data/rewrite_dict.json",
    blacklistDict: "data/blacklist_dict.json"
  };

  const entries = await Promise.all(
    Object.entries(paths).map(async ([key, path]) => {
      const response = await fetch(chrome.runtime.getURL(path));
      if (!response.ok) {
        throw new Error(`Failed to load dictionary: ${path}`);
      }
      return [key, await response.json()];
    })
  );

  dictionaryCache = Object.fromEntries(entries);
  return dictionaryCache;
}

async function analyzeText(rawText, settings) {
  const dictionaries = await ensureDictionaries();
  const normalizedText = normalizeText(rawText);
  const sentences = splitToSentences(normalizedText);
  const matchResult = applyWarningSensitivity(matchAll(sentences, dictionaries), settings.warningSensitivity);
  const scores = scoreDocument(sentences, matchResult);
  const suggestions = {
    templates: suggestTemplates({
      normalizedText,
      settings,
      dictionaries,
      matches: matchResult
    }).slice(0, settings.suggestionLimit),
    rewrites: suggestRewrites(matchResult, dictionaries).slice(0, settings.suggestionLimit)
  };

  const result = {
    requestId: `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    input: {
      rawText,
      normalizedText
    },
    scores,
    highlights: matchResult.highlights,
    warnings: matchResult.warnings,
    suggestions
  };

  if (settings.historyEnabled && normalizedText.trim()) {
    await StorageRepo.saveHistoryEntry({
      id: result.requestId,
      createdAt: Date.now(),
      excerpt: normalizedText.slice(0, 120),
      rawText,
      normalizedText,
      baseTone: settings.baseTone,
      scores
    });
  }

  return result;
}

function applyWarningSensitivity(matchResult, sensitivity) {
  if (sensitivity === "high") {
    return matchResult;
  }

  if (sensitivity === "low") {
    return {
      highlights: matchResult.highlights.filter((item) => {
        if (item.type !== "WRN") {
          return true;
        }
        const warning = matchResult.warnings.find((entry) => entry.range.start === item.start && entry.range.end === item.end);
        return warning && (warning.severity === "warning" || warning.severity === "strong_warning");
      }),
      warnings: matchResult.warnings.filter((item) => item.severity === "warning" || item.severity === "strong_warning")
    };
  }

  return {
    highlights: matchResult.highlights.filter((item) => {
      if (item.type !== "WRN") {
        return true;
      }
      const warning = matchResult.warnings.find((entry) => entry.range.start === item.start && entry.range.end === item.end);
      return Boolean(warning);
    }),
    warnings: matchResult.warnings.filter((item) => item.severity !== "info")
  };
}

async function importSelectionFromActiveTab() {
  const tabs = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });
  const tab = tabs[0];

  if (!tab || typeof tab.id !== "number") {
    return "";
  }

  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const active = document.activeElement;
      if (active && (active.tagName === "TEXTAREA" || active.tagName === "INPUT")) {
        const value = active.value || "";
        const start = typeof active.selectionStart === "number" ? active.selectionStart : 0;
        const end = typeof active.selectionEnd === "number" ? active.selectionEnd : value.length;
        return value.slice(start, end) || value;
      }

      return window.getSelection ? window.getSelection().toString() : "";
    }
  });

  return result || "";
}

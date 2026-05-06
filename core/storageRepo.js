const StorageRepo = (() => {
  const SETTINGS_KEY = "jpKeigoSettings";
  const HISTORY_KEY = "jpKeigoHistory";
  const DEFAULT_SETTINGS = {
    baseTone: "external",
    warningSensitivity: "standard",
    suggestionLimit: 5,
    historyEnabled: true
  };
  const MAX_HISTORY = 30;

  async function loadSettings() {
    const local = await chrome.storage.local.get(SETTINGS_KEY);
    const sync = await chrome.storage.sync.get(SETTINGS_KEY);
    return {
      ...DEFAULT_SETTINGS,
      ...(sync[SETTINGS_KEY] || {}),
      ...(local[SETTINGS_KEY] || {})
    };
  }

  async function saveSettings(settings) {
    const next = {
      ...DEFAULT_SETTINGS,
      ...(settings || {})
    };
    await chrome.storage.local.set({
      [SETTINGS_KEY]: next
    });
    await chrome.storage.sync.set({
      [SETTINGS_KEY]: {
        baseTone: next.baseTone,
        warningSensitivity: next.warningSensitivity,
        suggestionLimit: next.suggestionLimit,
        historyEnabled: next.historyEnabled
      }
    });
    return next;
  }

  async function saveHistoryEntry(entry) {
    const stored = await chrome.storage.local.get(HISTORY_KEY);
    const history = Array.isArray(stored[HISTORY_KEY]) ? stored[HISTORY_KEY] : [];
    const next = [entry, ...history].slice(0, MAX_HISTORY);
    await chrome.storage.local.set({
      [HISTORY_KEY]: next
    });
  }

  async function loadHistory(limit) {
    const stored = await chrome.storage.local.get(HISTORY_KEY);
    const history = Array.isArray(stored[HISTORY_KEY]) ? stored[HISTORY_KEY] : [];
    return history.slice(0, Math.max(1, limit || 10));
  }

  return {
    loadSettings,
    saveSettings,
    saveHistoryEntry,
    loadHistory
  };
})();

const OPTIONS_MESSAGE_TYPES = {
  GET_SETTINGS: "GET_SETTINGS",
  SAVE_SETTINGS: "SAVE_SETTINGS"
};

const defaultSettings = {
  baseTone: "external",
  warningSensitivity: "standard",
  suggestionLimit: 5,
  historyEnabled: true
};

const optionsFields = {
  baseTone: document.getElementById("base-tone"),
  warningSensitivity: document.getElementById("warning-sensitivity"),
  suggestionLimit: document.getElementById("suggestion-limit"),
  historyEnabled: document.getElementById("history-enabled"),
  saveButton: document.getElementById("save-settings-button"),
  resetButton: document.getElementById("reset-settings-button"),
  status: document.getElementById("settings-status")
};

document.addEventListener("DOMContentLoaded", () => {
  bindOptionsEvents();
  void loadSettings();
});

function bindOptionsEvents() {
  optionsFields.saveButton.addEventListener("click", async () => {
    const payload = collectSettings();
    const response = await chrome.runtime.sendMessage({
      type: OPTIONS_MESSAGE_TYPES.SAVE_SETTINGS,
      payload
    });
    optionsFields.status.textContent = response?.ok ? "設定を保存しました。" : "設定の保存に失敗しました。";
  });

  optionsFields.resetButton.addEventListener("click", async () => {
    applySettings(defaultSettings);
    const response = await chrome.runtime.sendMessage({
      type: OPTIONS_MESSAGE_TYPES.SAVE_SETTINGS,
      payload: defaultSettings
    });
    optionsFields.status.textContent = response?.ok ? "初期値に戻しました。" : "初期化に失敗しました。";
  });
}

async function loadSettings() {
  const response = await chrome.runtime.sendMessage({
    type: OPTIONS_MESSAGE_TYPES.GET_SETTINGS
  });
  if (!response?.ok) {
    optionsFields.status.textContent = "設定を読み込めませんでした。";
    return;
  }
  applySettings(response.settings || defaultSettings);
}

function applySettings(settings) {
  optionsFields.baseTone.value = settings.baseTone;
  optionsFields.warningSensitivity.value = settings.warningSensitivity;
  optionsFields.suggestionLimit.value = String(settings.suggestionLimit);
  optionsFields.historyEnabled.checked = Boolean(settings.historyEnabled);
  optionsFields.status.textContent = "";
}

function collectSettings() {
  return {
    baseTone: optionsFields.baseTone.value,
    warningSensitivity: optionsFields.warningSensitivity.value,
    suggestionLimit: Math.max(1, Number(optionsFields.suggestionLimit.value) || 5),
    historyEnabled: optionsFields.historyEnabled.checked
  };
}

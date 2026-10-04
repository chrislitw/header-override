importScripts('rules.js');

// 設定變動很頻繁（每次輸入都會存），用佇列確保同一時間只有一次同步，
// 避免兩次同步交錯時新增到重複的規則 id
let syncQueue = Promise.resolve();

function scheduleSync() {
  syncQueue = syncQueue
    .then(syncRules)
    .catch((error) => console.error('Failed to sync rules:', error));
}

// 用目前的設定整批取代所有動態規則，並更新工具列 badge
async function syncRules() {
  const state = await loadState();
  const activeRules = getActiveRules(state);
  const existing = await chrome.declarativeNetRequest.getDynamicRules();

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map((rule) => rule.id),
    addRules: activeRules.map((rule, index) => toDnrRule(rule, index + 1)),
  });

  await chrome.action.setBadgeBackgroundColor({ color: '#0d9488' });
  await chrome.action.setBadgeText({ text: activeRules.length ? String(activeRules.length) : '' });
}

chrome.runtime.onInstalled.addListener(scheduleSync);
// badge 不會跨瀏覽器重啟保留，啟動時重新同步一次
chrome.runtime.onStartup.addListener(scheduleSync);

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    scheduleSync();
  }
});

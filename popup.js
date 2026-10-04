let state = { enabled: true, rules: [] };

const EYE_ICON = '<path d="M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17ZM12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9Z" fill="currentColor"/>';
const EYE_OFF_ICON = '<path d="M12 7C14.76 7 17 9.24 17 12C17 12.65 16.87 13.26 16.64 13.83L19.56 16.75C21.07 15.49 22.26 13.86 23 12C21.27 7.61 17 4.5 12 4.5C10.6 4.5 9.26 4.75 8.01 5.2L10.17 7.36C10.74 7.13 11.35 7 12 7ZM2 4.27L4.28 6.55L4.74 7.01C3.08 8.3 1.78 10.02 1 12C2.73 16.39 7 19.5 12 19.5C13.55 19.5 15.03 19.2 16.38 18.66L16.8 19.08L19.73 22L21 20.73L3.27 3L2 4.27ZM7.53 9.8L9.08 11.35C9.03 11.56 9 11.78 9 12C9 13.66 10.34 15 12 15C12.22 15 12.44 14.97 12.65 14.92L14.2 16.47C13.53 16.8 12.79 17 12 17C9.24 17 7 14.76 7 12C7 11.21 7.2 10.47 7.53 9.8ZM11.84 9.02L14.99 12.17L15.01 12.01C15.01 10.35 13.67 9.01 12.01 9.01L11.84 9.02Z" fill="currentColor"/>';

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  state = await loadState();
  document.getElementById('globalToggle').checked = state.enabled;
  renderRules();
  setupEventListeners();
});

// 每次變動都立即寫入：popup 關閉時計時器會被中斷，延遲寫入可能遺失
// background 會監聽 storage 變動並同步成 DNR 規則
function save() {
  chrome.storage.local.set({ enabled: state.enabled, rules: state.rules });
  updateSummary();
}

// 更新啟用數量與總開關狀態
function updateSummary() {
  const n = getActiveRules(state).length;
  document.getElementById('activeCount').textContent = `${n} active`;
  document.getElementById('container').classList.toggle('is-off', !state.enabled);
  document.getElementById('footer').textContent = state.enabled
    ? 'Applies to fetch / XHR requests · Changes take effect immediately'
    : 'All rules are paused';
}

function createRuleId() {
  return `r_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// 渲染規則列表
function renderRules() {
  const rulesList = document.getElementById('rulesList');
  rulesList.innerHTML = '';
  updateSummary();

  if (state.rules.length === 0) {
    rulesList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M4 6H20V8H4V6ZM4 11H14V13H4V11ZM4 16H20V18H4V16ZM17 10L21 12L17 14V10Z" fill="currentColor"/>
          </svg>
        </div>
        No header rules yet<br>Click "Add" to override a request header
      </div>`;
    return;
  }

  state.rules.forEach((rule) => {
    rulesList.appendChild(createRuleCard(rule));
  });
}

// 建立規則卡片；欄位值一律用 .value 設定，避免使用者輸入被當成 HTML
function createRuleCard(rule) {
  const card = document.createElement('div');
  card.className = 'rule-card';
  card.innerHTML = `
    <div class="rule-row rule-row-main">
      <label class="switch" title="Turn this rule on or off">
        <input type="checkbox" class="rule-enabled">
        <span class="slider"></span>
      </label>
      <input type="text" class="rule-input rule-header" placeholder="Header name, e.g. x-token" spellcheck="false">
      <select class="rule-input rule-operation" title="Operation">
        <option value="set">Set</option>
        <option value="remove">Remove</option>
      </select>
      <button class="btn-delete" title="Delete">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor"/>
        </svg>
      </button>
    </div>
    <div class="rule-row rule-row-detail">
      <div class="value-field">
        <input type="text" class="rule-input rule-value is-masked" placeholder="Value" spellcheck="false" autocomplete="off">
        <button class="btn-reveal" title="Show value">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">${EYE_ICON}</svg>
        </button>
      </div>
      <input type="text" class="rule-input rule-domains" placeholder="All domains" spellcheck="false"
        title="Comma-separated domains. Subdomains and all ports are included. Leave empty for every site.">
    </div>
    <div class="rule-hint"></div>`;

  const enabledInput = card.querySelector('.rule-enabled');
  const headerInput = card.querySelector('.rule-header');
  const operationSelect = card.querySelector('.rule-operation');
  const valueInput = card.querySelector('.rule-value');
  const domainsInput = card.querySelector('.rule-domains');
  const revealBtn = card.querySelector('.btn-reveal');

  enabledInput.checked = rule.enabled;
  headerInput.value = rule.header;
  operationSelect.value = rule.operation;
  valueInput.value = rule.value;
  domainsInput.value = rule.domains;

  const update = () => {
    save();
    updateCardState(card, rule);
  };

  enabledInput.addEventListener('change', () => {
    rule.enabled = enabledInput.checked;
    update();
  });

  headerInput.addEventListener('input', () => {
    rule.header = headerInput.value;
    update();
  });

  operationSelect.addEventListener('change', () => {
    rule.operation = operationSelect.value;
    update();
  });

  valueInput.addEventListener('input', () => {
    rule.value = valueInput.value;
    update();
  });

  domainsInput.addEventListener('input', () => {
    rule.domains = domainsInput.value;
    update();
  });

  // 值預設遮罩，避免分享螢幕時露出 token
  revealBtn.addEventListener('click', () => {
    const masked = valueInput.classList.toggle('is-masked');
    revealBtn.title = masked ? 'Show value' : 'Hide value';
    revealBtn.querySelector('svg').innerHTML = masked ? EYE_ICON : EYE_OFF_ICON;
  });

  card.querySelector('.btn-delete').addEventListener('click', () => {
    state.rules = state.rules.filter((r) => r.id !== rule.id);
    save();
    renderRules();
  });

  updateCardState(card, rule);
  return card;
}

// 同步卡片的停用樣式、Remove 時隱藏值欄位，以及無法套用的原因
function updateCardState(card, rule) {
  card.classList.toggle('is-disabled', !rule.enabled);
  card.querySelector('.value-field').hidden = rule.operation === 'remove';

  const issue = rule.enabled ? getRuleIssue(rule) : null;
  const hint = card.querySelector('.rule-hint');
  hint.textContent = issue || '';
  hint.hidden = !issue;
}

// 設定事件監聽器
function setupEventListeners() {
  document.getElementById('globalToggle').addEventListener('change', (e) => {
    state.enabled = e.target.checked;
    save();
  });

  // 新增規則並聚焦到 header 名稱
  document.getElementById('addRule').addEventListener('click', () => {
    state.rules.push({
      id: createRuleId(),
      enabled: true,
      header: '',
      operation: 'set',
      value: '',
      domains: '',
    });
    save();
    renderRules();

    const cards = document.querySelectorAll('.rule-card');
    const lastCard = cards[cards.length - 1];
    lastCard.querySelector('.rule-header').focus();
    lastCard.scrollIntoView({ block: 'nearest' });
  });
}

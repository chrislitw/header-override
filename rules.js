// popup 與 background 共用的規則讀取、驗證與轉換

// 只改 fetch / XHR 發出的 API 請求，不動頁面、圖片等其他資源
const RESOURCE_TYPES = ['xmlhttprequest'];

// RFC 7230 的 token 字元
const HEADER_NAME_RE = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
const DOMAIN_RE = /^[a-z0-9-]+(\.[a-z0-9-]+)*$/;

async function loadState() {
  const { enabled = true, rules = [] } = await chrome.storage.local.get(['enabled', 'rules']);
  return { enabled, rules };
}

// 解析逗號或空白分隔的網域，容許使用者貼上完整網址或帶埠號
function parseDomains(input) {
  const domains = [];
  const invalid = [];

  (input || '')
    .split(/[\s,]+/)
    .filter(Boolean)
    .forEach((part) => {
      const host = part
        .toLowerCase()
        .replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
        .replace(/[/?#].*$/, '')
        .replace(/:\d+$/, '')
        .replace(/^\*\./, '');

      if (DOMAIN_RE.test(host)) {
        if (!domains.includes(host)) domains.push(host);
      } else {
        invalid.push(part);
      }
    });

  return { domains, invalid };
}

// 回傳規則無法套用的原因；可以套用時回傳 null
function getRuleIssue(rule) {
  const header = rule.header.trim();
  if (!header) return 'Header name is required';
  if (!HEADER_NAME_RE.test(header)) return 'Invalid header name';
  if (rule.operation === 'set' && !rule.value.trim()) return 'Value is required';

  const { invalid } = parseDomains(rule.domains);
  // 網域打錯時不能退回成「套用到所有網站」，所以視為無法套用
  if (invalid.length) return `Invalid domain: ${invalid[0]}`;

  return null;
}

function getActiveRules(state) {
  if (!state.enabled) return [];
  return state.rules.filter((rule) => rule.enabled && !getRuleIssue(rule));
}

// 轉成 declarativeNetRequest 的動態規則
function toDnrRule(rule, id) {
  const requestHeader = { header: rule.header.trim(), operation: rule.operation };
  if (rule.operation === 'set') {
    requestHeader.value = rule.value.trim();
  }

  const condition = { resourceTypes: RESOURCE_TYPES };
  const { domains } = parseDomains(rule.domains);
  if (domains.length) {
    // requestDomains 會一併比對子網域
    condition.requestDomains = domains;
  }

  return {
    id,
    priority: 1,
    action: { type: 'modifyHeaders', requestHeaders: [requestHeader] },
    condition,
  };
}

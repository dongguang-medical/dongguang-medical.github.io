// ============================================================
// 依開關顯示／隱藏欄位
//
// Sveltia CMS 沒有「打開開關才顯示欄位」的設定，這裡在畫面上依開關狀態
// 把欄位藏起來或顯示出來。只是看不到，欄位裡的資料不會被刪除；
// 產生器（scripts/build_catalog.py）也照同樣的開關決定要不要採用那些資料。
//
// 對應方式同 field-examples.js：欄位外層的 data-typed-key-path 就是
// config.yml 的欄位 name。Sveltia 改版後若畫面結構變了，這支會找不到開關，
// 結果是全部欄位都照常顯示，不會壞掉。
// ============================================================

// 開關（boolean 欄位）是否打開
const isOn = (name) =>
  document.querySelector(`[data-typed-key-path="${name}"] [role="switch"]`)
    ?.getAttribute('aria-checked') === 'true';

// 多選欄位的某個選項是否勾選
const isChecked = (name, option) =>
  [...document.querySelectorAll(`[data-typed-key-path="${name}"] [role="checkbox"]`)]
    .some((box) => box.getAttribute('aria-checked') === 'true'
      && (box.getAttribute('aria-labelledby') || '').split(' ')
        .some((id) => document.getElementById(id)?.textContent.trim() === option));

// 欄位 name → 什麼時候要顯示
const RULES = {
  // 像蝦皮的「開啟商品規格」：關著只填售價，打開改填規格與價格
  price: () => !isOn('has_variants'),
  variants: () => isOn('has_variants'),
  rental_price: () => isOn('rentable'),
  shopee_url: () => isChecked('offering', '線上選購'),
};

function applyRules() {
  // 編輯畫面還沒出現（例如在商品列表頁）就不用處理
  if (!document.querySelector('[data-typed-key-path="has_variants"]')) return;
  for (const [name, visible] of Object.entries(RULES)) {
    const field = document.querySelector(`[data-typed-key-path="${name}"]`);
    if (!field) continue;
    const display = visible() ? '' : 'none';
    if (field.style.display !== display) field.style.display = display;
  }
}

// 開關一切換（aria-checked 改變）或畫面換頁長出新欄位，就重新套用
let queued = false;
new MutationObserver(() => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    applyRules();
  });
}).observe(document.documentElement, {
  childList: true, subtree: true, attributes: true, attributeFilter: ['aria-checked'],
});

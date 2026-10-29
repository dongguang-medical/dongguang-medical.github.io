// ============================================================
// 欄位裡的灰色範例字（placeholder）
//
// Sveltia CMS 的欄位設定沒有 placeholder 選項，這裡在畫面長出欄位後補上。
// 對應方式是欄位外層的 data-typed-key-path（就是 config.yml 的欄位 name，
// 清單裡的子欄位寫成「清單名.*.子欄位名」），不依賴畫面上的中文名稱。
// 欄位已經有內容時範例字不會顯示，不影響存檔的資料。
// ============================================================

// 商品編輯頁
const PRODUCT_EXAMPLES = {
  name: '鋁合金四輪助行車',
  price: '3500',
  'variants.*.label': 'M',
  'variants.*.price': '450',
  regulatory: [
    '許可證字號：衛署醫器製壹字第000000號',
    '許可證品名：○○○（未滅菌）',
    '持證藥商：○○股份有限公司',
    '製造廠：○○股份有限公司',
    '製造廠地址：○○市○○區○○路○號',
  ].join('\n'),
  rental_price: '800/月',
  shopee_url: 'https://shopee.tw/…（整段網址貼上）',
  'specs.*.label': '承重',
  'specs.*.value': '100 公斤',
};

// 品牌編輯頁：用店裡實際有的中英文品牌名
const BRAND_EXAMPLES = {
  name: '安適康 AnsCare',
};

// 文章編輯頁
const ARTICLE_EXAMPLES = {
  title: '輪椅怎麼挑？選購前要量的 3 個尺寸',
  summary: '座寬、座深、椅背高度沒量好，坐久了容易不舒服。這篇整理門市最常被問到的挑選重點。',
};

// 商品與品牌都有 name 欄位，依目前開的是哪一種編輯頁挑範例。
// 商品頁以「多種價格」欄位判斷（同 index.html 分區標題的判斷）
function examplesFor(root) {
  if (root.querySelector('[data-typed-key-path="has_variants"]')) return PRODUCT_EXAMPLES;
  if (location.hash.includes('/collections/brands/')) return BRAND_EXAMPLES;
  if (location.hash.includes('/collections/articles/')) return ARTICLE_EXAMPLES;
  return null;
}

function applyExamples(root) {
  const examples = examplesFor(root);
  if (!examples) return;
  for (const field of root.querySelectorAll('[data-typed-key-path]')) {
    const example = examples[field.dataset.typedKeyPath];
    if (!example) continue;
    // 只填這個欄位自己的輸入框，不碰巢狀在裡面的其他欄位
    for (const input of field.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]), textarea')) {
      if (input.closest('[data-typed-key-path]') === field && !input.placeholder) {
        input.placeholder = example;
      }
    }
  }
}

// 後台是單頁應用，欄位會隨開啟商品、新增清單項目而陸續出現
let queued = false;
new MutationObserver(() => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    applyExamples(document);
  });
}).observe(document.documentElement, { childList: true, subtree: true });

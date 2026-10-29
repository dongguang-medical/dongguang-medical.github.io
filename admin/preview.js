// ============================================================
// 商品與文章編輯的即時預覽樣板
//
// 後台右半邊的預覽，畫成網站上「商品頁」「文章頁」的樣子，
// 店員邊打字就能看到上架後大概長怎樣。
//
// ⚠️ 版面是照 scripts/build_catalog.py 的 build_product_pages()、
//    build_article_pages() 用 JavaScript 再寫一份。那邊改了頁面的
//    結構或顯示規則（價格、標記、規格表…），這裡要跟著改，
//    不然預覽會跟實際網站對不起來。樣式直接沿用網站的 CSS，不必另外維護。
//    頁首頁尾、相關商品這些跟單一商品無關的部分不畫。
// ============================================================

// 店家資料與顯示開關由產生器輸出，跟網站用的是同一份。
// 沿用本檔網址上的版本號（?v=…，產生器加的），常數檔更新時才不會拿到快取的舊版
const {
  OFFERINGS, PLACEHOLDER, PRODUCT_CTA_SUB, SHOPEE_ENABLED, STORE_REGULATORY, SUBSIDIES,
} = await import(`./preview-constants.js${new URL(import.meta.url).search}`);

const CMS = window.CMS;
const { useEffect, useState } = CMS.React;

// 預覽框是獨立的 iframe，網站的樣式要另外掛進去
for (const css of ['design-system.css', 'intro.css', 'catalog.css']) {
  CMS.registerPreviewStyle(`/assets/css/${css}`);
}
CMS.registerPreviewStyle(
  'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap',
);
// 預覽框裡沒有網站頁首，拿掉替頁首預留的空白
CMS.registerPreviewStyle(
  `body { background: var(--color-bg, #fff); }
  .cat-main { padding-top: 0; }
  .cat-section { padding-top: 16px; }
  /* 預覽裡點連結會讓預覽框跳走，一律停用 */
  a { pointer-events: none; }
  /* 文章預覽上方的列表卡片：不論預覽框多寬，電腦版、手機版兩種排法都畫出來 */
  .art-preview-label { font-size: 13px; font-weight: 700; color: var(--color-text-secondary); margin: 16px 0 8px; }
  .art-preview-label:first-child { margin-top: 0; }
  .art-card.art-preview-row { flex-direction: row; }
  .art-card.art-preview-row .art-card-cover { flex: 0 0 240px; aspect-ratio: 4 / 3; }
  .art-card.art-preview-stack { flex-direction: column; }
  .art-card.art-preview-stack .art-card-cover { flex: none; }
  .art-preview-phone { max-width: 360px; }`,
  { raw: true },
);

// ── 小工具（對應 build_catalog.py 的同名函式） ─────────────

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;',
  })[c]);

const toJS = (v) => (v && typeof v.toJS === 'function' ? v.toJS() : v);
const str = (v) => (typeof v === 'string' ? v.trim() : '');
const truthy = (v) => v === true || ['true', 'yes', '1'].includes(String(v).trim().toLowerCase());

function parsePrice(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? Math.trunc(raw) : null;
  const digits = String(raw).replace(/[^\d]/g, '');
  return digits ? parseInt(digits, 10) : null;
}

const thousands = (n) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

function formatPrice(value, valueMax = null) {
  if (value === null) return '';
  if (valueMax !== null && valueMax > value) return `NT$${thousands(value)}～${thousands(valueMax)}`;
  return `NT$${thousands(value)}`;
}

const BOLD_RE = /\*\*(.+?)\*\*/g;
// 斜體：前後不能緊貼英數字（JS 的 \w 本來就只算英數），網址裡的底線才不會被誤判
const ITALIC_RE = /(?<![\w*])([*_])(?=\S)(.+?)(?<=\S)\1(?![\w*])/g;
// 圖片在跳脫後比對，標題的引號已變成 &quot;
const IMG_ESC_RE = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;.*?&quot;)?\)/g;
const LINK_RE = /\[([^\]]+)\]\(([^)\s]+)\)/g;
const UL_ITEM_RE = /^[-*]\s+/;
const OL_ITEM_RE = /^\d+[.、]\s*/;

// imageUrl：把內文圖片路徑換成預覽框看得到的網址（剛上傳、還沒存檔的圖片）
const inline = (text, imageUrl = (src) => src) =>
  esc(text)
    .replace(BOLD_RE, '<strong>$1</strong>')
    .replace(ITALIC_RE, '<em>$2</em>')
    .replace(IMG_ESC_RE, (_, alt, src) => `<img src="${esc(imageUrl(src))}" alt="${alt}">`)
    .replace(LINK_RE, '<a href="$2">$1</a>');

// minHeading：商品頁內文從 h3 起；文章頁只有標題是 h1，內文可用 h2（同 md_to_html）
function mdToHtml(md, minHeading = 3, imageUrl = undefined) {
  const inl = (text) => inline(text, imageUrl);
  if (!md) return '';
  const parts = [];
  for (const block of md.trim().split(/\n\s*\n/)) {
    const lines = block.split('\n').filter((ln) => ln.trim()).map((ln) => ln.trimEnd());
    if (!lines.length) continue;
    if (lines.every((ln) => UL_ITEM_RE.test(ln))) {
      parts.push(`<ul>${lines.map((ln) => `<li>${inl(ln.replace(UL_ITEM_RE, ''))}</li>`).join('')}</ul>`);
    } else if (lines.every((ln) => OL_ITEM_RE.test(ln))) {
      parts.push(`<ol>${lines.map((ln) => `<li>${inl(ln.replace(OL_ITEM_RE, ''))}</li>`).join('')}</ol>`);
    } else if (lines[0].startsWith('#')) {
      const hashes = lines[0].length - lines[0].replace(/^#+/, '').length;
      const level = Math.max(Math.min(hashes + minHeading - 2, 4), minHeading);
      parts.push(`<h${level}>${inl(lines[0].replace(/^#+/, '').trim())}</h${level}>`);
    } else {
      parts.push(`<p>${lines.map(inl).join('<br>\n')}</p>`);
    }
  }
  return parts.join('\n');
}

// ── 把後台欄位整理成跟 load_products() 一樣的商品資料 ────────

function toProduct(data, brandName, imageUrl) {
  const taxonomy = str(data.taxonomy);
  const slash = taxonomy.indexOf('/');
  const category = slash < 0 ? taxonomy : taxonomy.slice(0, slash);

  // 「多種價格」關著時規格清單是藏起來的，殘留資料不採用（同 load_products）
  const variants = (truthy(data.has_variants ?? false) ? data.variants || [] : [])
    .filter((d) => d && d.label)
    .map((d) => ({ label: d.label, price: parsePrice(d.price) }));
  const variantPrices = variants.map((v) => v.price).filter((p) => p !== null);
  let price;
  let priceMax;
  if (variantPrices.length) {
    price = Math.min(...variantPrices);
    priceMax = Math.max(...variantPrices);
  } else {
    price = priceMax = parsePrice(data.price);
  }
  const offering = (data.offering || []).filter((o) => OFFERINGS.includes(o));

  return {
    name: str(data.name),
    category,
    price,
    priceText: formatPrice(price, priceMax),
    variants,
    regulatory: String(data.regulatory || '').trim(),
    brand: brandName,
    offering: offering.length ? offering : ['門市洽詢'],
    rentalPrice: str(data.rental_price),
    shopeeUrl: str(data.shopee_url),
    rentable: truthy(data.rentable ?? false),
    subsidy: (data.subsidy || []).filter((x) => SUBSIDIES.includes(x)),
    specs: (data.specs || []).filter((d) => d && d.label),
    images: (data.images || []).filter((p) => typeof p === 'string' && p.trim()).map(imageUrl),
    body: data.body || '',
  };
}

// ── 版面（對應 price_html / build_product_pages） ──

function priceHtml(p) {
  return p.priceText
    ? `<div class="cat-product-price">${esc(p.priceText)}</div>`
    : '<div class="cat-product-price cat-price-ask">歡迎洽詢</div>';
}

function specsHtml(p) {
  let variantPart = '';
  let specsPart = '';
  if (p.variants.length) {
    const prices = p.variants.map((v) => v.price).filter((x) => x !== null);
    if (prices.length && new Set(prices).size > 1) {
      const rows = p.variants
        .map((v) => `<tr><th scope="row">${esc(v.label)}</th><td>${esc(formatPrice(v.price)) || '洽詢'}</td></tr>`)
        .join('');
      variantPart = `<table class="cat-spec-table cat-variant-table">
  <thead><tr><th scope="col">規格</th><th scope="col">價格</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`;
    } else {
      specsPart += `<tr><th scope="row">規格</th><td>${esc(p.variants.map((v) => v.label).join('、'))}</td></tr>`;
    }
  }
  specsPart += p.specs.map((d) => `<tr><th scope="row">${esc(d.label)}</th><td>${esc(d.value ?? '')}</td></tr>`).join('');
  if (!variantPart && !specsPart) return '';
  const attrTable = specsPart ? `<table class="cat-spec-table">${specsPart}</table>` : '';
  return `<section class="cat-block">
  <h2>商品規格</h2>
  <div style="overflow-x:auto;">${variantPart}${attrTable}</div>
</section>`;
}

function legalHtml(p) {
  if (!p.regulatory) return '';
  const lines = (text) => text.split('\n').filter((ln) => ln.trim()).map(esc).join('<br>\n');
  return `<section class="cat-block cat-legal">
  <h2>法定標示</h2>
  <div class="cat-legal-body">${lines(p.regulatory)}<p class="cat-legal-store">${lines(STORE_REGULATORY)}</p></div>
</section>`;
}

function productPage(p) {
  const images = p.images.length ? p.images : [PLACEHOLDER];
  const thumbs = images.length > 1
    ? `<div class="cat-gallery-thumbs">${images
      .map((src, i) => `<button type="button"${i === 0 ? ' class="active"' : ''}><img src="${esc(src)}" alt="" width="120" height="120"></button>`)
      .join('')}</div>`
    : '';

  const offerRows = [];
  if (p.rentable) offerRows.push(['租金', p.rentalPrice || '依租期而定，歡迎來電詢價']);
  if (p.subsidy.length) offerRows.push(['補助', p.subsidy.join('、')]);
  const offerHtml = offerRows.length
    ? `<div class="cat-offer-rows">${offerRows
      .map(([k, v]) => `<div class="cat-offer-row"><span class="cat-offer-label">${esc(k)}</span><span>${esc(v)}</span></div>`)
      .join('')}</div>`
    : '';

  const shopeeCta = SHOPEE_ENABLED && p.offering.includes('線上選購') && p.shopeeUrl
    ? '<a class="cat-cta-shopee">蝦皮下單</a>'
    : '';
  const brandHtml = p.brand ? `<p class="cat-product-brand">品牌：<strong>${esc(p.brand)}</strong></p>` : '';
  const priceNote = p.price
    ? '<p class="cat-price-note">價格如有異動，以門市標示為準。</p>'
    : '<p class="cat-price-note">此商品採詢價報價，歡迎來電或親臨門市。</p>';

  const bodyHtml = mdToHtml(p.body);
  const descHtml = bodyHtml
    ? `<section class="cat-block"><h2>商品說明</h2><div class="cat-desc">${bodyHtml}</div></section>`
    : '';

  const crumbs = ['<span>商品分類</span>'];
  if (p.category) crumbs.push('<span class="cat-bc-sep">›</span>', `<span>${esc(p.category)}</span>`);
  crumbs.push('<span class="cat-bc-sep">›</span>', `<span class="cat-bc-current">${esc(p.name || '（尚未填商品名稱）')}</span>`);

  return `<nav class="cat-breadcrumb">${crumbs.join('')}</nav>
<div class="cat-product-layout">
  <div class="cat-gallery">
    <div class="cat-gallery-main">
      <img src="${esc(images[0])}" alt="${esc(p.name)}" width="800" height="600">
    </div>
    ${thumbs}
    <p class="cat-photo-note">圖片僅供參考，實品請依門市現場為主</p>
  </div>
  <div class="cat-product-info">
    <h1>${esc(p.name || '（尚未填商品名稱）')}</h1>
    ${brandHtml}
    ${priceHtml(p)}
    ${priceNote}
    ${offerHtml}
    <div class="cat-cta">
      <div class="cat-cta-actions">
        <a class="cat-cta-call">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91A16 16 0 0 0 16 17l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 23.73 18z"/></svg>
          電話洽詢
        </a>
        ${shopeeCta}
      </div>
      <p class="cat-cta-sub">${esc(PRODUCT_CTA_SUB)}</p>
    </div>
  </div>
</div>
${specsHtml(p)}${descHtml}${legalHtml(p)}`;
}

// ── 預覽元件 ───────────────────────────────────────────

function ProductPreview({ entry, getAsset, getCollection }) {
  const data = toJS(entry.get('data')) || {};
  const brandSlug = str(data.brand);

  // 商品只存品牌代碼，顯示名稱要去品牌清單查
  const [brandName, setBrandName] = useState('');
  useEffect(() => {
    let alive = true;
    if (!brandSlug) {
      setBrandName('');
      return undefined;
    }
    getCollection('brands', brandSlug)
      .then((b) => { if (alive) setBrandName(str(toJS(b)?.data?.name) || brandSlug); })
      .catch(() => { if (alive) setBrandName(brandSlug); });
    return () => { alive = false; };
  }, [brandSlug]);

  // 剛上傳、還沒儲存的照片也要能顯示：交給 getAsset 換成可用的網址
  const imageUrl = (path) => {
    const asset = getAsset(path);
    return asset ? String(asset) : path;
  };
  const product = toProduct(data, brandName, imageUrl);

  const html = `<main class="cat-main"><div class="cat-section"><div class="cat-container">
${productPage(product)}
</div></div></main>`;

  return window.h('div', { dangerouslySetInnerHTML: { __html: html } });
}

CMS.registerPreviewTemplate('products', ProductPreview);

// ── 文章（對應 load_articles / build_article_pages） ──────────

// 後台存的是 YYYY-MM-DD；沒填或格式不對時，網站會略過這篇，預覽也照實提醒
function articleDateHtml(raw) {
  const m = String(raw ?? '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return '<span style="color:#c00">（尚未填發布日期，網站不會顯示這篇）</span>';
  return `<time>${+m[1]} 年 ${+m[2]} 月 ${+m[3]} 日</time>`;
}

// 列表卡片（對應 article_card）：電腦版橫排、手機版直排，兩種都畫出來，
// 店員上傳封面時能直接看到列表上裁出來的樣子
function articleCardsHtml(data, title, imageUrl) {
  const cover = str(data.cover)
    ? `<div class="art-card-cover"><img src="${esc(imageUrl(str(data.cover)))}" alt=""></div>`
    : '';
  const summary = str(data.summary) || '（沒填摘要時，網站會取內文第一段）';
  const card = (cls) => `<div class="art-card ${cls}">
  ${cover}
  <div class="art-card-body">
    <div class="art-date">${articleDateHtml(data.date)}</div>
    <h2>${esc(title)}</h2>
    <p>${esc(summary)}</p>
  </div>
</div>`;
  return `<div class="art-preview-cards">
  <p class="art-preview-label">文章列表上的樣子（電腦版）</p>
  ${card('art-preview-row')}
  <p class="art-preview-label">文章列表上的樣子（手機版）</p>
  <div class="art-preview-phone">${card('art-preview-stack')}</div>
  <p class="art-preview-label">文章內頁</p>
</div>`;
}

function ArticlePreview({ entry, getAsset }) {
  const data = toJS(entry.get('data')) || {};
  const imageUrl = (path) => {
    const asset = getAsset(path);
    return asset ? String(asset) : path;
  };
  const title = str(data.title) || '（尚未填標題）';
  const draft = truthy(data.published ?? true)
    ? ''
    : '<p class="cat-rental-note" style="margin-bottom:16px">「發布」目前關著，存檔後網站上不會出現這篇。</p>';

  const html = `<main class="cat-main"><div class="cat-section"><div class="cat-container">
<nav class="cat-breadcrumb"><span>首頁</span><span class="cat-bc-sep">›</span><span>文章專區</span><span class="cat-bc-sep">›</span><span class="cat-bc-current">${esc(title)}</span></nav>
${draft}${articleCardsHtml(data, title, imageUrl)}
<div class="art-page"><article class="art-article">
  <header class="art-head">
    <h1>${esc(title)}</h1>
    <div class="art-date">${articleDateHtml(data.date)}</div>
  </header>
  <div class="cat-desc art-body">${mdToHtml(data.body || '', 2, imageUrl)}</div>
</article></div>
</div></div></main>`;

  return window.h('div', { dangerouslySetInnerHTML: { __html: html } });
}

CMS.registerPreviewTemplate('articles', ArticlePreview);

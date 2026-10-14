// ============================================================
// 商品編輯的即時預覽樣板
//
// 後台右半邊的預覽，畫成網站上「商品卡」與「商品頁」的樣子，
// 店員邊打字就能看到上架後大概長怎樣。
//
// ⚠️ 版面是照 scripts/build_catalog.py 的 product_card() 與
//    build_product_pages() 用 JavaScript 再寫一份。那邊改了商品頁的
//    結構或顯示規則（價格、標記、規格表…），這裡要跟著改，
//    不然預覽會跟實際網站對不起來。樣式直接沿用網站的 CSS，不必另外維護。
//    頁首頁尾、相關商品這些跟單一商品無關的部分不畫。
// ============================================================

// 店家資料與顯示開關由產生器輸出，跟網站用的是同一份
import {
  OFFERINGS, PLACEHOLDER, PRODUCT_CTA_SUB, SHOPEE_ENABLED, STORE_REGULATORY, SUBSIDIES,
} from './preview-constants.js';

const CMS = window.CMS;
const { useEffect, useState } = CMS.React;

// 預覽框是獨立的 iframe，網站的樣式要另外掛進去
for (const css of ['design-system.css', 'intro.css', 'catalog.css']) {
  CMS.registerPreviewStyle(`/assets/css/${css}`);
}
CMS.registerPreviewStyle(
  'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap',
);
// 預覽框比較窄，留點邊；說明條與網站內容區隔開
CMS.registerPreviewStyle(
  `body { background: var(--color-bg, #fff); }
  /* 後台的「同步捲動」會跟著預覽頁面的捲動去捲左邊的欄位，捲預覽時左邊亂跳。
     把頁面本身鎖住、改由內層的框捲動，就不會牽動左邊 */
  html, body { height: 100%; overflow: hidden; }
  .pv-scroll { height: 100vh; overflow-y: auto; overscroll-behavior: contain; }
  .cat-main { padding-top: 0; }
  .cat-section { padding-top: 16px; }
  .pv-note { margin: 0 0 12px; padding: 8px 12px; border-radius: 8px;
    background: #fff7e6; color: #7a4b00; font-size: 13px; line-height: 1.6; }
  .pv-label { margin: 24px 0 8px; font-size: 13px; font-weight: 700; color: #666; }
  .pv-card-wrap { max-width: 260px; }
  .pv-card-wrap .cat-card { pointer-events: none; }
  /* 預覽裡點連結會讓預覽框跳走，一律停用 */
  a { pointer-events: none; }`,
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
const LINK_RE = /\[([^\]]+)\]\(([^)\s]+)\)/g;
const UL_ITEM_RE = /^[-*]\s+/;
const OL_ITEM_RE = /^\d+[.、]\s*/;

const inline = (text) =>
  esc(text).replace(BOLD_RE, '<strong>$1</strong>').replace(LINK_RE, '<a href="$2">$1</a>');

function mdToHtml(md) {
  if (!md) return '';
  const parts = [];
  for (const block of md.trim().split(/\n\s*\n/)) {
    const lines = block.split('\n').filter((ln) => ln.trim()).map((ln) => ln.trimEnd());
    if (!lines.length) continue;
    if (lines.every((ln) => UL_ITEM_RE.test(ln))) {
      parts.push(`<ul>${lines.map((ln) => `<li>${inline(ln.replace(UL_ITEM_RE, ''))}</li>`).join('')}</ul>`);
    } else if (lines.every((ln) => OL_ITEM_RE.test(ln))) {
      parts.push(`<ol>${lines.map((ln) => `<li>${inline(ln.replace(OL_ITEM_RE, ''))}</li>`).join('')}</ol>`);
    } else if (lines[0].startsWith('#')) {
      const hashes = lines[0].length - lines[0].replace(/^#+/, '').length;
      const level = Math.max(Math.min(hashes + 1, 4), 3);
      parts.push(`<h${level}>${inline(lines[0].replace(/^#+/, '').trim())}</h${level}>`);
    } else {
      parts.push(`<p>${lines.map(inline).join('<br>\n')}</p>`);
    }
  }
  return parts.join('\n');
}

// ── 把後台欄位整理成跟 load_products() 一樣的商品資料 ────────

function toProduct(data, brandName, imageUrl) {
  const taxonomy = str(data.taxonomy);
  const slash = taxonomy.indexOf('/');
  const category = slash < 0 ? taxonomy : taxonomy.slice(0, slash);

  const variants = (data.variants || [])
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
    variantLabel: str(data.variant_label) || '規格',
    regulatory: String(data.regulatory || '').trim(),
    brand: brandName,
    offering: offering.length ? offering : ['門市洽詢'],
    rentalPrice: str(data.rental_price),
    shopeeUrl: str(data.shopee_url),
    rentable: truthy(data.rentable ?? false),
    subsidy: (data.subsidy || []).filter((x) => SUBSIDIES.includes(x)),
    tags: (data.tags || []).filter((t) => typeof t === 'string' && t),
    specs: (data.specs || []).filter((d) => d && d.label),
    images: (data.images || []).filter((p) => typeof p === 'string' && p.trim()).map(imageUrl),
    body: data.body || '',
  };
}

// ── 版面（對應 price_html / badge_spans / product_card / build_product_pages） ──

function priceHtml(p, big = false) {
  const cls = big ? 'cat-product-price' : 'cat-card-price';
  return p.priceText
    ? `<div class="${cls}">${esc(p.priceText)}</div>`
    : `<div class="${cls} cat-price-ask">歡迎洽詢</div>`;
}

function badgeSpans(p) {
  const marks = [];
  if (p.rentable) marks.push('<span class="cat-badge cat-badge-rent">可租賃</span>');
  if (SHOPEE_ENABLED && p.offering.includes('線上選購')) {
    marks.push('<span class="cat-badge cat-badge-online">線上可購</span>');
  }
  if (p.subsidy.length) marks.push('<span class="cat-badge cat-badge-subsidy">可申請補助</span>');
  return marks;
}

const plainTags = (p) => p.tags.filter((t) => t !== '可租賃' && t !== '可申請補助');

function productCard(p) {
  const pills = badgeSpans(p).concat(plainTags(p).slice(0, 2).map((t) => `<span class="cat-tag">${esc(t)}</span>`));
  const tags = pills.length ? `<div class="cat-tags">${pills.join('')}</div>` : '';
  const brand = p.brand ? `<div class="cat-card-brand">${esc(p.brand)}</div>` : '';
  const cover = p.images[0] || PLACEHOLDER;
  return `<div class="cat-card">
  <div class="cat-card-photo">
    <img src="${esc(cover)}" alt="${esc(p.name)}" width="400" height="300">
  </div>
  <div class="cat-card-body">
    <h3>${esc(p.name)}</h3>
    ${brand}
    ${tags}
    ${priceHtml(p)}
  </div>
</div>`;
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
  <thead><tr><th scope="col">${esc(p.variantLabel)}</th><th scope="col">價格</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`;
    } else {
      specsPart += `<tr><th scope="row">${esc(p.variantLabel)}</th><td>${esc(p.variants.map((v) => v.label).join('、'))}</td></tr>`;
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

  const tags = plainTags(p);
  const tagsHtml = tags.length ? `<div class="cat-tags">${tags.map((t) => `<span class="cat-tag">${esc(t)}</span>`).join('')}</div>` : '';

  const offerRows = [];
  if (p.rentalPrice) offerRows.push(['租金', p.rentalPrice]);
  else if (p.rentable) offerRows.push(['租金', '依租期而定，歡迎來電詢價']);
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
    ${priceHtml(p, true)}
    ${priceNote}
    ${tagsHtml}
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

  const hidden = data.published === false
    ? '<p class="pv-note">「上架顯示」目前是關閉的：儲存後這個商品不會出現在網站上。</p>'
    : '';
  const html = `<main class="cat-main"><div class="cat-section"><div class="cat-container">
${hidden}<p class="pv-note">這是預覽，儲存後約 1～3 分鐘網站才會更新。</p>
<p class="pv-label">商品卡（分類頁、首頁上看到的樣子）</p>
<div class="pv-card-wrap">${productCard(product)}</div>
<p class="pv-label">商品頁</p>
${productPage(product)}
</div></div></main>`;

  return window.h('div', { className: 'pv-scroll', dangerouslySetInnerHTML: { __html: html } });
}

CMS.registerPreviewTemplate('products', ProductPreview);

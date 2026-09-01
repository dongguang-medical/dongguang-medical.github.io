/* ==========================================================================
   subsidy.js — 長照輔具補助試算（/subsidy/）

   給付項目、購置價格上限與最低使用年限：
     長期照顧服務申請及給付辦法「附表四 照顧組合表」第一組（E、F 碼）
   部分負擔比率：
     同辦法「附表五」— E、F 碼 第一類 0%、第二類 10%、第三類 30%
     金額小數點後無條件捨去
   長照額度以「給付價格（含民眾部分負擔）」扣除，非僅政府給付部分。

   廠商資料（名稱／地址／代表人）不寫在程式裡，由使用者自行輸入後
   存於該裝置的 localStorage，不會上傳。
   ========================================================================== */
(function () {
  "use strict";

  /* p = 購置價格給付上限；y = 購置最低使用年限；u = 給付單位 */
  var ITEMS = [
    {c:"EA01",n:"馬桶增高器、便盆椅或沐浴椅",p:1200,y:3,u:"件",g:"個人照顧與沐浴排泄"},

    {c:"EB01",n:"單支枴杖-不銹鋼製",p:1000,y:5,u:"支",g:"行動輔助"},
    {c:"EB02",n:"單支枴杖-鋁製",p:500,y:3,u:"支",g:"行動輔助"},
    {c:"EB03",n:"助行器",p:800,y:3,u:"件",g:"行動輔助"},
    {c:"EB04",n:"帶輪型助步車（助行椅）",p:3000,y:3,u:"件",g:"行動輔助"},

    {c:"EC01",n:"輪椅-A款（非輕量化量產型）",p:3500,y:3,u:"台",g:"輪椅與擺位系統"},
    {c:"EC02",n:"輪椅-B款（輕量化量產型）",p:4000,y:3,u:"台",g:"輪椅與擺位系統"},
    {c:"EC03",n:"輪椅-C款（量身訂製型）",p:9000,y:3,u:"台",g:"輪椅與擺位系統"},
    {c:"EC04",n:"輪椅附加功能-A款（具利於移位功能）",p:5000,y:3,u:"組",g:"輪椅與擺位系統"},
    {c:"EC05",n:"輪椅附加功能-B款（具仰躺功能）",p:2000,y:3,u:"組",g:"輪椅與擺位系統"},
    {c:"EC06",n:"輪椅附加功能-C款（具空中傾倒功能）",p:4000,y:3,u:"組",g:"輪椅與擺位系統"},
    {c:"EC07",n:"擺位系統-A款（平面型輪椅背靠）",p:1000,y:3,u:"組",g:"輪椅與擺位系統"},
    {c:"EC08",n:"擺位系統-B款（曲面適形輪椅背靠）",p:6000,y:3,u:"組",g:"輪椅與擺位系統"},
    {c:"EC09",n:"擺位系統-C款（輪椅軀幹側支撐架）",p:3000,y:3,u:"組",g:"輪椅與擺位系統"},
    {c:"EC10",n:"擺位系統-D款（輪椅頭靠系統）",p:2500,y:3,u:"組",g:"輪椅與擺位系統"},

    {c:"ED01",n:"移位腰帶",p:1500,y:3,u:"件",g:"移位輔具"},
    {c:"ED02",n:"移位板",p:2000,y:5,u:"件",g:"移位輔具"},
    {c:"ED03",n:"人力移位吊帶",p:4000,y:3,u:"件",g:"移位輔具"},
    {c:"ED04",n:"移位滑墊-A款",p:3000,y:5,u:"件",g:"移位輔具"},
    {c:"ED05",n:"移位滑墊-B款",p:8000,y:5,u:"件",g:"移位輔具"},
    {c:"ED06",n:"移位轉盤",p:2000,y:3,u:"件",g:"移位輔具"},
    {c:"ED07",n:"移位機",p:40000,y:10,u:"台",g:"移位輔具"},
    {c:"ED08",n:"移位機吊帶",p:6000,y:3,u:"件",g:"移位輔具"},

    {c:"EE01",n:"電話擴音器",p:2000,y:5,u:"件",g:"溝通與安全看視"},
    {c:"EE02",n:"電話閃光震動器",p:2000,y:5,u:"件",g:"溝通與安全看視"},
    {c:"EE03",n:"火警閃光警示器",p:2000,y:5,u:"件",g:"溝通與安全看視"},
    {c:"EE04",n:"門鈴閃光器",p:2000,y:5,u:"件",g:"溝通與安全看視"},
    {c:"EE05",n:"無線震動警示器",p:2000,y:5,u:"件",g:"溝通與安全看視"},

    {c:"EF01",n:"衣著用輔具",p:500,y:3,u:"件",g:"生活輔具"},
    {c:"EF02",n:"居家用生活輔具",p:500,y:3,u:"件",g:"生活輔具"},
    {c:"EF03",n:"飲食用輔具",p:500,y:3,u:"件",g:"生活輔具"},

    {c:"EG01",n:"氣墊床-A款",p:8000,y:3,u:"組",g:"壓力分散輔具"},
    {c:"EG02",n:"氣墊床-B款",p:12000,y:3,u:"組",g:"壓力分散輔具"},
    {c:"EG03",n:"輪椅座墊-A款（連通管型氣囊氣墊座-塑膠材質）",p:5000,y:2,u:"個",g:"壓力分散輔具"},
    {c:"EG04",n:"輪椅座墊-B款（連通管型氣囊氣墊座-橡膠材質）",p:10000,y:2,u:"個",g:"壓力分散輔具"},
    {c:"EG05",n:"輪椅座墊-C款（液態凝膠座墊）",p:10000,y:2,u:"個",g:"壓力分散輔具"},
    {c:"EG06",n:"輪椅座墊-D款（固態凝膠座墊）",p:8000,y:5,u:"個",g:"壓力分散輔具"},
    {c:"EG07",n:"輪椅座墊-E款（填充式氣囊氣墊座）",p:8000,y:5,u:"個",g:"壓力分散輔具"},
    {c:"EG08",n:"輪椅座墊-F款（交替充氣型座墊）",p:5000,y:3,u:"個",g:"壓力分散輔具"},
    {c:"EG09",n:"輪椅座墊-G款（量製型座墊）",p:10000,y:3,u:"個",g:"壓力分散輔具"},

    {c:"EH01",n:"居家用照顧床",p:8000,y:5,u:"張",g:"居家照顧床"},
    {c:"EH02",n:"居家用照顧床-附加功能A款（床面升降功能）",p:5000,y:5,u:"組",g:"居家照顧床"},
    {c:"EH03",n:"居家用照顧床-附加功能B款（電動升降功能）",p:5000,y:5,u:"組",g:"居家照顧床"},

    {c:"FA08",n:"居家無障礙修繕-反光貼條或消光處理",p:3000,y:3,u:"處",g:"居家無障礙環境改善（F碼）"},
    {c:"FA13",n:"居家無障礙修繕-水龍頭(單處)（新增、改換）",p:3000,y:10,u:"處",g:"居家無障礙環境改善（F碼）"},
    {c:"FA15",n:"居家無障礙修繕-改善洗臉台（槽）(單處)（新增、改換、移除-含原處填補）",p:3000,y:10,u:"處",g:"居家無障礙環境改善（F碼）"},
    {c:"FA17",n:"居家無障礙修繕-壁掛式淋浴台(單處)",p:5000,y:10,u:"處",g:"居家無障礙環境改善（F碼）"},
    {c:"FA18",n:"居家無障礙修繕-改善流理台(單處)（新增、改換）",p:15000,y:10,u:"處",g:"居家無障礙環境改善（F碼）"},
    {c:"FA19",n:"居家無障礙修繕-改善抽油煙機(單處)（位置調整）",p:1000,y:10,u:"處",g:"居家無障礙環境改善（F碼）"},
    {c:"FA22",n:"居家無障礙修繕-固定式扶手(每十公分)",p:160,y:10,u:"十公分",g:"居家無障礙環境改善（F碼）"},
    {c:"FA23",n:"居家無障礙修繕-可動式扶手(單支)",p:3600,y:10,u:"支",g:"居家無障礙環境改善（F碼）"},
    {c:"FA24",n:"居家無障礙設備-床邊扶手(單處)",p:1000,y:10,u:"處",g:"居家無障礙環境改善（F碼）"},
    {c:"FA25",n:"居家無障礙設備-門檻斜角(單側)",p:1000,y:10,u:"側",g:"居家無障礙環境改善（F碼）"},
    {c:"FA26",n:"居家無障礙設備-非固定式斜坡板A款",p:3500,y:10,u:"片",g:"居家無障礙環境改善（F碼）"},
    {c:"FA27",n:"居家無障礙設備-非固定式斜坡板B款",p:5000,y:10,u:"片",g:"居家無障礙環境改善（F碼）"},
    {c:"FA28",n:"居家無障礙設備-非固定式斜坡板C款",p:7000,y:10,u:"片",g:"居家無障礙環境改善（F碼）"},
    {c:"FA29",n:"居家無障礙設備-非固定式斜坡板D款",p:10000,y:10,u:"片",g:"居家無障礙環境改善（F碼）"},
    {c:"FA30",n:"居家無障礙修繕-改善高低差(高度十公分以下)(單處)",p:3500,y:10,u:"處",g:"居家無障礙環境改善（F碼）"},
    {c:"FA31",n:"居家無障礙修繕-改善高低差(高度二十公分以下)(單處)",p:5000,y:10,u:"處",g:"居家無障礙環境改善（F碼）"},
    {c:"FA32",n:"居家無障礙修繕-改善高低差(高度三十公分以下)(單處)",p:7000,y:10,u:"處",g:"居家無障礙環境改善（F碼）"},
    {c:"FA33",n:"居家無障礙修繕-改善高低差(高度超過三十公分)(單處)",p:10000,y:10,u:"處",g:"居家無障礙環境改善（F碼）"},
    {c:"FA34",n:"居家無障礙修繕-防滑地磚(單處)",p:6000,y:10,u:"處",g:"居家無障礙環境改善（F碼）"},
    {c:"FA35",n:"居家無障礙設備-防滑措施",p:2000,y:3,u:"處",g:"居家無障礙環境改善（F碼）"},
    {c:"FA36",n:"居家無障礙修繕-隔間(每平方公尺)(新增)",p:800,y:10,u:"平方公尺",g:"居家無障礙環境改善（F碼）"},
    {c:"FA37",n:"居家無障礙修繕-門簡易型(單處)",p:7000,y:10,u:"處",g:"居家無障礙環境改善（F碼）"},
    {c:"FA38",n:"居家無障礙修繕-門進階型(單處)",p:10000,y:10,u:"處",g:"居家無障礙環境改善（F碼）"},
    {c:"FA39",n:"居家無障礙修繕-截水槽(單處)",p:6000,y:10,u:"處",g:"居家無障礙環境改善（F碼）"},
    {c:"FA40",n:"居家無障礙修繕-改善浴缸(單處)（新增、改換、移除-含原處填補）",p:7000,y:10,u:"處",g:"居家無障礙環境改善（F碼）"},
    {c:"FA41",n:"居家無障礙修繕-改善馬桶(單處)（新增、改換、移除-含原處填補）",p:5000,y:10,u:"處",g:"居家無障礙環境改善（F碼）"},
    {c:"FA42",n:"居家無障礙修繕-馬桶背靠(單處)",p:2000,y:10,u:"處",g:"居家無障礙環境改善（F碼）"},
    {c:"FA43",n:"居家無障礙設備-移動式身體清洗槽-局部型",p:2000,y:3,u:"組",g:"居家無障礙環境改善（F碼）"},
    {c:"FA44",n:"居家無障礙設備-移動式身體清洗槽-全身型",p:5000,y:3,u:"組",g:"居家無障礙環境改善（F碼）"}
  ];

  var MAX_ROWS = 8;
  var VENDOR_KEY = "dongguang.subsidy.vendor";
  var VENDOR_FIELDS = ["sbVendorName", "sbVendorAddr", "sbVendorRep"];

  var rowSeq = 0;
  var lastResult = null;

  function $(id) { return document.getElementById(id); }
  function money(v) { return Number(v || 0).toLocaleString("en-US"); }
  function esc(v) {
    return String(v === null || v === undefined ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  /* ── 廠商資料：存在使用者自己的瀏覽器，不寫在程式裡 ──────────────── */
  function loadVendor() {
    var raw;
    try { raw = localStorage.getItem(VENDOR_KEY); } catch (e) { return; }
    if (!raw) return;
    var data;
    try { data = JSON.parse(raw); } catch (e) { return; }
    VENDOR_FIELDS.forEach(function (id) {
      if (data && typeof data[id] === "string" && $(id)) $(id).value = data[id];
    });
  }

  function saveVendor() {
    var data = {};
    VENDOR_FIELDS.forEach(function (id) { data[id] = $(id) ? $(id).value : ""; });
    try { localStorage.setItem(VENDOR_KEY, JSON.stringify(data)); } catch (e) { /* 無痕視窗等情況忽略 */ }
  }

  function clearVendor() {
    VENDOR_FIELDS.forEach(function (id) { if ($(id)) $(id).value = ""; });
    try { localStorage.removeItem(VENDOR_KEY); } catch (e) { /* 同上 */ }
    setStatus("已清除這台裝置上儲存的廠商資料。");
  }

  /* ── 明細列 ──────────────────────────────────────────────────────── */
  function itemOptions() {
    var html = '<option value="">請選擇品項</option>';
    var group = "";
    ITEMS.forEach(function (it, i) {
      if (it.g !== group) {
        if (group) html += "</optgroup>";
        group = it.g;
        html += '<optgroup label="' + esc(group) + '">';
      }
      html += '<option value="' + i + '">' + esc(it.c + "　" + it.n) +
              "（" + money(it.p) + " 元／" + esc(it.u) + "）</option>";
    });
    return html + "</optgroup>";
  }

  function addRow() {
    if (document.querySelectorAll(".sub-row").length >= MAX_ROWS) return;
    rowSeq += 1;
    var r = rowSeq;
    var box = document.createElement("div");
    box.className = "sub-row";
    box.id = "sbBox" + r;
    box.innerHTML =
      '<div class="sub-row-head">' +
        '<h3 class="sub-row-title">明細</h3>' +
        '<button type="button" class="sub-btn-del" data-del="' + r + '">刪除這筆</button>' +
      '</div>' +
      '<div class="sub-grid sub-g2">' +
        '<div>' +
          '<label for="sbItem' + r + '">品項（給付碼別）</label>' +
          '<select id="sbItem' + r + '" data-item="' + r + '">' + itemOptions() + '</select>' +
          '<div class="sub-meta" id="sbMeta' + r + '"></div>' +
        '</div>' +
        '<div class="sub-grid sub-g2" style="gap:12px">' +
          '<div>' +
            '<label for="sbQty' + r + '">數量</label>' +
            '<input id="sbQty' + r + '" type="number" min="1" step="1" value="1" data-qty="' + r + '">' +
          '</div>' +
          '<div>' +
            '<label for="sbLimit' + r + '">核定給付上限（元）</label>' +
            '<input id="sbLimit' + r + '" type="number" min="0" step="1" placeholder="請先選擇品項" data-auto="1" data-limit="' + r + '">' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="sub-grid sub-g4" style="margin-top:12px">' +
        '<div><label for="sbBrand' + r + '">產品廠牌</label><input id="sbBrand' + r + '" placeholder="廠牌"></div>' +
        '<div><label for="sbModel' + r + '">產品型號</label><input id="sbModel' + r + '" placeholder="型號"></div>' +
        '<div><label for="sbSerial' + r + '">產品序號</label><input id="sbSerial' + r + '" placeholder="序號"></div>' +
        '<div>' +
          '<label for="sbPrice' + r + '">實際購買金額（元）</label>' +
          '<input id="sbPrice' + r + '" type="number" min="0" step="1" placeholder="未填則以核定上限計" data-price="' + r + '">' +
        '</div>' +
      '</div>' +
      '<div class="sub-stats sub-row-stats">' +
        '<div class="sub-stat"><div class="k">購買金額</div><div class="v" id="sbRPrice' + r + '">0 元</div></div>' +
        '<div class="sub-stat sub-stat-gov"><div class="k">申請給付金額</div><div class="v" id="sbRGov' + r + '">0 元</div></div>' +
        '<div class="sub-stat sub-stat-self"><div class="k">民眾部分負擔</div><div class="v" id="sbRSelf' + r + '">0 元</div></div>' +
        '<div class="sub-stat sub-stat-over"><div class="k">超額自費</div><div class="v" id="sbROver' + r + '">0 元</div></div>' +
      '</div>';
    $("sbRows").appendChild(box);
    renumber();
    updateAddBtn();
  }

  function delRow(r) {
    var box = $("sbBox" + r);
    if (box) box.remove();
    renumber();
    updateAddBtn();
    calculate(false);
  }

  function renumber() {
    var boxes = document.querySelectorAll(".sub-row");
    Array.prototype.forEach.call(boxes, function (box, i) {
      box.querySelector(".sub-row-title").textContent = "第 " + (i + 1) + " 筆";
      box.querySelector(".sub-btn-del").style.display = boxes.length === 1 ? "none" : "";
    });
  }

  function updateAddBtn() {
    var n = document.querySelectorAll(".sub-row").length;
    var btn = $("sbAdd");
    btn.disabled = n >= MAX_ROWS;
    btn.textContent = n >= MAX_ROWS
      ? "已達 " + MAX_ROWS + " 筆上限"
      : "＋ 新增第 " + (n + 1) + " 筆明細";
  }

  function onItemChange(r) {
    var sel = $("sbItem" + r);
    var meta = $("sbMeta" + r);
    var limit = $("sbLimit" + r);
    if (sel.value === "") {
      meta.textContent = "";
      limit.value = "";
      limit.dataset.auto = "1";
      limit.placeholder = "請先選擇品項";
      calculate(false);
      return;
    }
    var it = ITEMS[sel.value];
    var qty = Math.max(1, parseInt($("sbQty" + r).value, 10) || 1);
    meta.textContent = "給付上限 " + money(it.p) + " 元／" + it.u +
                       "　·　購置最低使用年限 " + it.y + " 年";
    limit.value = it.p * qty;
    limit.dataset.auto = "1";
    calculate(false);
  }

  function onQtyChange(r) {
    var sel = $("sbItem" + r);
    var limit = $("sbLimit" + r);
    if (sel.value !== "" && limit.dataset.auto === "1") {
      var it = ITEMS[sel.value];
      limit.value = it.p * Math.max(1, parseInt($("sbQty" + r).value, 10) || 1);
    }
    calculate(false);
  }

  /* ── 計算 ────────────────────────────────────────────────────────── */
  function collectRows() {
    var list = [];
    Array.prototype.forEach.call(document.querySelectorAll(".sub-row"), function (box) {
      var r = Number(box.id.replace("sbBox", ""));
      var sel = $("sbItem" + r);
      if (!sel || sel.value === "") return;
      var it = ITEMS[sel.value];
      var qty = Math.max(1, parseInt($("sbQty" + r).value, 10) || 1);
      var limitInput = $("sbLimit" + r).value;
      var limit = limitInput === "" ? it.p * qty : Math.max(0, parseFloat(limitInput) || 0);
      var priceInput = $("sbPrice" + r).value;
      var price = priceInput === "" ? limit : Math.max(0, parseFloat(priceInput) || 0);
      list.push({
        r: r, item: it, qty: qty, limit: limit, price: price,
        brand: $("sbBrand" + r).value.trim(),
        model: $("sbModel" + r).value.trim(),
        serial: $("sbSerial" + r).value.trim()
      });
    });
    return list;
  }

  function calculate(strict) {
    var rows = collectRows();
    var ratio = parseFloat($("sbCopay").value);
    var quota = Math.max(0, parseFloat($("sbQuota").value) || 0);

    var left = quota;
    var sumPrice = 0, sumGov = 0, sumSelf = 0, sumOver = 0, sumBase = 0;
    var warns = [];

    rows.forEach(function (row) {
      var base = Math.min(row.price, row.limit, left);
      if (base < 0) base = 0;
      var self = Math.floor(base * ratio);
      var gov = base - self;
      var over = row.price - base;

      row.base = base; row.self = self; row.gov = gov; row.over = over;

      left -= base;
      sumPrice += row.price;
      sumBase += base;
      sumGov += gov;
      sumSelf += self;
      sumOver += over;

      if ($("sbRPrice" + row.r)) {
        $("sbRPrice" + row.r).textContent = money(row.price) + " 元";
        $("sbRGov" + row.r).textContent = money(gov) + " 元";
        $("sbRSelf" + row.r).textContent = money(self) + " 元";
        $("sbROver" + row.r).textContent = money(over) + " 元";
      }
      if (row.price > row.limit) {
        warns.push("「" + row.item.c + " " + row.item.n + "」購買金額超過核定給付上限 " +
                   money(row.limit) + " 元，超出的 " + money(row.price - row.limit) + " 元要自費。");
      }
    });

    Array.prototype.forEach.call(document.querySelectorAll(".sub-row"), function (box) {
      var r = Number(box.id.replace("sbBox", ""));
      if ($("sbItem" + r).value === "" && $("sbRPrice" + r)) {
        ["sbRPrice", "sbRGov", "sbRSelf", "sbROver"].forEach(function (k) {
          $(k + r).textContent = "0 元";
        });
      }
    });

    if (sumBase > 0 && left <= 0) {
      warns.push("可用額度 " + money(quota) + " 元已用完，超過額度的金額都列為超額自費。");
    }

    $("sbSumPrice").textContent = money(sumPrice) + " 元";
    $("sbSumGov").textContent = money(sumGov) + " 元";
    $("sbSumSelf").textContent = money(sumSelf) + " 元";
    $("sbSumOver").textContent = money(sumOver) + " 元";
    $("sbSumUse").textContent = money(sumBase) + " 元";
    $("sbSumLeft").textContent = money(Math.max(0, left)) + " 元";

    var warnBox = $("sbWarn");
    if (warns.length) {
      warnBox.hidden = false;
      warnBox.innerHTML = warns.map(esc).join("<br>");
    } else {
      warnBox.hidden = true;
      warnBox.innerHTML = "";
    }

    if (strict && rows.length === 0) {
      warnBox.hidden = false;
      warnBox.textContent = "請先選擇品項並填入金額。";
      lastResult = null;
      return false;
    }

    lastResult = { rows: rows, sumPrice: sumPrice, sumBase: sumBase };
    return rows.length > 0;
  }

  /* ── 證明書資料 ──────────────────────────────────────────────────── */
  function certificateData() {
    if (!calculate(true)) return null;
    if (!$("sbVendorName").value.trim()) {
      var w = $("sbWarn");
      w.hidden = false;
      w.textContent = "請先填寫廠商名稱，證明書才能列出販售（或修繕）單位。";
      $("sbVendorName").focus();
      return null;
    }
    var useReal = $("sbOptReal").checked;
    var rows = lastResult.rows.map(function (row, i) {
      return {
        no: i + 1,
        name: row.item.c + "　" + row.item.n +
              (row.qty > 1 ? "　×" + row.qty + row.item.u : ""),
        brand: row.brand,
        model: row.model,
        serial: row.serial,
        price: useReal ? row.price : row.base,
        gov: row.gov,
        self: row.self
      };
    });
    var today = new Date();
    return {
      applicant: $("sbName").value.trim(),
      applicantId: $("sbId").value.trim(),
      applicantTel: $("sbTel").value.trim(),
      vendor: $("sbVendorName").value.trim(),
      vendorAddr: $("sbVendorAddr").value.trim(),
      vendorRep: $("sbVendorRep").value.trim(),
      year: $("sbY").value.trim() || String(today.getFullYear() - 1911),
      month: $("sbM").value.trim() || String(today.getMonth() + 1),
      day: $("sbD").value.trim() || String(today.getDate()),
      rows: rows,
      photo: $("sbOptPhoto").checked
    };
  }

  /* ── 紙本 HTML ───────────────────────────────────────────────────── */
  function buildSheets(cert) {
    var body = "";
    cert.rows.forEach(function (row) {
      body += "<tr>" +
        "<td>" + row.no + "</td>" +
        '<td style="text-align:left">' + esc(row.name) + "</td>" +
        "<td>" + esc(row.brand) + "</td>" +
        "<td>" + esc(row.model) + "</td>" +
        "<td>" + esc(row.serial) + "</td>" +
        "<td>" + money(row.price) + "</td>" +
        "<td>" + money(row.gov) + "</td>" +
        "<td>" + money(row.self) + "</td>" +
        "</tr>";
    });
    for (var i = cert.rows.length; i < 3; i++) {
      body += "<tr>" + new Array(9).join("<td>&nbsp;</td>") + "</tr>";
    }
    var html =
      '<div class="sub-sheet">' +
        '<div class="t">長照輔具服務給付證明暨契約書</div>' +
        '<div class="intro">　　本人 <span class="ul">' + esc(cert.applicant) + '</span> 確已收到 ' +
          '<span class="ul long">' + esc(cert.vendor) + '</span> ' +
          '販售（或修繕）之輔助器具，明細如下表，本人同意經廠商申報下列輔具給付額度後，自本人長照輔具服務額度中扣除，' +
          '所請代辦之憑證若經縣市政府查核有不符規定情事，願自行負擔購買費用，且如涉及詐欺或其他不法行為請領給付費用，' +
          '願負一切法律責任，絕無異議。</div>' +
        '<div class="headrow"><span>購買明細：</span><span>單位：元</span></div>' +
        "<table><thead><tr>" +
          '<th style="width:6%">編號</th>' +
          '<th style="width:26%">輔具／環境改善<br>項目名稱</th>' +
          '<th style="width:11%">產品廠牌</th>' +
          '<th style="width:11%">產品型號</th>' +
          '<th style="width:12%">產品序號</th>' +
          '<th style="width:11%">購買金額</th>' +
          '<th style="width:11%">給付金額</th>' +
          '<th style="width:12%">民眾部分負擔</th>' +
        "</tr></thead><tbody>" + body + "</tbody></table>" +
        '<div class="note">註：購買金額應等於申請給付金額及民眾部分負擔之加總。</div>' +
        '<div class="cause">此　致</div>' +
        '<div class="dept">台南市政府衛生局</div>' +
        '<div class="contract">立契約人(以下簡稱申請人)與' + esc(cert.vendor) +
          '(以下簡稱乙方)同意訂立輔具買賣契約，雙方議定條件如上:</div>' +
        '<div class="sign">' +
          '申請人簽名或蓋章：<span class="ul"></span>　身分證字號：<span class="ul short">' + esc(cert.applicantId) + "</span><br>" +
          '聯 絡 電 話：<span class="ul">' + esc(cert.applicantTel) + "</span><br>" +
          '受託人簽名或蓋章：<span class="ul"></span>　身分證字號：<span class="ul short"></span><br>' +
          '受託人與申請人之關係：<span class="ul short"></span>' +
        "</div>" +
        '<div class="vendor">乙方: ' + esc(cert.vendor) + "　　地址:" + esc(cert.vendorAddr) +
          "　　代表人:" + esc(cert.vendorRep) + "</div>" +
        '<div class="date">中　華　民　國　<span class="ul short">' + esc(cert.year) +
          '</span>　年　<span class="ul short">' + esc(cert.month) +
          '</span>　月　<span class="ul short">' + esc(cert.day) + "</span>　日</div>" +
      "</div>";

    if (cert.photo) {
      cert.rows.forEach(function (row) {
        html +=
          '<div class="sub-sheet">' +
            '<div class="photo-title">個案姓名: <span class="ul">' + esc(cert.applicant) + "</span><br>" +
              '購買項目： <span class="ul long">' + esc(row.name) + "</span></div>" +
            '<div class="photo-box">照片黏貼處</div>' +
          "</div>";
      });
    }
    return html;
  }

  /* ── DOCX（純前端組 zip） ────────────────────────────────────────── */
  function crc32(bytes) {
    var crc = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) {
      crc ^= bytes[i];
      for (var j = 0; j < 8; j++) {
        crc = (crc & 1) ? ((crc >>> 1) ^ 0xEDB88320) : (crc >>> 1);
      }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
  function u16(v) { return new Uint8Array([v & 255, (v >>> 8) & 255]); }
  function u32(v) { return new Uint8Array([v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]); }
  function cat(arrays) {
    var total = arrays.reduce(function (s, a) { return s + a.length; }, 0);
    var out = new Uint8Array(total), off = 0;
    arrays.forEach(function (a) { out.set(a, off); off += a.length; });
    return out;
  }
  function createZip(files) {
    var enc = new TextEncoder(), local = [], central = [], offset = 0;
    files.forEach(function (f) {
      var name = enc.encode(f.name);
      var data = typeof f.data === "string" ? enc.encode(f.data) : f.data;
      var crc = crc32(data);
      var lh = cat([u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
                    u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), name]);
      local.push(lh, data);
      central.push(cat([u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
                        u32(crc), u32(data.length), u32(data.length), u16(name.length),
                        u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name]));
      offset += lh.length + data.length;
    });
    var ld = cat(local), cd = cat(central);
    var end = cat([u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
                   u32(cd.length), u32(ld.length), u16(0)]);
    return cat([ld, cd, end]);
  }
  function xEsc(v) {
    return String(v === null || v === undefined ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  }
  function tx(text, size, bold, underline) {
    size = size || 28;
    return '<w:r><w:rPr><w:rFonts w:ascii="DFKai-SB" w:hAnsi="DFKai-SB" w:eastAsia="標楷體"/>' +
      '<w:sz w:val="' + size + '"/><w:szCs w:val="' + size + '"/>' +
      (bold ? "<w:b/>" : "") + (underline ? '<w:u w:val="single"/>' : "") +
      '</w:rPr><w:t xml:space="preserve">' + xEsc(text) + "</w:t></w:r>";
  }
  function para(runs, align, before, after, line) {
    return '<w:p><w:pPr><w:jc w:val="' + (align || "left") + '"/>' +
      '<w:spacing w:before="' + (before || 0) + '" w:after="' + (after || 0) +
      '" w:line="' + (line || 300) + '" w:lineRule="auto"/></w:pPr>' + runs + "</w:p>";
  }
  function cell(text, width, size, bold, align) {
    var paras = String(text === null || text === undefined ? "" : text).split("\n")
      .map(function (l) { return para(tx(l, size || 20, bold), align || "center", 0, 0, 220); })
      .join("");
    return '<w:tc><w:tcPr><w:tcW w:w="' + width + '" w:type="dxa"/>' +
      '<w:vAlign w:val="center"/><w:tcMar><w:top w:w="30" w:type="dxa"/>' +
      '<w:left w:w="40" w:type="dxa"/><w:bottom w:w="30" w:type="dxa"/>' +
      '<w:right w:w="40" w:type="dxa"/></w:tcMar></w:tcPr>' + paras + "</w:tc>";
  }
  function trow(cells, height) {
    return '<w:tr><w:trPr><w:trHeight w:val="' + (height || 460) +
      '" w:hRule="atLeast"/></w:trPr>' + cells + "</w:tr>";
  }
  function tbl(rows, widths) {
    var total = widths.reduce(function (a, b) { return a + b; }, 0);
    var b = ["top", "left", "bottom", "right", "insideH", "insideV"].map(function (k) {
      return "<w:" + k + ' w:val="single" w:sz="8" w:color="000000"/>';
    }).join("");
    return '<w:tbl><w:tblPr><w:tblW w:w="' + total + '" w:type="dxa"/>' +
      '<w:tblLayout w:type="fixed"/><w:tblBorders>' + b + "</w:tblBorders></w:tblPr><w:tblGrid>" +
      widths.map(function (w) { return '<w:gridCol w:w="' + w + '"/>'; }).join("") +
      "</w:tblGrid>" + rows + "</w:tbl>";
  }
  function ulRun(text, width, size) {
    var pad = String(text === null || text === undefined ? "" : text);
    width = width || 14;
    while (pad.length < width) pad += " ";
    return tx(pad, size || 26, false, true);
  }
  function photoPage(row, cert) {
    return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>' +
      '<w:p><w:pPr><w:spacing w:line="360" w:lineRule="auto"/></w:pPr>' +
        tx("　　　　　　　　　個案姓名: ") + ulRun(cert.applicant, 12) + "</w:p>" +
      '<w:p><w:pPr><w:spacing w:after="120" w:line="360" w:lineRule="auto"/></w:pPr>' +
        tx("購買項目： ") + ulRun(row.name, 20) + "</w:p>" +
      tbl(trow(cell("照片黏貼處", 9000, 24), 9600), [9000]);
  }

  function buildDocx(cert) {
    var widths = [560, 2500, 1150, 1150, 1250, 1150, 1150, 1180];
    var totalW = widths.reduce(function (a, b) { return a + b; }, 0);

    var rows = trow(
      cell("編號", widths[0], 20, true) +
      cell("輔具／環境改善\n項目名稱", widths[1], 20, true) +
      cell("產品廠牌", widths[2], 20, true) +
      cell("產品型號", widths[3], 20, true) +
      cell("產品序號", widths[4], 20, true) +
      cell("購買金額", widths[5], 20, true) +
      cell("給付金額", widths[6], 20, true) +
      cell("民眾部分負擔", widths[7], 20, true), 560);

    cert.rows.forEach(function (row) {
      rows += trow(
        cell(String(row.no), widths[0]) +
        cell(row.name, widths[1], 20, false, "left") +
        cell(row.brand, widths[2]) +
        cell(row.model, widths[3]) +
        cell(row.serial, widths[4]) +
        cell(money(row.price), widths[5]) +
        cell(money(row.gov), widths[6]) +
        cell(money(row.self), widths[7]), 520);
    });
    for (var i = cert.rows.length; i < 3; i++) {
      rows += trow(widths.map(function (w) { return cell("", w); }).join(""), 520);
    }
    var intro =
      '<w:p><w:pPr><w:jc w:val="both"/><w:spacing w:line="340" w:lineRule="auto"/></w:pPr>' +
      tx("　　本人 ") + ulRun(cert.applicant, 12) +
      tx(" 確已收到 ") + ulRun(cert.vendor, 18) +
      tx(" 販售（或修繕）之輔助器具，明細如下表，本人同意經廠商申報下列輔具給付額度後，自本人長照輔具服務額度中扣除，" +
         "所請代辦之憑證若經縣市政府查核有不符規定情事，願自行負擔購買費用，且如涉及詐欺或其他不法行為請領給付費用，" +
         "願負一切法律責任，絕無異議。") +
      "</w:p>";

    var headRow =
      '<w:p><w:pPr><w:tabs><w:tab w:val="right" w:pos="' + totalW + '"/></w:tabs>' +
      '<w:spacing w:before="160" w:after="60"/></w:pPr>' +
      tx("購買明細：", 26) + "<w:r><w:tab/></w:r>" + tx("單位：元", 26) + "</w:p>";

    var doc =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' +
      para(tx("長照輔具服務給付證明暨契約書", 36, true), "center", 0, 200) +
      intro + headRow + tbl(rows, widths) +
      para(tx("註：購買金額應等於申請給付金額及民眾部分負擔之加總。", 22), "left", 80, 200) +
      para(tx("此　致", 28), "left", 120, 60) +
      para(tx("台南市政府衛生局", 30, true), "center", 0, 240) +
      para(tx("立契約人(以下簡稱申請人)與" + cert.vendor +
              "(以下簡稱乙方)同意訂立輔具買賣契約，雙方議定條件如上:", 24), "both", 0, 120) +
      '<w:p><w:pPr><w:spacing w:line="360" w:lineRule="auto"/></w:pPr>' +
        tx("申請人簽名或蓋章：") + ulRun("", 14) +
        tx("　身分證字號：") + ulRun(cert.applicantId, 12) + "</w:p>" +
      '<w:p><w:pPr><w:spacing w:line="360" w:lineRule="auto"/></w:pPr>' +
        tx("聯 絡 電 話：") + ulRun(cert.applicantTel, 14) + "</w:p>" +
      '<w:p><w:pPr><w:spacing w:line="360" w:lineRule="auto"/></w:pPr>' +
        tx("受託人簽名或蓋章：") + ulRun("", 14) +
        tx("　身分證字號：") + ulRun("", 12) + "</w:p>" +
      '<w:p><w:pPr><w:spacing w:line="360" w:lineRule="auto"/></w:pPr>' +
        tx("受託人與申請人之關係：") + ulRun("", 12) + "</w:p>" +
      para(tx("乙方: " + cert.vendor + "　　地址:" + cert.vendorAddr +
              "　　代表人:" + cert.vendorRep, 24), "left", 200, 200) +
      para(tx("中　華　民　國　" + cert.year + "　年　" + cert.month +
              "　月　" + cert.day + "　日", 28), "center", 200, 0) +
      (cert.photo ? cert.rows.map(function (row) { return photoPage(row, cert); }).join("") : "") +
      '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>' +
      '<w:pgMar w:top="1000" w:right="1000" w:bottom="1000" w:left="1000" w:header="0" w:footer="0" w:gutter="0"/>' +
      '<w:cols w:space="0"/></w:sectPr></w:body></w:document>';

    var styles =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      "<w:docDefaults><w:rPrDefault><w:rPr>" +
      '<w:rFonts w:ascii="DFKai-SB" w:hAnsi="DFKai-SB" w:eastAsia="標楷體"/>' +
      '<w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr></w:rPrDefault></w:docDefaults>' +
      '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>' +
      "</w:styles>";

    var types =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
      "</Types>";

    var rootRels =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      "</Relationships>";

    var docRels =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      "</Relationships>";

    return new Blob([createZip([
      { name: "[Content_Types].xml", data: types },
      { name: "_rels/.rels", data: rootRels },
      { name: "word/document.xml", data: doc },
      { name: "word/styles.xml", data: styles },
      { name: "word/_rels/document.xml.rels", data: docRels }
    ])], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  }

  /* ── 預覽、列印、下載 ────────────────────────────────────────────── */
  function setStatus(msg) {
    var el = $("sbPvStatus");
    if (el) el.textContent = msg || "";
  }

  function openPreview() {
    var cert = certificateData();
    if (!cert) return;
    $("sbPvScroll").innerHTML = buildSheets(cert);
    $("sbPreview").classList.add("open");
    $("sbPvScroll").scrollTop = 0;
    setStatus("確認內容無誤後即可列印或下載 Word 檔。");
    $("sbPvClose").focus();
  }

  function closePreview() {
    $("sbPreview").classList.remove("open");
    $("sbCert").focus();
  }

  function downloadWord() {
    var cert = certificateData();
    if (!cert) return;
    var blob;
    try {
      blob = buildDocx(cert);
    } catch (err) {
      setStatus("Word 檔產生失敗：" + (err && err.message ? err.message : err));
      return;
    }
    var safe = (cert.applicant || "未填寫姓名").replace(/[\\/:*?"<>|]/g, "_");
    var pad = function (s) { return String(s).length < 2 ? "0" + s : String(s); };
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "長照輔具服務給付證明暨契約書_" + safe + "_" +
                 cert.year + pad(cert.month) + pad(cert.day) + ".docx";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { a.remove(); }, 1000);
    setTimeout(function () { URL.revokeObjectURL(url); }, 15000);
    setStatus("Word 檔已下載。");
  }

  /* ── 啟動 ────────────────────────────────────────────────────────── */
  function init() {
    var today = new Date();
    $("sbY").value = today.getFullYear() - 1911;
    $("sbM").value = today.getMonth() + 1;
    $("sbD").value = today.getDate();

    loadVendor();
    addRow();

    document.addEventListener("click", function (e) {
      var del = e.target.closest ? e.target.closest("[data-del]") : null;
      if (del) delRow(Number(del.dataset.del));
    });
    document.addEventListener("change", function (e) {
      var d = e.target.dataset || {};
      if (d.item) onItemChange(Number(d.item));
    });
    document.addEventListener("input", function (e) {
      var d = e.target.dataset || {};
      if (d.qty) onQtyChange(Number(d.qty));
      else if (d.limit) { e.target.dataset.auto = "0"; calculate(false); }
      else if (d.price) calculate(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && $("sbPreview").classList.contains("open")) closePreview();
    });

    VENDOR_FIELDS.forEach(function (id) {
      $(id).addEventListener("input", saveVendor);
    });
    $("sbVendorClear").addEventListener("click", clearVendor);
    $("sbAdd").addEventListener("click", addRow);
    $("sbCalc").addEventListener("click", function () { calculate(true); });
    $("sbCert").addEventListener("click", openPreview);
    $("sbPvClose").addEventListener("click", closePreview);
    $("sbPvPrint").addEventListener("click", function () { window.print(); });
    $("sbPvWord").addEventListener("click", downloadWord);
    $("sbCopay").addEventListener("change", function () { calculate(false); });
    $("sbQuota").addEventListener("input", function () { calculate(false); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

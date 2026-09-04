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

  /* p = 購置價格給付上限；y = 購置最低使用年限；u = 給付單位
     pg = 共用照片頁的群組。輪椅與居家用照顧床的附加功能依附表四規定
          必須搭配主體同時申請，實務上是同一件實體，照片頁合併成一張
          （見 0805 許黃麗水那份，床與兩項附加功能共用一頁）。 */
  var ITEMS = [
    {c:"EA01",n:"便盆椅",p:1200,y:3,u:"件",g:"個人照顧與沐浴排泄"},
    {c:"EA01",n:"沐浴椅",p:1200,y:3,u:"件",g:"個人照顧與沐浴排泄"},
    {c:"EA01",n:"馬桶增高器",p:1200,y:3,u:"件",g:"個人照顧與沐浴排泄"},

    {c:"EB01",n:"單支枴杖-不銹鋼製",p:1000,y:5,u:"支",g:"行動輔助"},
    {c:"EB02",n:"單支枴杖-鋁製",p:500,y:3,u:"支",g:"行動輔助"},
    {c:"EB03",n:"助行器",p:800,y:3,u:"件",g:"行動輔助"},
    {c:"EB04",n:"帶輪型助步車（助行椅）",p:3000,y:3,u:"件",g:"行動輔助"},

    {c:"EC01",n:"輪椅-A款（非輕量化量產型）",p:3500,y:3,u:"台",g:"輪椅與擺位系統",pg:"wheelchair"},
    {c:"EC02",n:"輪椅-B款（輕量化量產型）",p:4000,y:3,u:"台",g:"輪椅與擺位系統",pg:"wheelchair"},
    {c:"EC03",n:"輪椅-C款（量身訂製型）",p:9000,y:3,u:"台",g:"輪椅與擺位系統",pg:"wheelchair",f:1},
    {c:"EC04",n:"輪椅附加功能-A款（具利於移位功能）",p:5000,y:3,u:"組",g:"輪椅與擺位系統",pg:"wheelchair",f:1},
    {c:"EC05",n:"輪椅附加功能-B款（具仰躺功能）",p:2000,y:3,u:"組",g:"輪椅與擺位系統",pg:"wheelchair",f:1},
    {c:"EC06",n:"輪椅附加功能-C款（具空中傾倒功能）",p:4000,y:3,u:"組",g:"輪椅與擺位系統",pg:"wheelchair",f:1},
    {c:"EC07",n:"擺位系統-A款（平面型輪椅背靠）",p:1000,y:3,u:"組",g:"輪椅與擺位系統",f:1},
    {c:"EC08",n:"擺位系統-B款（曲面適形輪椅背靠）",p:6000,y:3,u:"組",g:"輪椅與擺位系統",f:1},
    {c:"EC09",n:"擺位系統-C款（輪椅軀幹側支撐架）",p:3000,y:3,u:"組",g:"輪椅與擺位系統",f:1},
    {c:"EC10",n:"擺位系統-D款（輪椅頭靠系統）",p:2500,y:3,u:"組",g:"輪椅與擺位系統",f:1},

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

    {c:"EG01",n:"氣墊床-A款",p:8000,y:3,u:"組",g:"壓力分散輔具",f:1},
    {c:"EG02",n:"氣墊床-B款",p:12000,y:3,u:"組",g:"壓力分散輔具",f:1},
    {c:"EG03",n:"輪椅座墊-A款（連通管型氣囊氣墊座-塑膠材質）",p:5000,y:2,u:"個",g:"壓力分散輔具",f:1},
    {c:"EG04",n:"輪椅座墊-B款（連通管型氣囊氣墊座-橡膠材質）",p:10000,y:2,u:"個",g:"壓力分散輔具",f:1},
    {c:"EG05",n:"輪椅座墊-C款（液態凝膠座墊）",p:10000,y:2,u:"個",g:"壓力分散輔具",f:1},
    {c:"EG06",n:"輪椅座墊-D款（固態凝膠座墊）",p:8000,y:5,u:"個",g:"壓力分散輔具",f:1},
    {c:"EG07",n:"輪椅座墊-E款（填充式氣囊氣墊座）",p:8000,y:5,u:"個",g:"壓力分散輔具",f:1},
    {c:"EG08",n:"輪椅座墊-F款（交替充氣型座墊）",p:5000,y:3,u:"個",g:"壓力分散輔具",f:1},
    {c:"EG09",n:"輪椅座墊-G款（量製型座墊）",p:10000,y:3,u:"個",g:"壓力分散輔具",f:1},

    {c:"EH01",n:"居家用照顧床",p:8000,y:5,u:"張",g:"居家照顧床",pg:"bed"},
    {c:"EH02",n:"居家用照顧床-附加功能A款（床面升降功能）",p:5000,y:5,u:"組",g:"居家照顧床",pg:"bed"},
    {c:"EH03",n:"居家用照顧床-附加功能B款（電動升降功能）",p:5000,y:5,u:"組",g:"居家照顧床",pg:"bed"},

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

  /* 選了居家用照顧床，附加功能 A、B 款一定一起申報，自動補上兩列，
     並讓廠牌、型號、序號跟著主體同步（對照表註記「一定一起出現」）。 */
  var BED_BASE = "居家用照顧床";
  var BED_ADDONS = ["居家用照顧床-附加功能A款（床面升降功能）",
                    "居家用照顧床-附加功能B款（電動升降功能）"];

  var MAX_ROWS = 8;
  var VENDOR_KEY = "dongguang.subsidy.vendor";
  /* 常用品項：存這台裝置的品項名稱（名稱在 ITEMS 中唯一），
     選單最上方會多一組「常用品項」，方便門市重複開立同類單據。 */
  var PIN_KEY = "dongguang.subsidy.pins";
  var pins = [];
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
  }

  /* ── 常用品項與品項選擇器 ──────────────────────────────────────────
     原生 select 的選項裡放不了可點擊的元素，改用自訂清單：
     每個品項右邊一顆星，點星星釘選、點名稱選取。品項有 74 個，
     順帶加上搜尋。實際值仍放在隱藏欄位 sbItem{r}，其餘程式不必改動。
     ------------------------------------------------------------------ */
  function loadPins() {
    var raw;
    try { raw = localStorage.getItem(PIN_KEY); } catch (e) { return; }
    if (!raw) return;
    try {
      var arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        /* 只留現有品項，名稱改過或項目移除時自動失效 */
        pins = arr.filter(function (n) {
          return ITEMS.some(function (it) { return it.n === n; });
        });
      }
    } catch (e) { /* 資料壞掉就當作沒有 */ }
  }

  function savePins() {
    try { localStorage.setItem(PIN_KEY, JSON.stringify(pins)); } catch (e) { /* 無痕視窗等 */ }
  }

  function togglePin(name) {
    var at = pins.indexOf(name);
    if (at > -1) pins.splice(at, 1); else pins.push(name);
    savePins();
    document.querySelectorAll(".sub-row").forEach(function (box) {
      renderPickerList(Number(box.id.replace("sbBox", "")));
    });
  }

  function itemLabel(it) {
    return it.n + "（" + money(it.p) + " 元／" + it.u + "）";
  }

  /* 依關鍵字重建某一列的清單；常用品項排在最前面 */
  function renderPickerList(r) {
    var list = $("sbList" + r);
    if (!list) return;
    var q = ($("sbSearch" + r) ? $("sbSearch" + r).value : "").trim();
    var chosen = $("sbItem" + r).value;

    function row(it, i) {
      var on = pins.indexOf(it.n) > -1;
      return '<li class="sub-opt' + (String(i) === chosen ? " is-chosen" : "") + '">' +
               '<button type="button" class="sub-opt-pick" data-pick="' + r + '" data-idx="' + i + '">' +
                 esc(itemLabel(it)) +
               "</button>" +
               '<button type="button" class="sub-opt-star' + (on ? " is-pinned" : "") + '"' +
                 ' data-star="' + r + '" data-name="' + esc(it.n) + '"' +
                 ' title="' + (on ? "取消釘選" : "釘選為常用品項") + '"' +
                 ' aria-label="' + (on ? "取消釘選" : "釘選") + esc(it.n) + '">' +
                 (on ? "★" : "☆") +
               "</button>" +
             "</li>";
    }

    function hit(it) {
      return !q || it.n.indexOf(q) > -1;
    }

    var html = "";
    var pinned = [];
    pins.forEach(function (name) {
      ITEMS.forEach(function (it, i) { if (it.n === name && hit(it)) pinned.push([it, i]); });
    });
    if (pinned.length) {
      html += '<li class="sub-opt-group">常用品項</li>';
      pinned.forEach(function (pair) { html += row(pair[0], pair[1]); });
    }

    var group = "";
    ITEMS.forEach(function (it, i) {
      if (!hit(it)) return;
      if (it.g !== group) {
        group = it.g;
        html += '<li class="sub-opt-group">' + esc(group) + "</li>";
      }
      html += row(it, i);
    });

    list.innerHTML = html || '<li class="sub-opt-empty">找不到符合的品項</li>';
  }

  function pickerLabel(r) {
    var v = $("sbItem" + r).value;
    var field = $("sbField" + r);
    if (!field) return;
    field.textContent = v === "" ? "請選擇品項" : itemLabel(ITEMS[v]);
    field.classList.toggle("is-placeholder", v === "");
  }

  function openPicker(r) {
    closePicker();
    var box = $("sbPicker" + r);
    if (!box) return;
    box.classList.add("open");
    $("sbField" + r).setAttribute("aria-expanded", "true");
    var s = $("sbSearch" + r);
    s.value = "";
    renderPickerList(r);
    s.focus();
    /* 捲到目前選取的項目 */
    var cur = $("sbList" + r).querySelector(".is-chosen");
    if (cur) cur.scrollIntoView({ block: "nearest" });
  }

  function closePicker() {
    document.querySelectorAll(".sub-picker.open").forEach(function (box) {
      box.classList.remove("open");
      var f = box.querySelector(".sub-picker-field");
      if (f) f.setAttribute("aria-expanded", "false");
    });
  }

  /* 選定品項：更新隱藏欄位與顯示文字，再跑原本的品項變更流程 */
  function setItem(r, idx) {
    $("sbItem" + r).value = String(idx);
    pickerLabel(r);
    onItemChange(r);
  }

  /* 鍵盤操作：上下移動、Enter 選取、Esc 關閉 */
  function pickerKey(r, e) {
    var list = $("sbList" + r);
    var opts = Array.prototype.slice.call(list.querySelectorAll(".sub-opt-pick"));
    if (!opts.length) return;
    var at = opts.indexOf(document.activeElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      (opts[at + 1] || opts[0]).focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      (at > 0 ? opts[at - 1] : opts[opts.length - 1]).focus();
    } else if (e.key === "Enter" && at === -1) {
      e.preventDefault();
      opts[0].click();
    }
  }

  /* ── 明細列 ──────────────────────────────────────────────────────── */
  /* selName：該列目前選的品項名稱，用來決定動作項目要顯示釘選還是取消。
     原生 select 放不了按鈕，改用一個動作項目，選到它就切換釘選狀態，
     再把選取跳回原本的品項。 */
  function addRow() {
    if (document.querySelectorAll(".sub-row").length >= MAX_ROWS) return null;
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
          '<label id="sbItemLbl' + r + '">品項</label>' +
          '<div class="sub-picker" id="sbPicker' + r + '" data-picker="' + r + '">' +
            '<button type="button" class="sub-picker-field is-placeholder" id="sbField' + r + '"' +
              ' data-open="' + r + '" aria-haspopup="listbox" aria-expanded="false"' +
              ' aria-labelledby="sbItemLbl' + r + '">請選擇品項</button>' +
            '<div class="sub-picker-panel">' +
              '<input type="text" class="sub-picker-search" id="sbSearch' + r + '"' +
                ' data-search="' + r + '" placeholder="輸入關鍵字篩選" autocomplete="off">' +
              '<ul class="sub-picker-list" id="sbList' + r + '" role="listbox"></ul>' +
            "</div>" +
            '<input type="hidden" id="sbItem' + r + '" value="">' +
          "</div>" +
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
        '<div><label for="sbBrand' + r + '">產品廠牌</label><input id="sbBrand' + r + '" placeholder="廠牌" data-prod="' + r + '"></div>' +
        '<div><label for="sbModel' + r + '">產品型號</label><input id="sbModel' + r + '" placeholder="型號" data-prod="' + r + '"></div>' +
        '<div><label for="sbSerial' + r + '">產品序號</label><input id="sbSerial' + r + '" placeholder="序號" data-prod="' + r + '"></div>' +
        '<div>' +
          '<label for="sbPrice' + r + '">實際購買金額（元）</label>' +
          '<input id="sbPrice' + r + '" type="number" min="0" step="1" placeholder="未填則以核定上限計" data-price="' + r + '">' +
        '</div>' +
      '</div>' +
      '<div class="sub-stats sub-row-stats">' +
        '<div class="sub-stat"><div class="k">購買金額</div><div class="v" id="sbRPrice' + r + '">0 元</div></div>' +
        '<div class="sub-stat sub-stat-gov"><div class="k">申請給付金額</div><div class="v" id="sbRGov' + r + '">0 元</div></div>' +
        '<div class="sub-stat sub-stat-self"><div class="k">民眾部分負擔（含超額）</div><div class="v" id="sbRSelf' + r + '">0 元</div></div>' +
        '<div class="sub-stat sub-stat-over"><div class="k">其中超額自費</div><div class="v" id="sbROver' + r + '">0 元</div></div>' +
      '</div>';
    $("sbRows").appendChild(box);
    pickerLabel(r);
    renderPickerList(r);
    renumber();
    updateAddBtn();
    return r;
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
                       "　·　購置最低使用年限 " + it.y + " 年" +
                       (it.f ? "　·　免部分負擔" : "");
    limit.value = it.p * qty;
    limit.dataset.auto = "1";
    if (it.n === BED_BASE) addBedAddons(r);
    calculate(false);
  }

  /* 居家用照顧床與兩款附加功能一定一起申報，選了主體就自動補列，
     廠牌、型號、序號沿用主體那列，之後主體改動也會跟著同步。 */
  function addBedAddons(baseRow) {
    var existing = {};
    document.querySelectorAll(".sub-row").forEach(function (box) {
      var i = Number(box.id.replace("sbBox", ""));
      var sel = $("sbItem" + i);
      if (sel && sel.value !== "") existing[ITEMS[sel.value].n] = true;
    });
    BED_ADDONS.forEach(function (name) {
      if (existing[name]) return;
      var idx = -1;
      ITEMS.forEach(function (it, i) { if (it.n === name) idx = i; });
      if (idx < 0) return;
      var r = addRow();
      if (!r) return;
      $("sbBox" + r).dataset.linkedTo = String(baseRow);
      setItem(r, idx);
    });
    syncBedFields(baseRow);
  }

  /* 把主體那列的產品欄位複製到跟著它的附加功能列 */
  function syncBedFields(baseRow) {
    var targets = document.querySelectorAll(
      '.sub-row[data-linked-to="' + baseRow + '"]');
    if (!targets.length) return;
    ["Brand", "Model", "Serial"].forEach(function (f) {
      var src = $("sb" + f + baseRow);
      if (!src) return;
      targets.forEach(function (box) {
        var i = Number(box.id.replace("sbBox", ""));
        var dst = $("sb" + f + i);
        if (dst) dst.value = src.value;
      });
    });
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
      /* 部分品項免部分負擔，不隨身分別變動（見長照 3.0 對照表）。
         免的只是核定給付範圍內那一段，超出上限或額度的部分一律自付。 */
      var copay = row.item.f ? 0 : Math.floor(base * ratio);
      var gov = base - copay;
      var over = row.price - base;
      /* 民眾實際要付的錢＝比率部分負擔＋超額，與證明書上那一欄同一個數字 */
      var self = row.price - gov;

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
        warns.push("「" + row.item.n + "」購買金額超過核定給付上限 " +
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
    var rows = lastResult.rows.map(function (row, i) {
      return {
        no: i + 1,
        /* 碼別只作為資料鍵，不出現在網頁與產出的文件上 */
        name: row.item.n + (row.qty > 1 ? "　×" + row.qty + row.item.u : ""),
        photoGroup: row.item.pg || null,
        brand: row.brand,
        model: row.model,
        serial: row.serial,
        /* 台南市範本沒有超額自費欄，註記要求購買金額＝給付金額＋部分負擔。
           購買金額印實際成交金額；部分負擔＝購買金額－給付金額，
           超出核定給付上限或額度的部分一併落在民眾部分負擔裡。 */
        price: row.price,
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
      rows: rows
    };
  }

  /* ── 紙本 HTML：依範本的實際數值重建 ─────────────────────────────
     段落順序、縮排、字級、行距、欄寬、列高都取自範本 OOXML，
     換算方式與註解見 assets/css/subsidy.css 開頭。
     行距與中文斷行無法與 Word 完全一致，正式送件請用 Word 檔。
     ---------------------------------------------------------------- */

  /* 空段落：高度由該段落標記的字級與行距決定，用來還原垂直節奏 */
  function gap(sizePt, lineHeight) {
    return '<p class="s-gap" style="font-size:' + sizePt + 'pt' +
           (lineHeight ? ";line-height:" + lineHeight : "") + '"></p>';
  }
  /* 填寫欄位：底線寬度以字數估算，維持與範本相近的欄位長度 */
  function ul(value, minChars, cls) {
    var text = String(value == null ? "" : value);
    return '<span class="u' + (cls ? " " + cls : "") +
           '" style="min-width:' + minChars + 'em">' +
           (text ? esc(text) : "&nbsp;") + "</span>";
  }

  /* 依 photoGroup 把明細分組：同組共用一張照片頁，沒有分組的各自一頁。
     以首次出現的順序排列，不要求相鄰。 */
  function photoGroups(rows) {
    var out = [], byKey = {};
    rows.forEach(function (row) {
      var key = row.photoGroup;
      if (key && byKey[key]) { byKey[key].push(row); return; }
      var g = [row];
      if (key) byKey[key] = g;
      out.push(g);
    });
    return out;
  }

  function buildSheets(cert) {
    /* 範本本身留了兩列空白供手寫，程式填表用不到，只列實際筆數 */
    var rows = "";
    for (var i = 0; i < cert.rows.length; i++) {
      var r = cert.rows[i];
      rows += "<tr>" +
        '<td class="c0">' + (r ? i + 1 + "." : "&nbsp;") + "</td>" +
        "<td>" + (r ? esc(r.name) : "") + "</td>" +
        "<td>" + (r ? esc(r.brand) : "") + "</td>" +
        "<td>" + (r ? esc(r.model) : "") + "</td>" +
        "<td>" + (r ? esc(r.serial) : "") + "</td>" +
        "<td>" + (r ? money(r.price) : "") + "</td>" +
        "<td>" + (r ? money(r.gov) : "") + "</td>" +
        "<td>" + (r ? money(r.self) : "") + "</td>" +
        "</tr>";
    }

    /* 版面結構取自實際核銷件（0805、0816）與範本的比對：
       表格變高時，「立契約人」以下的下半部位置幾乎不動，變動全部由
       「台南市政府衛生局」與「立契約人」之間的空白吸收。因此上半部
       自然流動、中間留彈性空白、下半部貼齊頁尾，明細變多也不會分頁。 */
    var html =
      '<div class="sub-sheet">' +
        '<div class="s-top">' +
          gap(14) +
          '<p class="s-title">長照輔具服務給付證明暨契約書</p>' +
          gap(12) +
          '<p class="s-intro">本人' + ul(cert.applicant, 6) +
            "確已收到 " + ul(cert.vendor, 10) +
            " 販售（或修繕）之輔助器具，明細如下表，本人同意經廠商申報下列輔具給付額度後，" +
            "自本人長照輔具服務額度中扣除，所請代辦之憑證若經縣市政府查核有不符規定情事，" +
            "願自行負擔購買費用，且如涉及詐欺或其他不法行為請領給付費用，" +
            "願負一切法律責任，絕無異議。</p>" +
          gap(10, "var(--ls-360)") +
          '<p class="s-dhead">購買明細：<span class="unit">單位：元</span></p>' +
          gap(12) +
          '<table class="s-table"><colgroup>' +
            '<col style="width:35.85pt"><col style="width:97.25pt">' +
            '<col style="width:49.6pt"><col style="width:74.3pt">' +
            '<col style="width:84.95pt"><col style="width:58.55pt">' +
            '<col style="width:58.6pt"><col style="width:85.15pt">' +
          "</colgroup><thead><tr>" +
            "<th>編號</th><th>輔具/環境改善<br>項目名稱</th>" +
            "<th>產品廠牌</th><th>產品型號</th><th>產品序號</th>" +
            "<th>購買金額</th><th>給付金額</th><th>民眾部分負擔</th>" +
          "</tr></thead><tbody>" + rows + "</tbody></table>" +
          gap(12) +
          '<p class="s-note">註：購買金額應等於申請給付金額及民眾部分負擔之加總。</p>' +
          gap(18, "var(--ls-212)") +
          gap(18, "var(--ls-212)") +
          '<p class="s-cause">此　　致</p>' +
          gap(8, "var(--ls-212)") +
          '<p class="s-dept">台南市政府衛生局</p>' +
        "</div>" +

        '<div class="s-flex"></div>' +

        '<div class="s-bottom">' +
          '<p class="s-contract">立契約人(以下簡稱申請人)與' + ul(cert.vendor, 10) +
            "(以下簡稱乙方)同意訂立輔具買賣契約，雙方議定</p>" +
          '<p class="s-contract">條件如上:</p>' +
          '<p class="s-sign">申請人簽名或蓋章：' + ul("", 11) +
            "　身分證字號：" + ul(cert.applicantId, 7) + "</p>" +
          '<p class="s-sign">聯 絡 電 話：' + ul(cert.applicantTel, 7) + "</p>" +
          '<p class="s-sign">受託人簽名或蓋章：' + ul("", 11) +
            "　身分證字號：" + ul("", 7) + "</p>" +
          '<p class="s-sign">受託人與申請人之關係：' + ul("", 7) + "</p>" +
          gap(16, "var(--ls-360)") +
          '<p class="s-vendor">乙方: ' + esc(cert.vendor) + "　　　地址:" +
            esc(cert.vendorAddr) + "　　代表人:" + esc(cert.vendorRep) + "</p>" +
          gap(12, "var(--ls-360)") + gap(12, "var(--ls-360)") +
          '<p class="s-date">中　華　民　國　　' + esc(cert.year) +
            "　　年　　" + esc(cert.month) + "　　月　　" + esc(cert.day) + "　　日</p>" +
        "</div>" +
      "</div>";

    {
      /* 照片頁的三行文字都置中，「照片黏貼處」在框線之外的上方（範本與
         0805、0816 兩份實際核銷件皆同）。框的寬高取自範本的 tblGrid 與
         trHeight，位置對應 tblpY=3288 twips（距頁頂 164.4pt）；品項多時
         框會被文字往下推，與 0805 那份的表現一致。

         主體與其附加功能是同一件實體，合併成一張照片頁，購買項目逐行列出。 */
      photoGroups(cert.rows).forEach(function (group) {
        var items = group.map(function (row, i) {
          return '<p class="s-photo-line">' +
                 (i === 0 ? "購買項目：" : "") + esc(row.name) + "</p>";
        }).join("");
        html +=
          '<div class="sub-sheet s-photo-sheet">' +
            gap(18, "30pt") +
            '<p class="s-photo-line">個案姓名: ' + ul(cert.applicant, 8) + "</p>" +
            items +
            '<p class="s-photo-line">照片黏貼處</p>' +
            '<div class="s-photo-box"></div>' +
          "</div>";
      });
    }

    return html;
  }

  /* ── ZIP 打包（docx 就是一個 zip） ───────────────────────────────── */
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
  /* ── DOCX：沿用衛生局範本，只替換文字 ───────────────────────────────
     範本由 scripts/prepare_certificate_template.py 拆成 JSON（各部件的
     XML 原文），這裡只改 word/document.xml 的文字節點後重新打包，
     欄寬、邊界、行距等排版一律沿用正本，不重畫。
     ------------------------------------------------------------------ */
  var W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  var tplPromise = null;

  function loadTemplate() {
    if (!tplPromise) {
      var url = $("sbWord").dataset.template;
      tplPromise = fetch(url).then(function (res) {
        if (!res.ok) throw new Error("載入範本失敗（HTTP " + res.status + "）");
        return res.json();
      });
    }
    return tplPromise;
  }

  function tagged(node, name) {
    return Array.prototype.slice.call(node.getElementsByTagNameNS(W_NS, name));
  }
  function nodeText(node) {
    return tagged(node, "t").map(function (t) { return t.textContent; }).join("");
  }
  /* 直接子元素；getElementsByTagNameNS 會抓到孫層，取段落屬性時不能用 */
  function childNamed(node, name) {
    for (var i = 0; i < node.childNodes.length; i++) {
      var c = node.childNodes[i];
      if (c.nodeType === 1 && c.localName === name) return c;
    }
    return null;
  }
  function elemChildren(node, name) {
    return Array.prototype.slice.call(node.childNodes).filter(function (n) {
      return n.nodeType === 1 && n.localName === name;
    });
  }
  function setRunText(run, value) {
    var t = childNamed(run, "t");
    if (!t) {
      t = run.ownerDocument.createElementNS(W_NS, "w:t");
      run.appendChild(t);
    }
    t.setAttribute("xml:space", "preserve");
    t.textContent = value;
  }

  /* 範本的填寫欄位都是「連續數個加底線的 run」。把第 groupIndex 組換成
     value，其餘清空；value 補空白至原長度，底線長度才不會縮短。 */
  function fillUnderlineGroup(para, groupIndex, value) {
    var groups = [], cur = null;
    tagged(para, "r").forEach(function (r) {
      var rPr = childNamed(r, "rPr");
      if (rPr && childNamed(rPr, "u")) {
        if (!cur) { cur = []; groups.push(cur); }
        cur.push(r);
      } else {
        cur = null;
      }
    });
    var g = groups[groupIndex];
    if (!g) return false;
    var width = g.reduce(function (n, r) { return n + nodeText(r).length; }, 0);
    var text = String(value == null ? "" : value);
    while (text.length < width) text += " ";
    setRunText(g[0], text);
    g.slice(1).forEach(function (r) { setRunText(r, ""); });
    return true;
  }

  /* 把整段併成一個 run，沿用第一個 run 的格式（日期列用） */
  function replaceParaText(para, value) {
    var runs = tagged(para, "r");
    if (!runs.length) return false;
    setRunText(runs[0], value);
    runs.slice(1).forEach(function (r) { setRunText(r, ""); });
    return true;
  }

  function findPara(paras, predicate) {
    for (var i = 0; i < paras.length; i++) {
      if (predicate(nodeText(paras[i]))) return paras[i];
    }
    return null;
  }

  /* 表格儲存格：沿用該格段落屬性裡的 rPr 當文字格式 */
  function setCellText(tc, value) {
    var doc = tc.ownerDocument;
    var p = childNamed(tc, "p");
    if (!p) return;
    tagged(p, "r").forEach(function (r) { r.parentNode.removeChild(r); });
    if (!value) return;
    var run = doc.createElementNS(W_NS, "w:r");
    var pPr = childNamed(p, "pPr");
    var rPr = pPr && childNamed(pPr, "rPr");
    if (rPr) run.appendChild(rPr.cloneNode(true));
    var t = doc.createElementNS(W_NS, "w:t");
    t.setAttribute("xml:space", "preserve");
    t.textContent = value;
    run.appendChild(t);
    p.appendChild(run);
  }

  function fillDocumentXml(xml, cert) {
    var doc = new DOMParser().parseFromString(xml, "application/xml");
    if (doc.getElementsByTagName("parsererror").length) {
      throw new Error("範本 XML 解析失敗");
    }
    var body = doc.getElementsByTagNameNS(W_NS, "body")[0];
    var paras = tagged(body, "p");

    /* 本人 ___ 確已收到 ___ 販售（或修繕）… */
    var pIntro = findPara(paras, function (t) { return t.indexOf("確已收到") > -1; });
    if (pIntro) {
      fillUnderlineGroup(pIntro, 0, cert.applicant);
      fillUnderlineGroup(pIntro, 1, " " + cert.vendor + " ");
    }

    /* 立契約人…與 ___ (以下簡稱乙方) */
    var pContract = findPara(paras, function (t) { return t.indexOf("立契約人") > -1; });
    if (pContract) fillUnderlineGroup(pContract, 0, cert.vendor);

    /* 身分證字號與電話；簽名欄留白供手寫 */
    var pSign = findPara(paras, function (t) { return t.indexOf("申請人簽名或蓋章") > -1; });
    if (pSign) fillUnderlineGroup(pSign, 1, cert.applicantId);
    var pTel = findPara(paras, function (t) {
      return t.replace(/\s/g, "").indexOf("聯絡電話") === 0;
    });
    if (pTel) fillUnderlineGroup(pTel, 0, cert.applicantTel);

    /* 乙方：名稱在加底線的 run，地址與代表人在其後的一般 run */
    var pVendor = findPara(paras, function (t) { return t.indexOf("乙方:") === 0; });
    if (pVendor) {
      fillUnderlineGroup(pVendor, 0, " " + cert.vendor + " ");
      tagged(pVendor, "r").forEach(function (r) {
        var txt = nodeText(r);
        if (txt.indexOf("地址:") > -1 && txt.indexOf("代表人:") > -1) {
          setRunText(r, "     地址:" + cert.vendorAddr + "  代表人:" + cert.vendorRep);
        }
      });
    }

    /* 中華民國 ○ 年 ○ 月 ○ 日 */
    var pDate = findPara(paras, function (t) { return t.indexOf("中   華   民   國") > -1; });
    if (pDate) {
      replaceParaText(pDate,
        "中   華   民   國    " + cert.year + "    年    " + cert.month +
        "    月    " + cert.day + "    日");
    }

    /* 購買明細表：範本給兩列空白，不足則複製。
       編號欄是 Word 的自動編號（numPr），不要自己填。 */
    var mainTbl = null;
    tagged(body, "tbl").forEach(function (t) {
      if (!mainTbl && nodeText(t).indexOf("編號") > -1) mainTbl = t;
    });
    if (mainTbl) {
      var blanks = elemChildren(mainTbl, "tr").slice(1);
      while (blanks.length < cert.rows.length) {
        var clone = blanks[blanks.length - 1].cloneNode(true);
        mainTbl.appendChild(clone);
        blanks.push(clone);
      }
      /* 多出來的空白列刪掉，與列印版一致 */
      blanks.slice(cert.rows.length).forEach(function (tr) {
        if (tr.parentNode) tr.parentNode.removeChild(tr);
      });
      blanks = blanks.slice(0, cert.rows.length);
      cert.rows.forEach(function (row, idx) {
        var cells = elemChildren(blanks[idx], "tc");
        if (cells.length < 8) return;
        setCellText(cells[1], row.name);
        setCellText(cells[2], row.brand);
        setCellText(cells[3], row.model);
        setCellText(cells[4], row.serial);
        setCellText(cells[5], money(row.price));
        setCellText(cells[6], money(row.gov));
        setCellText(cells[7], money(row.self));
      });
    }

    /* 照片黏貼頁：範本內建兩頁，依項目數整塊增減 */
    var starts = paras.filter(function (p) { return nodeText(p).indexOf("個案姓名") > -1; });
    if (starts.length) {
      var top = starts[0].parentNode;
      var kids = Array.prototype.slice.call(top.childNodes);
      var blocks = starts.map(function (startPara, bi) {
        var from = kids.indexOf(startPara);
        var to = bi + 1 < starts.length ? kids.indexOf(starts[bi + 1]) : kids.length;
        /* 版面結尾的 sectPr 不屬於任何一塊 */
        while (to > from && kids[to - 1].nodeType === 1 &&
               kids[to - 1].localName === "sectPr") { to -= 1; }
        return kids.slice(from, to);
      });

      /* 與列印版相同：主體與其附加功能共用一張照片頁 */
      var groups = photoGroups(cert.rows);
      var want = groups.length;
      while (blocks.length < want) {
        var src = blocks[blocks.length - 1];
        var copy = src.map(function (n) { return n.cloneNode(true); });
        copy.reduce(function (prev, node) {
          prev.parentNode.insertBefore(node, prev.nextSibling);
          return node;
        }, src[src.length - 1]);
        blocks.push(copy);
      }
      blocks.slice(want).forEach(function (block) {
        block.forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
      });
      /* 範本的照片頁是靠表格撐滿版面自然溢出分頁的。複製之後張數不固定，
         而且只有 Word 會這樣分頁，改成加上明確的分頁符號，Word 與畫面
         渲染才會得到相同的頁數。第一塊沿用範本原本的位置，不另外加。 */
      blocks.slice(1, want).forEach(function (block) {
        var first = block[0];
        var br = doc.createElementNS(W_NS, "w:p");
        var run = doc.createElementNS(W_NS, "w:r");
        var brk = doc.createElementNS(W_NS, "w:br");
        brk.setAttribute("w:type", "page");
        run.appendChild(brk);
        br.appendChild(run);
        first.parentNode.insertBefore(br, first);
      });

      blocks.slice(0, want).forEach(function (block, bi) {
        var items = groups[bi];
        block.forEach(function (node) {
          if (node.nodeType !== 1 || node.localName !== "p") return;
          var txt = nodeText(node);
          if (txt.indexOf("個案姓名") > -1) {
            fillUnderlineGroup(node, 0, cert.applicant);
          } else if (txt.indexOf("購買項目") > -1) {
            var runs = tagged(node, "r");
            if (runs.length) setRunText(runs[runs.length - 1], " " + items[0].name);
            /* 同組的其他品項：複製這一段，去掉「購買項目：」只留品項名 */
            var anchor = node;
            items.slice(1).forEach(function (it) {
              var clone = node.cloneNode(true);
              var cr = tagged(clone, "r");
              cr.forEach(function (r, i) {
                setRunText(r, i === cr.length - 1 ? it.name : "");
              });
              anchor.parentNode.insertBefore(clone, anchor.nextSibling);
              anchor = clone;
            });
          }
        });
      });
    }

    return new XMLSerializer().serializeToString(doc);
  }

  function buildDocx(cert) {
    return loadTemplate().then(function (tpl) {
      var files = Object.keys(tpl).map(function (name) {
        return {
          name: name,
          data: name === "word/document.xml" ? fillDocumentXml(tpl[name], cert) : tpl[name]
        };
      });
      return new Blob([createZip(files)], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      });
    });
  }

  /* ── 列印與下載 ──────────────────────────────────────────────────── */
  function setStatus(msg) {
    var el = $("sbMsg");
    if (!el) return;
    el.hidden = !msg;
    el.textContent = msg || "";
  }

  function printCertificate() {
    var cert = certificateData();
    if (!cert) return;
    $("sbPrintArea").innerHTML = buildSheets(cert);
    setStatus("");
    setTimeout(function () { window.print(); }, 80);
  }

  function downloadWord() {
    var cert = certificateData();
    if (!cert) return;
    var btn = $("sbWord");
    btn.disabled = true;
    setStatus("正在依範本產生 Word 檔…");
    buildDocx(cert).then(function (blob) {
      var safe = (cert.applicant || "未填寫姓名").replace(/[\\/:*?"<>|]/g, "_");
      var pad = function (v) { return String(v).length < 2 ? "0" + v : String(v); };
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
      setStatus("");
    }).catch(function (err) {
      console.error(err);
      setStatus("Word 檔產生失敗：" + (err && err.message ? err.message : err));
    }).then(function () {
      btn.disabled = false;
    });
  }

  /* ── 啟動 ────────────────────────────────────────────────────────── */
  function init() {
    var today = new Date();
    $("sbY").value = today.getFullYear() - 1911;
    $("sbM").value = today.getMonth() + 1;
    $("sbD").value = today.getDate();

    loadVendor();
    loadPins();
    addRow();

    document.addEventListener("click", function (e) {
      var t = e.target.closest ? e.target : null;
      if (!t) return;

      var del = t.closest("[data-del]");
      if (del) { delRow(Number(del.dataset.del)); return; }

      /* 星星：切換釘選，清單原地更新，不關閉面板 */
      var star = t.closest("[data-star]");
      if (star) {
        e.preventDefault();
        togglePin(star.dataset.name);
        return;
      }

      /* 選取品項 */
      var pick = t.closest("[data-pick]");
      if (pick) {
        setItem(Number(pick.dataset.pick), Number(pick.dataset.idx));
        closePicker();
        return;
      }

      /* 開合清單 */
      var open = t.closest("[data-open]");
      if (open) {
        var r = Number(open.dataset.open);
        var box = $("sbPicker" + r);
        if (box.classList.contains("open")) closePicker();
        else openPicker(r);
        return;
      }

      /* 點面板以外的地方就收起來 */
      if (!t.closest(".sub-picker")) closePicker();
    });

    document.addEventListener("keydown", function (e) {
      var box = document.querySelector(".sub-picker.open");
      if (!box) return;
      if (e.key === "Escape") {
        closePicker();
        var f = box.querySelector(".sub-picker-field");
        if (f) f.focus();
        return;
      }
      pickerKey(Number(box.dataset.picker), e);
    });
    document.addEventListener("input", function (e) {
      var d = e.target.dataset || {};
      if (d.search) { renderPickerList(Number(d.search)); return; }
      if (d.qty) onQtyChange(Number(d.qty));
      else if (d.limit) { e.target.dataset.auto = "0"; calculate(false); }
      else if (d.price) calculate(false);
      else if (d.prod) syncBedFields(Number(d.prod));
    });

    VENDOR_FIELDS.forEach(function (id) {
      $(id).addEventListener("input", saveVendor);
    });
    $("sbVendorClear").addEventListener("click", clearVendor);
    $("sbAdd").addEventListener("click", addRow);
    $("sbPrint").addEventListener("click", printCertificate);
    $("sbWord").addEventListener("click", downloadWord);
    $("sbCopay").addEventListener("change", function () { calculate(false); });
    $("sbQuota").addEventListener("input", function () { calculate(false); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

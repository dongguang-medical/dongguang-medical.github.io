(function(){function e(e){let t=`message`,n=[];for(let r of e.split(/\r?\n/))r.startsWith(`event:`)?t=r.slice(6).trim():r.startsWith(`data:`)&&n.push(r.slice(5).replace(/^ /,``));return n.length?{event:t,data:n.join(`
`)}:null}async function*t(t){let n=t.getReader(),r=new TextDecoder,i=``;for(;;){let{value:t,done:a}=await n.read();i+=a?r.decode():r.decode(t,{stream:!0});let o=i.split(/\r?\n\r?\n/);i=a?``:o.pop()??``;for(let t of o){let n=e(t);n&&(yield n)}if(a)return}}function n(e){return e===429?`您問得有點快，請等一分鐘後再試。`:e===422?`問題太長或格式不對，請精簡到 500 字以內再試。`:`抱歉，問答服務暫時無法使用，請稍後再試。`}async function r(e,r,i,a){let o;try{o=await fetch(`${e.replace(/\/$/,``)}/api/chat`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({messages:r}),signal:a})}catch{return{citations:[],error:`連不上問答服務，請檢查網路後再試。`}}if(!o.ok||!o.body)return{citations:[],error:n(o.status)};for await(let e of t(o.body)){let t=JSON.parse(e.data);if(e.event===`token`)i.onToken(t.text);else if(e.event===`done`)return{citations:t.citations??[],suggestions:t.suggestions??[],limited:t.limited};else if(e.event===`error`)return{citations:[],error:t.message}}return{citations:[],error:`連線中斷，回答可能不完整，請再問一次。`}}function i(e,t={}){let n=window.gtag;if(typeof n==`function`)try{n(`event`,e,t)}catch{}}function a(e){return e.replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`).replace(/'/g,`&#39;`)}function o(e){return e.replace(/\*\*(.+?)\*\*/g,`<strong>$1</strong>`).replace(/https?:\/\/[^\s<>「」（）()，。、]+/g,e=>`<a href="${e}" target="_blank" rel="noopener noreferrer">${e}</a>`)}function s(e){return/^\s*\|.*\|\s*$/.test(e)}function c(e){return e.trim().replace(/^\||\|$/g,``).split(`|`).map(e=>e.trim())}function l(e){let t=a(e).split(`
`),n=[],r=null,i=()=>{r&&n.push(`</${r}>`),r=null};for(let e=0;e<t.length;e++){let a=t[e],l=a.match(/^\s*[-*]\s+(.*)$/),u=a.match(/^\s*\d+[.、]\s*(.*)$/);if(s(a)&&e+1<t.length&&/^\s*\|[\s|:-]+\|\s*$/.test(t[e+1])){i();let r=c(a).map(e=>`<th>${o(e)}</th>`).join(``),l=[];for(e+=2;e<t.length&&s(t[e]);)l.push(`<tr>${c(t[e]).map(e=>`<td>${o(e)}</td>`).join(``)}</tr>`),e++;e--,n.push(`<div class="table"><table><thead><tr>${r}</tr></thead><tbody>${l.join(``)}</tbody></table></div>`)}else if(l||u){let e=l?`ul`:`ol`;r!==e&&(i(),n.push(`<${e}>`),r=e),n.push(`<li>${o((l??u)[1])}</li>`)}else a.trim()===``?i():(i(),n.push(`<p>${o(a)}</p>`))}return i(),n.join(``)}var u=/^\s*(?:#{1,6}\s*)?(?:\*\*)?\s*出處\s*(?:\*\*)?\s*[:：]?/,d=/^\s*(?:[-*+]|\d+[.)])\s/;function f(e){let t=e.split(`
`),n=-1;for(let e=t.length-1;e>=0;e--)if(u.test(t[e])){n=e;break}if(n===-1)return e;let r=n+1;for(;r<t.length;){let e=t[r];if(e.trim()===``){let e=t.slice(r+1).find(e=>e.trim()!==``);if(e===void 0||!d.test(e))break}else if(!d.test(e)&&!/^\s{2,}\S/.test(e))break;r++}return[...t.slice(0,n),...t.slice(r)].join(`
`).replace(/\n{3,}/g,`

`).trim()}function p(e){let t=e.indexOf(`【相關提問】`);if(t!==-1)return e.slice(0,t).trimEnd();for(let t=5;t>0;t--)if(e.endsWith(`【相關提問】`.slice(0,t)))return e.slice(0,-t);return e}var m=[`電動輪椅最多補助多少？`,`買輔具前要先申請嗎？`,`長照租輪椅要自付多少？`],h=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.4c-.5.4-1.3 0-1.3-.6V16A2.5 2.5 0 0 1 4 13.5z" fill="currentColor"/></svg>`,g=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,_=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12l15-7-5 15-2.5-6.5z" fill="currentColor"/></svg>`,v=`
:host {
  /* 配色取自東光網站 assets/css/design-system.css（暖橘品牌色、米白底）。
     網站沒有深色模式，懸浮球也固定用淺色，才不會跟網站不搭 */
  --tac-accent: #E8681A;       /* --color-primary：懸浮球、標題列、送出鈕 */
  --tac-accent-ink: #ffffff;
  --tac-accent-text: #C25007;  /* --color-primary-dark：白底上的連結與按鈕文字，對比較足 */
  --tac-bg: #ffffff;           /* --color-surface */
  --tac-surface: #FCF8F2;      /* --color-bg */
  --tac-ink: #33200F;          /* --color-text-primary */
  --tac-muted: #8A6A50;        /* --color-text-secondary */
  --tac-line: #F0DCC6;         /* --color-border */
  --tac-user: #FEF0E4;         /* --color-primary-pale */
  --tac-font: "Noto Sans TC", "Microsoft JhengHei", "PingFang TC", system-ui, sans-serif;
  all: initial;
}
/* 字型與文字顏色設在內層：網站的樣式選不到 Shadow DOM 裡的元素，只會透過繼承影響外層標籤 */
.ball, .panel { font-family: var(--tac-font); color: var(--tac-ink); }
* { box-sizing: border-box; }
button { font: inherit; cursor: pointer; }
button:focus-visible, a:focus-visible {
  outline: 3px solid var(--tac-accent-text); outline-offset: 2px;
}

.ball {
  position: fixed; right: 20px; bottom: 20px; z-index: 2147483000;
  width: 60px; height: 60px; border-radius: 50%; border: 0;
  background: var(--tac-accent); color: var(--tac-accent-ink);
  box-shadow: 0 6px 20px rgba(0,0,0,.22);
  display: grid; place-items: center;
}
.ball svg { width: 28px; height: 28px; }
.ball:hover { filter: brightness(1.08); }

.panel {
  position: fixed; right: 20px; bottom: 92px; z-index: 2147483000;
  width: 380px; height: min(600px, calc(100vh - 112px));
  background: var(--tac-bg); border: 1px solid var(--tac-line); border-radius: 14px;
  box-shadow: 0 12px 40px rgba(0,0,0,.25);
  display: flex; flex-direction: column; overflow: hidden;
  font-size: 15px; line-height: 1.65;
}
.panel[hidden] { display: none; }

header {
  display: flex; align-items: center; gap: 10px; padding: 12px 12px 12px 16px;
  background: var(--tac-accent); color: var(--tac-accent-ink);
}
header h2 { flex: 1; min-width: 0; margin: 0; font-size: 16px; font-weight: 700; line-height: 1.3; }
.close { border: 0; background: transparent; color: inherit; width: 36px; height: 36px; border-radius: 8px; display: grid; place-items: center; }
.close svg { width: 20px; height: 20px; }
.close:hover { background: rgba(255,255,255,.15); }

.log { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 12px; background: var(--tac-surface); }
.msg { max-width: 92%; padding: 10px 12px; border-radius: 12px; overflow-wrap: anywhere; }
.msg.user { align-self: flex-end; background: var(--tac-user); border-bottom-right-radius: 4px; white-space: pre-wrap; }
.msg.bot { align-self: flex-start; background: var(--tac-bg); border: 1px solid var(--tac-line); border-bottom-left-radius: 4px; }
.msg.bot p { margin: 0 0 6px; }
.msg.bot p:last-child { margin-bottom: 0; }
.msg.bot ul, .msg.bot ol { margin: 4px 0 8px; padding-left: 20px; }
.msg.bot a { color: var(--tac-accent-text); }
.msg.bot .table { overflow-x: auto; margin: 6px 0; }
.msg.bot table { border-collapse: collapse; font-size: 13.5px; }
.msg.bot th, .msg.bot td { border: 1px solid var(--tac-line); padding: 4px 8px; text-align: left; }
.msg.error { align-self: stretch; background: transparent; border: 1px dashed var(--tac-muted); color: var(--tac-muted); font-size: 14px; }

.sources { margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--tac-line); font-size: 13px; }
.sources b { display: block; color: var(--tac-muted); font-weight: 500; margin-bottom: 2px; }
.sources ul { margin: 0; padding-left: 18px; }

.typing { display: inline-flex; gap: 4px; padding: 4px 0; }
.typing i { width: 7px; height: 7px; border-radius: 50%; background: var(--tac-muted); animation: blink 1.2s infinite both; }
.typing i:nth-child(2) { animation-delay: .2s; } .typing i:nth-child(3) { animation-delay: .4s; }
@keyframes blink { 0%, 80%, 100% { opacity: .25; } 40% { opacity: 1; } }

.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.sources + .chips, .msg.bot > .chips { margin-top: 10px; }
.chip { border: 1px solid var(--tac-accent); color: var(--tac-accent-text); background: var(--tac-bg); border-radius: 999px; padding: 5px 12px; font-size: 13.5px; }
.chip:hover { background: var(--tac-user); }

form { display: flex; gap: 8px; align-items: flex-end; padding: 10px 12px 6px; border-top: 1px solid var(--tac-line); background: var(--tac-bg); }
textarea {
  flex: 1; min-width: 0; resize: none; font: inherit; color: inherit; background: var(--tac-surface);
  border: 1px solid var(--tac-line); border-radius: 10px; padding: 8px 10px; max-height: 120px; line-height: 1.5;
  overflow-y: hidden; /* 高度會跟著內容長；只有超過 max-height 才出現捲軸，見 onInput */
}
/* 點進輸入框時只把框線換成品牌橘，不加外圈 */
textarea:focus { outline: none; border-color: var(--tac-accent); }
.send { flex: none; width: 42px; height: 42px; border: 0; border-radius: 10px; background: var(--tac-accent); color: var(--tac-accent-ink); display: grid; place-items: center; }
.send svg { width: 20px; height: 20px; }
.send:disabled { opacity: .4; cursor: default; }
.foot { padding: 0 12px 10px; font-size: 11.5px; color: var(--tac-muted); background: var(--tac-bg); }

@media (max-width: 480px) {
  .panel { inset: 0; width: auto; height: 100%; border-radius: 0; border: 0; }
  .ball { right: 16px; bottom: 16px; }
}
@media (prefers-reduced-motion: reduce) { .typing i { animation: none; opacity: .6; } }
`,y=class extends HTMLElement{constructor(){super(),this.messages=[],this.busy=!1,this.root=this.attachShadow({mode:`open`})}get api(){return this.getAttribute(`api`)??``}connectedCallback(){if(this.els)return;this.root.innerHTML=`
      <style>${v}</style>
      <button class="ball" type="button" aria-label="開啟輔具補助問答" aria-expanded="false">${h}</button>
      <section class="panel" role="dialog" aria-label="輔具補助問答" hidden>
        <header>
          <h2>臺南輔具補助小幫手</h2>
          <button class="close" type="button" aria-label="關閉">${g}</button>
        </header>
        <div class="log" aria-live="polite"></div>
        <form>
          <textarea id="tac-input" rows="1" maxlength="500" aria-label="輸入問題"></textarea>
          <button class="send" type="submit" aria-label="送出" disabled>${_}</button>
        </form>
        <div class="foot">回答僅供參考，以臺南市政府社會局核定為準。</div>
      </section>`;let e=e=>this.root.querySelector(e);this.els={ball:e(`.ball`),panel:e(`.panel`),log:e(`.log`),form:e(`form`),input:e(`textarea`),send:e(`.send`)},this.els.ball.addEventListener(`click`,()=>this.toggle()),e(`.close`).addEventListener(`click`,()=>this.toggle(!1)),this.els.panel.addEventListener(`keydown`,e=>{e.key===`Escape`&&this.toggle(!1)}),this.els.input.addEventListener(`input`,()=>this.onInput()),this.els.input.addEventListener(`keydown`,e=>{e.key===`Enter`&&!e.shiftKey&&!e.isComposing&&(e.preventDefault(),this.els.form.requestSubmit())}),this.els.form.addEventListener(`submit`,e=>{e.preventDefault(),this.ask(this.els.input.value)}),document.addEventListener(`pointerdown`,e=>{!this.els.panel.hidden&&!e.composedPath().includes(this)&&this.toggle(!1,!1)}),this.els.log.addEventListener(`click`,e=>{e.target.closest?.(`.sources a`)&&i(`aid_chat_source_click`)}),this.showWelcome()}toggle(e=this.els.panel.hidden,t=!0){e&&this.els.panel.hidden&&i(`aid_chat_open`),this.els.panel.hidden=!e,this.els.ball.setAttribute(`aria-expanded`,String(e)),this.els.ball.setAttribute(`aria-label`,e?`關閉輔具補助問答`:`開啟輔具補助問答`),e?this.els.input.focus():t&&this.els.ball.focus()}onInput(){let{input:e,send:t}=this.els;e.style.height=`auto`;let n=e.offsetHeight-e.clientHeight,r=parseFloat(getComputedStyle(e).maxHeight)||1/0,i=e.scrollHeight+n;e.style.height=`${Math.min(i,r)}px`,e.style.overflowY=i>r?`auto`:`hidden`;let a=e.value.trim().length;t.disabled=this.busy||a===0}showWelcome(){let e=this.addBubble(`bot`);e.innerHTML=`<p>您好！我可以回答<strong>臺南市輔具補助</strong>的問題，包含身障輔具、醫療輔具和長照輔具的補助金額、申請資格、流程和文件。回答會附上法規出處。</p>
      <p>請不要輸入身分證字號、電話等個人資料。</p>
      ${this.chipsHtml(m)}`,e.querySelectorAll(`.chip`).forEach(e=>e.addEventListener(`click`,()=>void this.ask(e.textContent??``,`starter`)))}addBubble(e){let t=document.createElement(`div`);return t.className=`msg ${e}`,this.els.log.append(t),this.scrollToEnd(),t}scrollToEnd(){this.els.log.scrollTop=this.els.log.scrollHeight}setBusy(e){this.busy=e,this.els.input.disabled=e,this.onInput()}async ask(e,t=`typed`){let n=e.trim().slice(0,500);if(!n||this.busy)return;if(!this.api){this.addBubble(`error`).textContent=`尚未設定問答服務網址（data-api）。`;return}t===`starter`&&i(`aid_chat_starter_click`),t===`suggestion`&&i(`aid_chat_suggestion_click`),i(`aid_chat_question`),this.els.input.value=``,this.addBubble(`user`).textContent=n;let a=this.addBubble(`bot`);a.innerHTML=`<span class="typing" aria-label="正在回答"><i></i><i></i><i></i></span>`,this.setBusy(!0);let o=this.messages.slice(-19),s=``,c=await r(this.api,[...o,{role:`user`,content:n}],{onToken:e=>{s+=e,a.innerHTML=l(p(s)),this.scrollToEnd()}});if(c.error)i(`aid_chat_error`),s||a.remove(),this.addBubble(`error`).textContent=c.error;else{let e=p(s),t=this.sourcesHtml(c.citations);a.innerHTML=l(t?f(e):e)+t+this.chipsHtml(c.suggestions??[]),a.querySelectorAll(`.chip`).forEach(e=>e.addEventListener(`click`,()=>void this.ask(e.textContent??``,`suggestion`))),c.limited||this.messages.push({role:`user`,content:n},{role:`assistant`,content:e})}this.setBusy(!1),this.scrollToEnd(),this.els.input.focus()}chipsHtml(e){return e.length?`<div class="chips">${e.map(e=>`<button type="button" class="chip">${a(e)}</button>`).join(``)}</div>`:``}sourcesHtml(e){let t=e.filter(e=>/^https?:\/\//.test(e.url));return t.length?`<div class="sources"><b>出處</b><ul>${t.map(e=>`<li><a href="${a(e.url)}" target="_blank" rel="noopener noreferrer">${a(e.title)}</a></li>`).join(``)}</ul></div>`:``}},b=`tainan-aid-chat`;customElements.get(b)||customElements.define(b,y);var x=document.currentScript?.dataset.api;function S(){if(!x||document.querySelector(b))return;let e=document.createElement(b);e.setAttribute(`api`,x),document.body.append(e)}document.readyState===`loading`?document.addEventListener(`DOMContentLoaded`,S):S()})();
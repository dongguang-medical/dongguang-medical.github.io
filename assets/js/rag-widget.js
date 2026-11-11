(function(){function e(e){let t=`message`,n=[];for(let r of e.split(/\r?\n/))r.startsWith(`event:`)?t=r.slice(6).trim():r.startsWith(`data:`)&&n.push(r.slice(5).replace(/^ /,``));return n.length?{event:t,data:n.join(`
`)}:null}async function*t(t){let n=t.getReader(),r=new TextDecoder,i=``;for(;;){let{value:t,done:a}=await n.read();i+=a?r.decode():r.decode(t,{stream:!0});let o=i.split(/\r?\n\r?\n/);i=a?``:o.pop()??``;for(let t of o){let n=e(t);n&&(yield n)}if(a)return}}function n(e){return e===429?`您問得有點快，請等一分鐘後再試。`:e===422?`問題太長或格式不對，請精簡到 500 字以內再試。`:`抱歉，問答服務暫時無法使用，請稍後再試。`}async function r(e,r,i,a){let o;try{o=await fetch(`${e.replace(/\/$/,``)}/api/chat`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({messages:r}),signal:a})}catch{return{citations:[],error:`連不上問答服務，請檢查網路後再試。`}}if(!o.ok||!o.body)return{citations:[],error:n(o.status)};for await(let e of t(o.body)){let t=JSON.parse(e.data);if(e.event===`token`)i.onToken(t.text);else if(e.event===`done`)return{citations:t.citations??[],limited:t.limited};else if(e.event===`error`)return{citations:[],error:t.message}}return{citations:[],error:`連線中斷，回答可能不完整，請再問一次。`}}function i(e){return e.replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`).replace(/'/g,`&#39;`)}function a(e){return e.replace(/\*\*(.+?)\*\*/g,`<strong>$1</strong>`).replace(/https?:\/\/[^\s<>「」（）()，。、]+/g,e=>`<a href="${e}" target="_blank" rel="noopener noreferrer">${e}</a>`)}function o(e){return/^\s*\|.*\|\s*$/.test(e)}function s(e){return e.trim().replace(/^\||\|$/g,``).split(`|`).map(e=>e.trim())}function c(e){let t=i(e).split(`
`),n=[],r=null,c=()=>{r&&n.push(`</${r}>`),r=null};for(let e=0;e<t.length;e++){let i=t[e],l=i.match(/^\s*[-*]\s+(.*)$/),u=i.match(/^\s*\d+[.、]\s*(.*)$/);if(o(i)&&e+1<t.length&&/^\s*\|[\s|:-]+\|\s*$/.test(t[e+1])){c();let r=s(i).map(e=>`<th>${a(e)}</th>`).join(``),l=[];for(e+=2;e<t.length&&o(t[e]);)l.push(`<tr>${s(t[e]).map(e=>`<td>${a(e)}</td>`).join(``)}</tr>`),e++;e--,n.push(`<div class="table"><table><thead><tr>${r}</tr></thead><tbody>${l.join(``)}</tbody></table></div>`)}else if(l||u){let e=l?`ul`:`ol`;r!==e&&(c(),n.push(`<${e}>`),r=e),n.push(`<li>${a((l??u)[1])}</li>`)}else i.trim()===``?c():(c(),n.push(`<p>${a(i)}</p>`))}return c(),n.join(``)}var l=[`電動輪椅最多補助多少？`,`買輔具前要先申請嗎？`,`申請要準備哪些文件？`],u=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.4c-.5.4-1.3 0-1.3-.6V16A2.5 2.5 0 0 1 4 13.5z" fill="currentColor"/></svg>`,d=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,f=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12l15-7-5 15-2.5-6.5z" fill="currentColor"/></svg>`,p=`
:host {
  --tac-accent: #0e6b78;
  --tac-accent-ink: #ffffff;
  --tac-bg: #ffffff;
  --tac-surface: #f3f6f7;
  --tac-ink: #15252c;
  --tac-muted: #58696f;
  --tac-line: #d5dee1;
  --tac-user: #dcecef;
  --tac-font: "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", system-ui, sans-serif;
  all: initial;
}
/* 字型與文字顏色設在內層：網站的樣式選不到 Shadow DOM 裡的元素，只會透過繼承影響外層標籤 */
.ball, .panel { font-family: var(--tac-font); color: var(--tac-ink); }
@media (prefers-color-scheme: dark) {
  :host {
    --tac-accent: #58bfcb; --tac-accent-ink: #0b1a1e; --tac-bg: #162228; --tac-surface: #0e171b;
    --tac-ink: #e4edf0; --tac-muted: #94a6ad; --tac-line: #2b3c44; --tac-user: #143a40;
  }
}
* { box-sizing: border-box; }
button { font: inherit; cursor: pointer; }
button:focus-visible, textarea:focus-visible, a:focus-visible {
  outline: 3px solid var(--tac-accent); outline-offset: 2px;
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
header .titles { flex: 1; min-width: 0; }
header h2 { margin: 0; font-size: 16px; font-weight: 700; line-height: 1.3; }
header p { margin: 0; font-size: 12.5px; opacity: .85; }
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
.msg.bot a { color: var(--tac-accent); }
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
.chip { border: 1px solid var(--tac-accent); color: var(--tac-accent); background: var(--tac-bg); border-radius: 999px; padding: 5px 12px; font-size: 13.5px; }
.chip:hover { background: var(--tac-user); }

form { display: flex; gap: 8px; align-items: flex-end; padding: 10px 12px 6px; border-top: 1px solid var(--tac-line); background: var(--tac-bg); }
textarea {
  flex: 1; min-width: 0; resize: none; font: inherit; color: inherit; background: var(--tac-surface);
  border: 1px solid var(--tac-line); border-radius: 10px; padding: 8px 10px; max-height: 120px; line-height: 1.5;
}
.send { flex: none; width: 42px; height: 42px; border: 0; border-radius: 10px; background: var(--tac-accent); color: var(--tac-accent-ink); display: grid; place-items: center; }
.send svg { width: 20px; height: 20px; }
.send:disabled { opacity: .4; cursor: default; }
.foot { padding: 0 12px 10px; font-size: 11.5px; color: var(--tac-muted); background: var(--tac-bg); }

@media (max-width: 480px) {
  .panel { inset: 0; width: auto; height: 100%; border-radius: 0; border: 0; }
  .ball { right: 16px; bottom: 16px; }
}
@media (prefers-reduced-motion: reduce) { .typing i { animation: none; opacity: .6; } }
`,m=class extends HTMLElement{constructor(){super(),this.messages=[],this.busy=!1,this.root=this.attachShadow({mode:`open`})}get api(){return this.getAttribute(`api`)??``}connectedCallback(){if(this.els)return;this.root.innerHTML=`
      <style>${p}</style>
      <button class="ball" type="button" aria-label="開啟輔具補助問答" aria-expanded="false">${u}</button>
      <section class="panel" role="dialog" aria-label="輔具補助問答" hidden>
        <header>
          <div class="titles">
            <h2>輔具補助小幫手</h2>
            <p>臺南市身心障礙者輔具補助問答</p>
          </div>
          <button class="close" type="button" aria-label="關閉">${d}</button>
        </header>
        <div class="log" aria-live="polite"></div>
        <form>
          <textarea id="tac-input" rows="1" maxlength="500" placeholder="例如：電動輪椅可以補助多少？" aria-label="輸入問題"></textarea>
          <button class="send" type="submit" aria-label="送出" disabled>${f}</button>
        </form>
        <div class="foot">回答僅供參考，以臺南市政府社會局核定為準。對話不會被儲存。</div>
      </section>`;let e=e=>this.root.querySelector(e);this.els={ball:e(`.ball`),panel:e(`.panel`),log:e(`.log`),form:e(`form`),input:e(`textarea`),send:e(`.send`)},this.els.ball.addEventListener(`click`,()=>this.toggle()),e(`.close`).addEventListener(`click`,()=>this.toggle(!1)),this.els.panel.addEventListener(`keydown`,e=>{e.key===`Escape`&&this.toggle(!1)}),this.els.input.addEventListener(`input`,()=>this.onInput()),this.els.input.addEventListener(`keydown`,e=>{e.key===`Enter`&&!e.shiftKey&&!e.isComposing&&(e.preventDefault(),this.els.form.requestSubmit())}),this.els.form.addEventListener(`submit`,e=>{e.preventDefault(),this.ask(this.els.input.value)}),this.showWelcome()}toggle(e=this.els.panel.hidden){this.els.panel.hidden=!e,this.els.ball.setAttribute(`aria-expanded`,String(e)),this.els.ball.setAttribute(`aria-label`,e?`關閉輔具補助問答`:`開啟輔具補助問答`),e?this.els.input.focus():this.els.ball.focus()}onInput(){let{input:e,send:t}=this.els;e.style.height=`auto`,e.style.height=`${e.scrollHeight}px`;let n=e.value.trim().length;t.disabled=this.busy||n===0}showWelcome(){let e=this.addBubble(`bot`);e.innerHTML=`<p>您好！我可以回答<strong>臺南市身心障礙者輔具補助</strong>的問題，例如補助金額、申請資格、流程和文件。回答會附上法規出處。</p>
      <p>請不要輸入身分證字號、電話等個人資料。</p>
      <div class="chips">${l.map(e=>`<button type="button" class="chip">${i(e)}</button>`).join(``)}</div>`,e.querySelectorAll(`.chip`).forEach(e=>e.addEventListener(`click`,()=>void this.ask(e.textContent??``)))}addBubble(e){let t=document.createElement(`div`);return t.className=`msg ${e}`,this.els.log.append(t),this.scrollToEnd(),t}scrollToEnd(){this.els.log.scrollTop=this.els.log.scrollHeight}setBusy(e){this.busy=e,this.els.input.disabled=e,this.onInput()}async ask(e){let t=e.trim().slice(0,500);if(!t||this.busy)return;if(!this.api){this.addBubble(`error`).textContent=`尚未設定問答服務網址（data-api）。`;return}this.els.input.value=``,this.addBubble(`user`).textContent=t;let n=this.addBubble(`bot`);n.innerHTML=`<span class="typing" aria-label="正在回答"><i></i><i></i><i></i></span>`,this.setBusy(!0);let i=this.messages.slice(-19),a=``,o=await r(this.api,[...i,{role:`user`,content:t}],{onToken:e=>{a+=e,n.innerHTML=c(a),this.scrollToEnd()}});o.error?(a||n.remove(),this.addBubble(`error`).textContent=o.error):(n.insertAdjacentHTML(`beforeend`,this.sourcesHtml(o.citations)),o.limited||this.messages.push({role:`user`,content:t},{role:`assistant`,content:a})),this.setBusy(!1),this.scrollToEnd(),this.els.input.focus()}sourcesHtml(e){let t=e.filter(e=>/^https?:\/\//.test(e.url));return t.length?`<div class="sources"><b>出處</b><ul>${t.map(e=>`<li><a href="${i(e.url)}" target="_blank" rel="noopener noreferrer">${i(e.title)}</a></li>`).join(``)}</ul></div>`:``}},h=`tainan-aid-chat`;customElements.get(h)||customElements.define(h,m);var g=document.currentScript?.dataset.api;function _(){if(!g||document.querySelector(h))return;let e=document.createElement(h);e.setAttribute(`api`,g),document.body.append(e)}document.readyState===`loading`?document.addEventListener(`DOMContentLoaded`,_):_()})();
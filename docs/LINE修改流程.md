# LINE 修改流程

店裡的人在 LINE 跟 bot 說要改網站哪裡 → Claude 在 GitHub Actions 裡改好 → 提出的人看過預覽、按［上線］才上線。

## 流程

1. **LINE 閘道 Worker** 收到訊息，開一個帶 `line-request` 標籤的 issue（對方還有未結案的件時，改成在那個 issue 留言）。
2. **`.github/workflows/line-request.yml`** 被觸發：
   - 切到 `line/<issue 編號>` 分支（已存在就接著改）
   - Claude 依 `CLAUDE.md` 的「LINE 修改請求守則」只改檔案，不碰 git
   - 工作流程還原 `admin/`、`.github/` 的任何改動，重跑 `scripts/build_catalog.py`
   - 推分支；沒有 PR 就開一個（`Closes #<issue>`），有就在 PR 留言說明追加修改
   - 等 Cloudflare Pages 把這個分支的預覽部署好（最多 3 分鐘）
   - 在 issue 留言回報結果（附預覽網址）
3. **Cloudflare Pages** 對 `line/*` 分支自動部署預覽，網址會貼在 PR 上。
4. 提出的人在 LINE 按［上線］→ Worker 合併 PR → main 照舊部署到 GitHub Pages，issue 自動關閉。

Claude 不會推 main，也沒有開 PR 的權限；這些都由工作流程的固定步驟完成。

## 觸發條件

| 事件 | 會觸發 |
| --- | --- |
| issue 加上 `line-request` 標籤（含開 issue 時就帶標籤） | ✅ 能加標籤的只有 repo 協作者 |
| 帶 `line-request` 標籤、仍開著的 issue 有新留言 | ✅ 限 OWNER／MEMBER／COLLABORATOR，機器人留言不算 |
| 沒有標籤的 issue、PR 頁面上的留言、非協作者留言 | ❌ |

同一個 issue 的執行會排隊，不會同時跑兩件。

## 給 Worker 判讀的回報格式

每次執行結束，issue 會多一則留言，第一行是狀態標記：

| 標記 | 意思 |
| --- | --- |
| `<!-- line-request:status=ready;pr=<編號>;branch=line/<issue>;preview=<網址> -->` | 改好了，PR 已開或已更新，預覽已部署 |
| `<!-- line-request:status=question -->` | 違反守則或需要反問；留言內容就是要轉給對方的話 |
| `<!-- line-request:status=nochange -->` | 看完沒有需要改的地方 |
| `<!-- line-request:status=cancel -->` | 對方要放棄這件；Worker 會用按鈕跟對方確認後才結案 |
| `<!-- line-request:status=error -->` | 執行失敗，附執行紀錄連結 |

標記之後的內容是給人看的白話說明，可以直接轉發到 LINE。

## 首次設定

1. **Claude 驗證**：本機執行 `claude setup-token`（需要 Pro 或 Max 訂閱），把產生的 token 存到
   repo 的 [Actions secrets](https://github.com/dongguang-medical/website/settings/secrets/actions)，名稱 `CLAUDE_CODE_OAUTH_TOKEN`。
2. **允許 Actions 開 PR**：repo 的 [Actions 設定](https://github.com/dongguang-medical/website/settings/actions) →
   Workflow permissions → 勾選「Allow GitHub Actions to create and approve pull requests」。
3. **建立標籤**：在 [Labels](https://github.com/dongguang-medical/website/labels) 新增 `line-request`。
4. **試跑**：手動開一個 issue、加上 `line-request` 標籤，內容例如「關於我們頁面的營業時間改成週日公休」，
   到 Actions 分頁看執行結果，確認出現 `line/<編號>` 分支與 PR。

## 注意

- 用 `GITHUB_TOKEN` 推的分支不會觸發其他 workflow（GitHub 的規定），但 Cloudflare Pages 走自己的 GitHub App，預覽照常產生。
- 合併進 main 後，既有的「建置商品目錄」workflow 會照原本的條件執行。
- Claude 的用量算在產生 token 的那個 Claude 訂閱帳號上。

# 同步到公開 repo

開發在 private repo 進行，公開版 [`guitarflow-studio`](https://github.com/karevin07/guitarflow-studio) 是同一份 Git 歷史的鏡像，只在選定的時間點更新。

| remote | repo | 用途 |
| --- | --- | --- |
| `origin` | private | 日常開發，隨時推送 |
| `public` | `guitarflow-studio` | 公開版本，推送前會自動檢查 |

## 第一次設定

在每個要推送公開版的 clone 執行一次：

```bash
git remote add public git@github.com:karevin07/guitarflow-studio.git
git fetch public
git config user.email "<GitHub 帳號的 noreply 信箱>"
make install-hooks
```

再建立私人字串清單 `.git/info/public-push-deny`。它在 `.git/` 裡，不會被 commit。每行一個 extended regex，比對時不分大小寫，`#` 開頭為註解：

```text
# 內網位址、主機名稱、個人信箱、雲端專案編號等
100\.64\.0\.10
my-machine-name
```

清單不存在時，hook 只會套用內建規則，並在推送時提醒。

## 平常的流程

```bash
git push origin main    # 隨時
git push public main    # 想公開時
```

建議在完成一個功能、文件也更新後再推到 `public`。

## 發佈版本

1. 寫好 `docs/releases/<版本>.md`，例如 `docs/releases/v0.2.0.md`，並 commit、推到 `origin`。內容會成為 GitHub Release 的說明；圖片與連結請用指向該 tag 的完整網址，Release 頁面無法解析相對路徑。
2. 先確認一次，不會做任何變更：

   ```bash
   make release VERSION=v0.2.0 DRY_RUN=1
   ```

3. 正式發佈：

   ```bash
   make release VERSION=v0.2.0
   ```

[`scripts/release.sh`](../scripts/release.sh) 依序執行：

- 確認在 `main`、沒有未提交的修改、`main` 與 `origin/main` 一致、`public` 沒有 `main` 缺少的 commit，且版本號尚未使用。
- 把 `main` 推到 `public`。推送前檢查在這一步執行，被擋下時還沒有建立任何 tag。
- 建立 annotated tag，推到 `public` 與 `origin`。
- 用 `gh` 在公開 repo 建立 Release。需要 [GitHub CLI](https://cli.github.com/) 並已登入。

## 推送前檢查什麼

`make install-hooks` 會安裝 `pre-push` hook，執行 [`scripts/check-public-push.sh`](../scripts/check-public-push.sh)。它只在推到 `public` 時生效，檢查這次要送出、而 `public` 上還沒有的 commit：

- 作者與提交者信箱必須是 GitHub noreply 信箱。
- commit 訊息與新增的程式行不能符合以下任一規則：
  - 內建規則：Google OAuth 用戶端密鑰、Google API 金鑰、GitHub token、私鑰標頭，以及非預設的 Django 開發 key。
  - `.git/info/public-push-deny` 裡的私人字串。
- 不能新增 `.env`（`.example` 範本除外）、`.pem`、`.key`、`.sqlite3` 檔案。
- 有安裝 [gitleaks](https://github.com/gitleaks/gitleaks) 時，另外掃描這些 commit。

有任何一項不符合就會擋下推送，並列出 commit 與原因。

## 被擋下時

問題還沒推到 `origin`：直接修改 commit。

```bash
git commit --amend                  # 最後一個 commit
git rebase -i <有問題的 commit>^    # 更早的 commit
```

信箱錯誤時，先修正設定，再重設作者：

```bash
git config user.email "<noreply 信箱>"
git rebase <public/main> --exec 'git commit --amend --no-edit --reset-author'
```

問題已經推到 `origin`：修正後需要強制推送 `origin`，`public` 則照常推送。

不要用 `git push --no-verify` 略過檢查；誤判時應調整私人清單或規則，而不是跳過。

## 公開 repo 的 issue 與 PR

在 `guitarflow-studio` 合併的 PR 要帶回 private repo：

```bash
git pull public main
git push origin main
```

兩邊共用同一份歷史，所以會直接接上。

## 私人資訊放哪裡

- 機器位址、主機名稱、OAuth 用戶端 ID 等設定：放在被忽略的 `.env.*.local`。
- 個人筆記：放在被忽略的 `docs/notes/`。
- 文件需要舉例時，使用範例值，例如 `100.64.0.10`、`guitarflow-dev`。

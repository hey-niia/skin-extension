# Skin — browser extension

A paper skin for **Claude** and **ChatGPT**. Your chats are sorted into folders that look like
sheets of paper on a dark desk. You pick the colors, hide a folder's name, or blur its chat titles.
Chatting works exactly as before, on the real site.

Sister project: [skin](https://github.com/hey-niia/skin), a standalone app with an anonymized API chat.

## What it does

- **Board of folders, chat box below.** Opens on the home page, or with the `skin` tab at the top (`Alt+Shift+S`).
  Type in the paper chat box at the bottom and add photos or files (＋, paste, or drag in). Skin opens a new chat on the
  site, drops your message and files into the site's own chat box, and presses send. Models, tools, projects and
  history work as usual. You can pick a folder for the new chat, or leave it on `auto`. Turn off *send right away*
  if you want to pick a model before sending.
- **Read and reply on paper.** Open a chat from a folder and it's printed on a sheet in that folder's color: your
  messages, the model's answers (with lists, code and tables), and replies streaming in live. Reply from the chat box at
  the bottom. Skin copies the text from the site's page into its own simple markup, and never uses the site's HTML.
  Pictures in answers and rows of web results show up too. Skin paints the page's own, already-loaded images onto the
  paper, so nothing is downloaded again. Click a picture to see it large. Thinking and tool steps are shown as tiny notes.
  `open in Claude ↗` shows the usual view (for artifacts and so on).
- **Folders and chats.** Rename a folder by clicking its title. Move a chat to any folder, or to a new one
  (`+ new folder…`). `×` removes a chat from Skin, with undo.
  **Delete in Claude…** (in the move menu, or `delete` on the paper) opens the chat and Claude's own Delete dialog.
  The final, irreversible click is always yours. Skin makes no API calls to delete anything.
- **Sheets that fit.** The more folders you have, the smaller the sheets get, so the whole board fits above the chat box.
  When the sheets get too small to read, folders that mean similar things stack into piles (paperwork,
  work & making, mind, living). Stacking can be set to `auto`, `on` or `off`.
- **Auto-sort, in three steps:**
  1. **Words.** Each folder has a list of word stems (English, Ukrainian, Russian), which you can edit in settings.
  2. **Your moves.** A chat you move by hand teaches Skin. Chats with similar words follow it into the
     same folder, marked `≈ guess`, and one click on ✓ confirms the guess.
  3. **New folder ideas.** Words that keep repeating among unsorted chats become suggested folders.
  Everything runs in the browser. No model and no network.
- **Privacy looks.** You can hide a folder's name and keep only its color, blur its chat titles until you hover, or turn it into a vellum envelope.
- **A tab that hangs from the top** of the page whenever Skin is closed: `skin · chat · claude code`. Switch to Claude Code
  (or Codex on ChatGPT), do your work there, then press `chat` or `skin` to come back. If a chat is open on the page,
  Skin opens it on paper. The same works after `open in Claude ↗`.
- **One board, both sites.** Chats from Claude and ChatGPT are stored together, and each chat opens on its own site.
- **Same look as the [prototype](https://github.com/hey-niia/skin/tree/main/prototype):** 4 palettes (neon, kraft, fold, vellum),
  paper grain and fibres, folded corners, and an image on any folder. Fonts are Spline Sans Mono + Instrument Sans
  (SIL Open Font License), bundled in `fonts/`. The textures are rebuilt with `python3 dev/make-textures.py`.

## Privacy

- Reads **only chat links already visible on the page** (the sidebar, the Recents page). It does not call
  Claude's or ChatGPT's API, and it makes **no network requests** of its own.
- Stores chat titles, links and settings in `chrome.storage.local`, only in this browser.
- Permissions: `storage` only, and it runs only on `claude.ai` and `chatgpt.com`.

To collect older chats, open **Recents** on Claude (or scroll the ChatGPT sidebar). Skin picks up whatever the page shows.

## Install (Chrome, Arc, Edge, Brave)

1. Download this repo (`Code → Download ZIP`, then unzip), or `git clone` it.
2. Open `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and choose the `skin-extension` folder.
4. Open claude.ai or chatgpt.com.

## Develop

`dev/mock-claude.html` fakes a chat sidebar, and `dev/chrome-shim.js` stands in for `chrome.*`, so you can
work on the UI without a real account:

```bash
python3 -m http.server 5179
# open http://localhost:5179/dev/mock-claude.html
```

## Limits

- Site updates can break link detection (`/chat/<id>` on Claude, `/c/<id>` on ChatGPT), and the chat-box hand-off
  (it looks for the site's editor, file input and send button).
- Auto-sort uses words and your moves, not a language model.
- Anthropic's and OpenAI's consumer terms restrict automated access. Skin only reads what's already
  on the page and never fetches data in the background.

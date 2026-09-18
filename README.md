# Skin — browser extension

A paper skin for **Claude** and **ChatGPT**. Your chats are sorted into folders that look like
sheets of paper on a dark desk. You pick the colors, hide a folder's name, or blur its chat titles.
Chatting works exactly as before, on the real site.

Sister project: [skin](https://github.com/hey-niia/skin), a standalone app with an anonymized API chat.

## What it does

- **Board of folders.** Opens on the home page, or with the `skin` tab on the right edge (`Alt+Shift+S`).
- **Auto-sort, in three steps:**
  1. **Words.** Each folder has a list of word stems (English, Ukrainian, Russian), which you can edit in settings.
  2. **Your moves.** A chat you move by hand teaches Skin. Chats with similar words follow it into the
     same folder, marked `≈ guess`, and one click on ✓ confirms the guess.
  3. **New folder ideas.** Words that keep repeating among unsorted chats become suggested folders.
  Everything runs in the browser. No model and no network.
- **Privacy looks.** You can hide a folder's name and keep only its color, blur its chat titles until you hover, or turn it into a vellum envelope.
- **Chat / Code switch.** Jump between Claude and Claude Code (`claude.ai/code`), or ChatGPT and Codex.
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

- Site updates can break link detection (`/chat/<id>` on Claude, `/c/<id>` on ChatGPT).
- Auto-sort uses words and your moves, not a language model.
- Anthropic's and OpenAI's consumer terms restrict automated access. Skin only reads what's already
  on the page and never fetches data in the background.

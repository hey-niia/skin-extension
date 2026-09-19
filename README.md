# Skin

A private skin for your LLM. Think Winamp skins, but for Claude and ChatGPT.

**Browser-only:** no servers, no accounts, no API calls.

Instead of the default chat UI, you see your own board. Every conversation is sorted into a folder, and every folder
is a sheet of paper you style yourself: color, image, label, or no label at all.

Sister project: [skin](https://github.com/hey-niia/skin), a standalone app with an anonymized API chat.

## What it does

- **Folders** — your chats, sorted onto sheets of paper
- **Auto-sort** — by words, learns from your moves
- **Private** — hide names, blur titles, seal in envelopes
- **Chat** — write, attach photos, read and reply on paper
- **Switch** — chat ⇄ Claude Code, one small `skin` tab

## Privacy

- Reads **only chat links already visible on the page** (the sidebar, the Recents page). It does not call
  Claude's or ChatGPT's API, and it makes **no network requests** of its own.
- Stores chat titles, links and settings in `chrome.storage.local`, only in this browser.
- Permissions: `storage` only, and it runs only on `claude.ai` and `chatgpt.com`.

To collect older chats, open **Recents** on Claude (or scroll the ChatGPT sidebar). Skin picks up whatever the page shows.

## Install (Chrome, Arc, Edge, Brave)

1. Download `skin-extension-vX.Y.Z.zip` from the [latest release](https://github.com/hey-niia/skin-extension/releases/latest) and unzip it.
   You can also `git clone` this repo.
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

## Credits

- Fonts: [Spline Sans Mono](https://github.com/SorkinType/SplineSansMono) and [Instrument Sans](https://github.com/Instrument/instrument-sans),
  both under the SIL Open Font License 1.1 (see `fonts/OFL-*.txt`).
- Skin is an independent project. It is not affiliated with or endorsed by Anthropic or OpenAI.

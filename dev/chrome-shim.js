// Minimal stand-in for the chrome.* APIs so the content script runs on a plain page.
(() => {
  const listeners = [];
  const KEY = "skin-dev-storage";
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  window.chrome = {
    runtime: { getURL: (p) => new URL("../" + p, location.href).href },
    storage: {
      local: {
        get: async (k) => { const all = read(); return k in all ? { [k]: all[k] } : {}; },
        set: async (obj) => { const all = { ...read(), ...obj }; try { localStorage.setItem(KEY, JSON.stringify(all)); } catch {} },
      },
      onChanged: { addListener: (fn) => listeners.push(fn) },
    },
  };
})();

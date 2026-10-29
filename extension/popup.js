const api = globalThis.browser || chrome;
const el = id => document.getElementById(id);
document.querySelectorAll("[data-i18n]").forEach(node => node.textContent = words[node.dataset.i18n]);
let lastRender = "", busy = false, blobs = [], database;
async function send(type, extra = {}) {
  const result = await api.runtime.sendMessage({ type, ...extra });
  if (result.error) throw Error(result.error);
  return result.scan;
}
function release() { blobs.forEach(URL.revokeObjectURL); blobs = []; }
async function render(scan) {
  const running = scan?.status === "running";
  el("start").disabled = running || busy;
  el("stop").hidden = !running;
  el("split").disabled = running; el("seconds").disabled = running;
  const count = Object.keys(scan?.rows || {}).length;
  el("status").textContent = scan ? (running ? words.running : words.finished) + count +
    (running ? " (" + Math.max(0, Math.ceil((scan.deadline - Date.now()) / 1000)) + "s)" : "") : "";
  el("results").hidden = !scan || running;
  if (!scan) { lastRender = ""; release(); return; }
  if (running) return;
  const key = JSON.stringify(scan);
  if (key === lastRender) return;
  if (scan.truncated) el("error").textContent = words.limit;
  if (scan.split && !database) {
    const read = async name => {
      const response = await fetch(api.runtime.getURL("data/" + name));
      if (!response.ok) throw Error(words.failed);
      return response.json();
    };
    const index = await read("index.json");
    const entries = await Promise.all(Object.entries(index).map(async ([family, files]) =>
      [family, (await Promise.all(files.map(read))).flat()]));
    database = Object.fromEntries(entries);
  }
  const groups = SplitTrace.exportsFor(scan.rows, database, scan.split);
  release(); el("downloads").replaceChildren();
  for (const country of Object.keys(groups).sort((a,b) => a === "all" ? -1 : b === "all" ? 1 : a.localeCompare(b))) {
    const link = document.createElement("a"); link.className = "download";
    const blob = URL.createObjectURL(new Blob([JSON.stringify(groups[country], null, 4) + "\n"], { type: "application/json" }));
    blobs.push(blob); link.href = blob;
    link.download = country === "all" ? "amnezia-sites.json" : "amnezia-sites-" + country + ".json";
    link.textContent = (country === "all" ? words.all : country === "unknown" ? words.unknown : country.toUpperCase()) + " (" + groups[country].length + ")";
    el("downloads").append(link);
  }
  el("preview").textContent = count ? JSON.stringify(groups.all, null, 2) : words.empty;
  lastRender = key;
}
async function action(fn) {
  busy = true; el("start").disabled = true; el("error").textContent = "";
  try { await fn(); } catch (error) { el("error").textContent = error.message; }
  finally { busy = false; await refresh(); }
}
async function refresh() { try { await render(await send("status")); } catch (e) { el("error").textContent = e.message; } }
el("start").onclick = () => action(async () => {
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  await api.storage.local.set({ split: el("split").checked, seconds: +el("seconds").value });
  await render(await send("start", { tabId: tab.id, split: el("split").checked, seconds: +el("seconds").value }));
});
el("stop").onclick = () => action(async () => render(await send("stop")));
el("clear").onclick = () => action(async () => render(await send("clear")));
api.storage.local.get(["split", "seconds"]).then(settings => {
  el("split").checked = settings.split || false;
  el("seconds").value = settings.seconds || 20;
  refresh();
});
setInterval(() => { if (!busy) refresh(); }, 1000);
addEventListener("unload", release);

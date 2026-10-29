if (typeof importScripts === "function") importScripts("core.js");
const api = globalThis.browser || chrome;
let queue = Promise.resolve();
function serial(fn) {
  const result = queue.then(fn);
  queue = result.catch(() => {});
  return result;
}
async function getScan() { return (await api.storage.session.get("scan")).scan; }
async function finish(reason = "Finished") {
  const scan = await getScan();
  if (!scan || scan.status !== "running") return scan;
  scan.status = "done"; scan.reason = reason;
  await api.storage.session.set({ scan });
  await api.alarms.clear("scan-deadline");
  if (scan.tabId !== null) await api.tabs.remove(scan.tabId).catch(() => {});
  return scan;
}
async function start(message) {
  const old = await getScan();
  if (old?.status === "running") throw Error("A scan is already running.");
  const tab = await api.tabs.get(message.tabId);
  const url = new URL(tab.url);
  if (!["http:", "https:"].includes(url.protocol)) throw Error("Open an HTTP or HTTPS page first.");
  const seconds = Math.min(120, Math.max(5, Number(message.seconds) || 20));
  // Create about:blank first so listeners and session state exist before navigation.
  const clone = await api.tabs.create({ url: "about:blank", active: false });
  const scan = { status: "running", tabId: clone.id, rows: {}, split: !!message.split,
    deadline: Date.now() + seconds * 1000, reason: "", truncated: false };
  try {
    await api.storage.session.set({ scan });
    await api.alarms.create("scan-deadline", { when: scan.deadline });
    await api.tabs.update(clone.id, { url: url.href });
  } catch (error) { await finish("Navigation failed"); throw error; }
  return scan;
}
function observe(details) {
  serial(async () => {
    const scan = await getScan();
    if (scan?.status !== "running" || details.tabId !== scan.tabId) return;
    if (Date.now() >= scan.deadline) return finish();
    if (Object.keys(scan.rows).length >= 10000 && !Object.hasOwn(scan.rows, new URL(details.url).hostname)) { scan.truncated = true; }
    else SplitTrace.record(scan.rows, details);
    await api.storage.session.set({ scan });
  }).catch(console.error);
}
api.webRequest.onBeforeRequest.addListener(observe, { urls: ["<all_urls>"] });
api.webRequest.onCompleted.addListener(observe, { urls: ["<all_urls>"] });
api.webRequest.onBeforeRedirect.addListener(observe, { urls: ["<all_urls>"] });
api.webRequest.onErrorOccurred.addListener(observe, { urls: ["<all_urls>"] });
api.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === "scan-deadline") serial(() => finish()).catch(console.error);
});
api.tabs.onRemoved.addListener(id => {
  serial(async () => {
    const scan = await getScan();
    if (scan?.status === "running" && scan.tabId === id) await finish("Scan tab closed");
  }).catch(console.error);
});
api.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== api.runtime.id) return false;
  serial(async () => {
    if (message.type === "start") return start(message);
    if (message.type === "stop") return finish("Stopped by user");
    if (message.type === "clear") {
      await finish("Cleared"); await api.storage.session.remove("scan"); return null;
    }
    if (message.type === "status") {
      const scan = await getScan();
      return scan?.status === "running" && Date.now() >= scan.deadline ? finish() : scan;
    }
    throw Error("Unknown command");
  }).then(scan => respond({ scan }), error => respond({ error: error.message }));
  return true;
});

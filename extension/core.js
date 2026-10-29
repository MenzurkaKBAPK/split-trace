(function (root) {
  function ipNumber(raw) {
    let ip = raw.replace(/^\[|\]$/g, "").toLowerCase();
    if (ip.includes("." ) && ip.includes(":")) {
      const end = ip.lastIndexOf(":");
      const n = ipNumber(ip.slice(end + 1));
      if (n === null) return null;
      ip = ip.slice(0, end + 1) + (n >> 16n).toString(16) + ":" + (n & 65535n).toString(16);
    }
    if (!ip.includes(":")) {
      const p = ip.split(".");
      if (p.length !== 4 || p.some(x => !/^\d{1,3}$/.test(x) || +x > 255)) return null;
      return p.reduce((n, x) => (n << 8n) + BigInt(x), 0n);
    }
    if (!/^[a-f0-9:]+$/.test(ip) || ip.split("::").length > 2) return null;
    let p = ip.split(":");
    if (ip.includes("::")) {
      const [a, b] = ip.split("::").map(x => x ? x.split(":") : []);
      if (a.length + b.length >= 8) return null;
      p = [...a, ...Array(8 - a.length - b.length).fill("0"), ...b];
    }
    if (p.length !== 8 || p.some(x => !/^[a-f0-9]{1,4}$/.test(x))) return null;
    return p.reduce((n, x) => (n << 16n) + BigInt("0x" + x), 0n);
  }
  function lookup(ip, db) {
    const n = ipNumber(ip);
    if (n === null) return "unknown";
    const rows = db[ip.includes(":") ? "v6" : "v4"];
    let lo = 0, hi = rows.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1, [start, end, country] = rows[mid];
      if (n < BigInt(start)) hi = mid - 1;
      else if (n > BigInt(end)) lo = mid + 1;
      else return country.toLowerCase();
    }
    return "unknown";
  }
  function record(rows, details) {
    let url;
    try { url = new URL(details.url); } catch { return; }
    if (!["http:", "https:", "ws:", "wss:"].includes(url.protocol)) return;
    const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
    if (!Object.hasOwn(rows, host)) Object.defineProperty(rows, host, { value: { hostname: host, ips: [] }, enumerable: true });
    const row = rows[host];
    const ip = details.ip || (ipNumber(host) !== null ? host : "");
    if (ip && ipNumber(ip) !== null && !row.ips.includes(ip)) row.ips.push(ip);
  }
  function exportsFor(rows, db, split) {
    const groups = { all: [] };
    for (const row of Object.values(rows).sort((a,b) => a.hostname.localeCompare(b.hostname, "en"))) {
      const ips = [...row.ips].sort();
      groups.all.push({ hostname: row.hostname, ip: ips[0] || "", ips });
      if (!split) continue;
      const byCountry = {};
      for (const ip of ips) (byCountry[lookup(ip, db)] ||= []).push(ip);
      if (!ips.length) byCountry.unknown = [];
      for (const [country, addresses] of Object.entries(byCountry)) {
        (groups[country] ||= []).push({ hostname: row.hostname, ip: addresses[0] || "", ips: addresses });
      }
    }
    return groups;
  }
  root.SplitTrace = { ipNumber, lookup, record, exportsFor };
})(globalThis);

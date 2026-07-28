#!/usr/bin/env bash
# Serve docs/ locally and run the same Lighthouse checks CI runs, so a
# regression is caught before it is pushed and deployed.
#
#   ./scripts/audit.sh            # audit the local docs/ folder
#   ./scripts/audit.sh live       # audit https://ksharma.xyz/ instead
#
# Thresholds match .github/workflows/lighthouse.yml.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT=8899
OUT="$(mktemp -d)"

if [ "${1:-}" = "live" ]; then
  URL="https://ksharma.xyz/"
  echo "Auditing the live site: $URL"
else
  URL="http://localhost:$PORT/"
  echo "Serving $ROOT/docs on $URL"
  python3 -m http.server "$PORT" --directory "$ROOT/docs" >/dev/null 2>&1 &
  SERVER_PID=$!
  trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT
  sleep 1
fi

npx --yes lighthouse "$URL" \
  --output=json --output=html --output-path="$OUT/lh" \
  --chrome-flags="--headless" --quiet --preset=desktop

# both outputs, so Lighthouse appends .report.<ext> rather than using the path verbatim
npx --yes lighthouse "$URL" \
  --output=json --output=html --output-path="$OUT/lh-mobile" \
  --chrome-flags="--headless" --quiet \
  --form-factor=mobile --screenEmulation.mobile=true

node -e "
const d = JSON.parse(require('fs').readFileSync('$OUT/lh.report.json'));
const m = JSON.parse(require('fs').readFileSync('$OUT/lh-mobile.report.json'));
const f = (r,k) => Math.round(r.categories[k].score*100);
const MIN = { performance: 75, accessibility: 100, 'best-practices': 100, seo: 100 };
const fail = [];
console.log('');
console.log('category         desktop  mobile  min');
Object.keys(MIN).forEach(k => {
  const dv = f(d,k), mv = f(m,k);
  console.log(k.padEnd(16), String(dv).padStart(7), String(mv).padStart(7), String(MIN[k]).padStart(4));
  if (dv < MIN[k]) fail.push('desktop ' + k + ' = ' + dv);
  if (mv < MIN[k]) fail.push('mobile ' + k + ' = ' + mv);
});
// report BOTH form factors: some audits (tap targets, animated contrast)
// only fail on mobile
for (const [label, report] of [['desktop', d], ['mobile', m]]) {
  const bad = [];
  for (const cat of ['accessibility','best-practices','seo']) {
    for (const ref of report.categories[cat].auditRefs) {
      const a = report.audits[ref.id];
      if (a.score !== null && a.score < 1) {
        const where = ((a.details && a.details.items) || [])
          .map(i => (i.node && (i.node.selector || i.node.snippet)) || '').filter(Boolean).slice(0,3).join(', ');
        bad.push('  ' + cat + ': ' + ref.id + (where ? ' -> ' + where.slice(0,120) : ''));
      }
    }
  }
  if (bad.length) { console.log('\nFailing audits (' + label + '):'); console.log(bad.join('\n')); }
}
console.log('\nFull report: $OUT/lh.report.html');
if (fail.length) { console.error('\nBELOW THRESHOLD:\n  ' + fail.join('\n  ')); process.exit(1); }
console.log('\nAll thresholds met.');
"

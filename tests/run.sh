#!/usr/bin/env bash
# Install deps if missing, run the UX-laws suite, print a short pass/fail summary.
# Usage: PORT=8199 ./tests/run.sh [extra playwright args, e.g. -g "Fitts" --project=mobile-light]
set -uo pipefail
cd "$(dirname "$0")"
export PORT="${PORT:-8899}"

if [ ! -d node_modules ]; then
  npm ci || npm install || exit 1
fi
npx playwright install chromium || exit 1

npx playwright test "$@"
status=$?

node - <<'NODE'
const fs = require('fs');
const f = 'test-results/results.json';
if (!fs.existsSync(f)) { console.log('\n(no results.json; run did not complete)'); process.exit(0); }
const data = JSON.parse(fs.readFileSync(f, 'utf8'));
const laws = new Map();
let pass = 0, fail = 0;
const walk = (s) => {
  for (const sp of s.specs || []) {
    const law = sp.title.split(':')[0];
    const e = laws.get(law) || { pass: 0, fail: 0 };
    for (const t of sp.tests) {
      const ok = t.status === 'expected' || t.status === 'skipped';
      if (t.status === 'skipped') continue;
      if (ok) { e.pass++; pass++; } else { e.fail++; fail++; }
    }
    laws.set(law, e);
  }
  (s.suites || []).forEach(walk);
};
(data.suites || []).forEach(walk);
console.log('\n=== UX laws summary (passed / failed) ===');
for (const [law, e] of laws) console.log(`${e.fail ? 'FAIL' : 'ok  '}  ${law.padEnd(32)} ${e.pass} / ${e.fail}`);
console.log(`\nTOTAL: ${pass} passed, ${fail} failed`);
console.log('HTML report: tests/report/index.html  (npx playwright show-report report)');
NODE
exit $status

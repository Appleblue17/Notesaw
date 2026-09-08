#!/usr/bin/env bash
#
# Build a production .vsix from a clean checkout.
#
# Strategy (npm-oriented):
#   1. install all deps (dev included, so `compile`/`lint` can run),
#   2. compile TypeScript into `out/`,
#   3. prune to *production* dependencies only, so the package does not ship the
#      whole dev toolchain (an earlier symptom: a 100+ MB VSIX because every dev
#      package under node_modules was packed),
#   4. package with @vscode/vsce fetched on demand via npx (vsce is a devDependency,
#      so it will not be present after step 3).
#
# Puppeteer's browser download is skipped for installs; PDF export locates a Chrome
# at runtime via the `notesaw.pdfOptions.puppeteerPath` setting instead.

set -euo pipefail
cd "$(dirname "$0")/.."

export PUPPETEER_SKIP_DOWNLOAD=true

echo "--- 1/4 Installing dependencies (node_modules will be used by compile) ---"
npm install

echo "--- 2/4 Compiling ---"
npm run compile

echo "--- 3/4 Pruning to production dependencies ---"
npm prune --omit=dev

echo "--- 4/4 Packaging the extension ---"
npx --yes --package @vscode/vsce vsce package

echo "Done. The .vsix is written to the repository root."

export PUPPETEER_SKIP_DOWNLOAD=true
pnpm install
pnpm run compile
rm -rf node_modules package-lock.json
npm install --omit=dev
npx vsce publish
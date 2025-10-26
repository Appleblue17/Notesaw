export PUPPETEER_SKIP_DOWNLOAD=true
rm -rf node_modules package-lock.json
npm install --omit=dev
npx vsce package
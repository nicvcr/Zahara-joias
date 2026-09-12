const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const scriptMatches = html.match(/<script.*?>(.*?)<\/script>/gsv);
if (scriptMatches) {
  scriptMatches.forEach((s, i) => {
    const code = s.replace(/<script.*?>|<\/script>/gsv, '');
    try {
      new (require('vm').Script)(code);
      console.log(`Script ${i} OK`);
    } catch (e) {
      console.log(`Script ${i} Error:`, e.message);
    }
  });
}

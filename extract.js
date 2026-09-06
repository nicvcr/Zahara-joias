const fs = require('fs');
const data = JSON.parse(fs.readFileSync('pdf.json', 'utf8'));
let products = [];

data.Pages.forEach(page => {
    let texts = page.Texts.map(t => ({
        x: t.x,
        y: t.y,
        text: decodeURIComponent(t.R[0].T)
    }));
    
    // Sort by y, then by x
    texts.sort((a, b) => Math.abs(a.y - b.y) < 1 ? a.x - b.x : a.y - b.y);
    
    // Let's find prices first
    const priceRegex = /R\$\s*(\d+,\d{2})/;
    let codeRegex = /-\s*([a-zA-Z0-9_]+)/;
    
    // Group texts that are roughly on the same Y line
    let lines = [];
    let currentLine = [];
    let lastY = -100;
    
    texts.forEach(t => {
        if (t.text.trim() === '') return;
        if (Math.abs(t.y - lastY) > 0.5) {
            if (currentLine.length > 0) lines.push(currentLine);
            currentLine = [t];
            lastY = t.y;
        } else {
            currentLine.push(t);
        }
    });
    if (currentLine.length > 0) lines.push(currentLine);

    // Now find products. Usually a line has "R$ XXX - CODE", and the NEXT line or the same line has the name.
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        line.forEach((item, index) => {
            let combinedText = line.map(l => l.text).join(' ');
            if (priceRegex.test(item.text)) {
                // Find matching code in same item or next items in the same line
                let priceMatch = item.text.match(priceRegex);
                let price = priceMatch[1];
                let code = "";
                let codeMatch = item.text.match(codeRegex);
                if (codeMatch) {
                    code = codeMatch[1];
                } else if (index + 1 < line.length) {
                    let nextItem = line[index+1];
                    let nextCodeMatch = nextItem.text.match(codeRegex) || nextItem.text.match(/^([a-zA-Z0-9_]+)$/);
                    if (nextCodeMatch) code = nextCodeMatch[1];
                }

                // The name is usually in the NEXT line, with a similar X coordinate.
                let name = "";
                for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
                    let nextLine = lines[j];
                    // Find item in next line with similar X
                    let nameItem = nextLine.find(n => Math.abs(n.x - item.x) < 3);
                    if (nameItem && !priceRegex.test(nameItem.text)) {
                        name += nameItem.text.trim() + " ";
                    } else if (name !== "") {
                        break;
                    }
                }
                
                if (name === "") name = "Produto sem nome";

                products.push({
                    nome: name.trim(),
                    preco: parseFloat(price.replace(',', '.')),
                    codigoBarras: code,
                    categoria: "Novidades"
                });
            }
        });
    }
});

console.log(`Found ${products.length} products`);
fs.writeFileSync('produtos.json', JSON.stringify(products, null, 2));

const fs = require('fs');
const file = fs.readFileSync('C:\\Users\\venka\\.gemini\\antigravity\\brain\\5d0b8cb9-01e4-45ec-a34c-7dc7d6239534\\media__1779376044279.jpg');
const base64 = file.toString('base64');
fs.writeFileSync('c:\\Users\\venka\\nl cal\\nl-calculator\\src\\logoBase64.ts', 'export const logoBase64 = "data:image/jpeg;base64,' + base64 + '";\n');

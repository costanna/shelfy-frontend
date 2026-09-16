const fs = require('fs');
const path = require('path');

const PLACEHOLDER = '__GOOGLE_BOOKS_API_KEY__';
const key = process.env.GOOGLE_BOOKS_API_KEY || '';

const files = [path.join(__dirname, '..', 'src', 'environments', 'environment.prod.ts')];

for (const filePath of files) {
  const content = fs.readFileSync(filePath, 'utf8');
  fs.writeFileSync(filePath, content.split(PLACEHOLDER).join(key));
}

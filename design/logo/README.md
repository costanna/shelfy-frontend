# Logo de Shelfy — fuentes

- `logo-mark.svg` — el símbolo solo (sin fondo), usado inline en la navbar
  (`src/app/layout/header/header.html`). Usa `fill="currentColor"`, así que
  hereda el color de `.brand-mark` en CSS (se adapta solo a tema claro/oscuro).
- `icon-tile.svg` — el icono completo con el fondo cuadrado redondeado en
  degradado morado. Fuente de favicon.ico, favicon-16/32.png,
  apple-touch-icon.png, icon-192.png e icon-512.png.
- `icon-tile-maskable.svg` — igual que el anterior pero sin esquinas
  redondeadas propias (el sistema operativo aplica su propia forma de
  recorte). Fuente de icon-maskable-192.png e icon-maskable-512.png.

## Cómo regenerar los PNG si se retoca el SVG

```bash
npm install --no-save sharp
node -e "
const sharp = require('sharp');
const jobs = [
  ['icon-tile.svg', 'icon-192.png', 192],
  ['icon-tile.svg', 'icon-512.png', 512],
  ['icon-tile.svg', 'apple-touch-icon.png', 180],
  ['icon-tile.svg', 'favicon-32.png', 32],
  ['icon-tile.svg', 'favicon-16.png', 16],
  ['icon-tile-maskable.svg', 'icon-maskable-192.png', 192],
  ['icon-tile-maskable.svg', 'icon-maskable-512.png', 512],
];
Promise.all(jobs.map(([src, out, size]) =>
  sharp(src).resize(size, size).png().toFile('../../public/icons/' + out)
)).then(() => console.log('listo'));
"
```

Para `favicon.ico` (necesita un paquete aparte porque sharp no exporta ICO):

```bash
npm install --no-save to-ico
node -e "
const sharp = require('sharp');
const toIco = require('to-ico');
const fs = require('fs');
Promise.all([16,32,48].map(size => sharp('icon-tile.svg').resize(size,size).png().toBuffer()))
  .then(buffers => toIco(buffers))
  .then(buf => fs.writeFileSync('../../public/favicon.ico', buf));
"
```

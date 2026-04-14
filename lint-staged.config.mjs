/** ESLint se ejecuta en el hook con `npm run lint` (proyecto completo). Aquí solo formato rápido. */
export default {
  '*.{md,json,yml,yaml,mjs,cjs,css,html}': ['prettier --write'],
}

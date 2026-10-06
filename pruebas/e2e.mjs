// Prueba de extremo a extremo de SaborUPC 2.0 (equipo Plataforma).
// Requisitos: las seis piezas levantadas (./iniciar.sh) y Playwright (npm i -D playwright; npx playwright install chromium).
// Uso: node pruebas/e2e.mjs
// Sin internet: CDN_ESPEJO=/ruta/con/vue.global.prod.js+lit-core.min.js sirve Vue y Lit desde disco.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const BASE = 'http://localhost:8080';
const CAPTURAS = process.env.CAPTURAS || new URL('../capturas/', import.meta.url).pathname;
let fallos = 0;
function ok(cond, texto) {
  console.log((cond ? '  ✔ ' : '  ✘ ') + texto);
  if (!cond) fallos++;
}

const navegador = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const contexto = await navegador.newContext({ viewport: { width: 1200, height: 800 } });
if (process.env.CDN_ESPEJO) {
  const espejo = { 'unpkg.com/vue@': 'vue.global.prod.js', 'cdn.jsdelivr.net/gh/lit/': 'lit-core.min.js' };
  await contexto.route(/unpkg\.com|cdn\.jsdelivr\.net/, ruta => {
    const clave = Object.keys(espejo).find(k => ruta.request().url().includes(k));
    if (!clave) return ruta.abort();
    ruta.fulfill({ status: 200, contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' },
      body: readFileSync(process.env.CDN_ESPEJO + '/' + espejo[clave]) });
  });
}

function vigilar(pagina) {
  const registro = { errores: [], tiempos: [], descargas: [] };
  pagina.on('pageerror', e => registro.errores.push(e.message));
  pagina.on('console', m => {
    if (m.type() === 'error') registro.errores.push(m.text());
    if (m.text().startsWith('[contenedor]') && m.text().includes('cargado en')) registro.tiempos.push(m.text());
  });
  pagina.on('request', r => registro.descargas.push(r.url()));
  return registro;
}

const pagina = await contexto.newPage();
const reg = vigilar(pagina);

console.log('1. Carga por origen y métricas (req. 7)');
await pagina.goto(BASE);
await pagina.waitForSelector('.cat-tarjeta');
await pagina.waitForFunction(() => customElements.get('mfe-carrito') && customElements.get('mfe-seguimiento'));
const de = (txt) => reg.descargas.some(u => u.includes(txt));
ok(de(':8081/catalogo.js'), 'catalogo.js desde :8081');
ok(de(':8082/carrito.js') && de(':8084/seguimiento.js'), 'carrito.js (:8082) y seguimiento.js (:8084) precargados');
ok(!de('perfil.js'), 'perfil.js todavía no se descarga (bajo demanda)');
ok(de(':8085/tokens.css'), 'tokens.css desde su propio origen :8085');
ok(de('unpkg.com/vue@3') && de('cdn.jsdelivr.net/gh/lit/'), 'Vue 3 (unpkg) y Lit (jsDelivr) desde CDN');
ok(['Catalogo', 'Carrito', 'Seguimiento'].every(n => reg.tiempos.some(t => t.includes(n))), 'consola: tiempo de carga de cada micro frontend');
console.log('     ' + reg.tiempos.join('\n     '));

console.log('2. Catálogo en Vue 3: búsqueda y filtro por categoría');
ok((await pagina.textContent('.cat-version')).includes('Vue 3.'), 'el catálogo se identifica como Vue 3');
await pagina.click('.cat-filtro:has-text("Bebida")');
ok(await pagina.locator('.cat-tarjeta').count() === 2, 'filtro "Bebida" → 2 platos');
await pagina.click('.cat-filtro:has-text("Todas")');
await pagina.fill('.cat-buscar', 'arepa');
ok(await pagina.locator('.cat-tarjeta').count() === 1, 'búsqueda "arepa" → 1 plato');
await pagina.fill('.cat-buscar', '');
await pagina.screenshot({ path: CAPTURAS + '1-catalogo-vue.png' });

console.log('3. Eventos: carrito:agregar → carrito:actualizado → contador');
for (const i of [0, 3, 4]) await pagina.locator('.cat-boton').nth(i).click();
ok(await pagina.textContent('#app-contador') === '3', 'el contador del contenedor marca 3');

console.log('4. Carrito → pedido:confirmado v1.1 → Seguimiento (Lit) → pedido:estado → notificación');
await pagina.click('a[data-ruta="/carrito"]');
await pagina.waitForSelector('mfe-carrito table');
await pagina.selectOption('mfe-carrito select[name="pago"]', 'Tarjeta');
await pagina.screenshot({ path: CAPTURAS + '2-carrito.png' });
await pagina.click('mfe-carrito .confirmar');
ok(await pagina.textContent('#app-contador') === '0', 'al confirmar, el contador vuelve a 0');
await pagina.waitForSelector('.app-toast');
ok((await pagina.textContent('.app-toast')).includes('Recibido'), 'notificación: "Pedido #1: Recibido"');
await pagina.click('a[data-ruta="/pedidos"]');
await pagina.waitForSelector('mfe-seguimiento .pedido');
ok((await pagina.textContent('mfe-seguimiento .pedido')).includes('Tarjeta'), 'Seguimiento muestra el pedido con su método de pago');
ok((await pagina.textContent('mfe-seguimiento .version')).includes('Lit'), 'Seguimiento se identifica como Lit');
await pagina.waitForSelector('mfe-seguimiento .pedido[data-estado="En preparación"]', { timeout: 8000 });
await pagina.waitForSelector('.app-toast:has-text("En preparación")');
ok(true, 'avanza a "En preparación" y el contenedor lo notifica');
await pagina.screenshot({ path: CAPTURAS + '3-seguimiento.png' });
await pagina.waitForSelector('mfe-seguimiento .pedido[data-estado="Entregado"]', { timeout: 15000 });
ok(true, 'llega a "Entregado" sin intervención');

console.log('5. Perfil (Web Component) → usuario:cambio');
await pagina.click('a[data-ruta="/perfil"]');
await pagina.waitForSelector('mfe-perfil form');
await pagina.fill('mfe-perfil input[name="nombre"]', 'Christian');
await pagina.click('mfe-perfil button');
ok(await pagina.textContent('#app-saludo') === 'Hola, Christian', 'el saludo cambia a "Hola, Christian"');
ok(de(':8083/perfil.js'), 'perfil.js se descargó al entrar');

console.log('6. Estado que sobrevive al desmontaje');
await pagina.click('a[data-ruta="/catalogo"]');
await pagina.waitForSelector('.cat-buscar');
await pagina.fill('.cat-buscar', 'jugo');
await pagina.click('a[data-ruta="/pedidos"]');
await pagina.waitForSelector('mfe-seguimiento .pedido');
ok(await pagina.locator('mfe-seguimiento .pedido').count() === 1, 'el pedido sigue en Seguimiento');
await pagina.click('a[data-ruta="/catalogo"]');
await pagina.waitForSelector('.cat-buscar');
ok(await pagina.inputValue('.cat-buscar') === 'jugo', 'el catálogo conserva la búsqueda');
await pagina.fill('.cat-buscar', '');

console.log('7. Sin errores en consola durante el recorrido');
ok(reg.errores.length === 0, reg.errores.length ? 'errores: ' + reg.errores.join(' | ') : 'consola limpia');

console.log('8. Resiliencia: Perfil caído → mensaje + Reintentar');
const caida = await contexto.newPage();
let perfilCaido = true;
await caida.route('http://localhost:8083/**', r => perfilCaido ? r.abort() : r.continue());
await caida.goto(BASE + '/#/perfil');
await caida.waitForSelector('.app-error .app-reintentar');
ok((await caida.textContent('.app-error')).includes('Perfil'), 'mensaje amigable para Perfil');
await caida.screenshot({ path: CAPTURAS + '4-perfil-caido.png' });
await caida.click('a[data-ruta="/catalogo"]');
await caida.waitForSelector('.cat-tarjeta');
ok(true, 'el resto de la aplicación sigue funcionando');
await caida.click('a[data-ruta="/perfil"]');
await caida.waitForSelector('.app-reintentar');
perfilCaido = false;                      // "vuelve a levantar el servidor"
await caida.click('.app-reintentar');
await caida.waitForSelector('mfe-perfil form');
ok(true, 'Reintentar recupera la sección sin recargar la página');
await caida.close();

console.log('9. Despliegue independiente: catálogo v2.0.0 → v2.1.0 sin tocar lo demás');
const demo = await contexto.newPage();
await demo.route('http://localhost:8081/catalogo.js*', async r => {
  const original = await (await r.fetch()).text();
  r.fulfill({ contentType: 'text/javascript', body: original.replace("VERSION = '2.0.0'", "VERSION = '2.1.0'") });
});
await demo.goto(BASE);
await demo.waitForSelector('.cat-version');
ok((await demo.textContent('.cat-version')).includes('v2.1.0'), 'al recargar se ve el catálogo v2.1.0');
await demo.close();

console.log('10. Pruebas de contrato de cada micro frontend (contrato.html)');
for (const [nombre, url] of [['catálogo', 'http://localhost:8081/contrato.html'], ['carrito', 'http://localhost:8082/contrato.html'],
                             ['perfil', 'http://localhost:8083/contrato.html'], ['seguimiento', 'http://localhost:8084/contrato.html']]) {
  const p = await contexto.newPage();
  const r = vigilar(p);
  await p.goto(url);
  await p.waitForFunction(() => window.RESULTADO_CONTRATO, null, { timeout: 15000 });
  const res = await p.evaluate(() => window.RESULTADO_CONTRATO);
  ok(res.pasaron === res.total && r.errores.length === 0, `${nombre}: ${res.pasaron}/${res.total} ✓` + (r.errores.length ? ' errores: ' + r.errores.join(' | ') : ''));
  await p.screenshot({ path: CAPTURAS + `contrato-${nombre}.png`, fullPage: true });
  await p.close();
}

await navegador.close();
console.log(fallos === 0 ? '\nTodas las pruebas pasaron.' : `\n${fallos} prueba(s) fallaron.`);
process.exit(fallos ? 1 : 0);

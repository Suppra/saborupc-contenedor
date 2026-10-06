// Contenedor de SaborUPC 2.0 (equipo Plataforma)
// Responsabilidades: enrutamiento, carga de micro frontends según registro.json,
// resiliencia (mensaje + Reintentar), métricas de carga y notificaciones.
// No importa código de ningún micro frontend: solo conoce el registro y los eventos públicos (CONTRATOS.md).
(function () {
  const RUTA_INICIAL = '/catalogo';
  const ID_RAIZ = 'app-root';
  const raiz = document.getElementById(ID_RAIZ);
  const scripts = {};      // url -> Promise (cada script se descarga una sola vez)
  let registro = {};
  let montado = null;      // entrada del registro montada en este momento
  let turno = 0;           // evita condiciones de carrera si el usuario navega rápido

  // ?origen=publicado usa las URL de internet (GitHub Pages) de los micro frontends que las tengan
  const usarPublicadas = new URLSearchParams(location.search).get('origen') === 'publicado';
  function urlDe(entrada) {
    return (usarPublicadas && entrada.urlPublicada) || entrada.url;
  }

  // 1. Descarga dinámica del bundle de un micro frontend, midiendo cuánto tarda (req. 7)
  function cargarScript(entrada) {
    const url = urlDe(entrada);
    if (!scripts[url]) {
      scripts[url] = new Promise(function (resolve, reject) {
        const inicio = performance.now();
        const s = document.createElement('script');
        if (entrada.modulo) s.type = 'module';   // p. ej. Lit importa desde CDN con import
        s.src = url + '?v=' + Date.now();        // sin caché: vemos cada "despliegue" al recargar
        s.onload = function () {
          const ms = performance.now() - inicio;
          console.info('[contenedor] ' + entrada.nombre + ' cargado en ' + ms.toFixed(1) + ' ms desde ' + new URL(url).origin);
          performance.measure('mfe:' + entrada.nombre, { start: inicio, end: inicio + ms });
          resolve();
        };
        s.onerror = function () {
          const ms = performance.now() - inicio;
          console.warn('[contenedor] ' + entrada.nombre + ' falló tras ' + ms.toFixed(1) + ' ms (' + url + ')');
          delete scripts[url];   // permite reintentar
          s.remove();
          reject(new Error('No se pudo cargar ' + url));
        };
        document.head.appendChild(s);
      });
    }
    return scripts[url];
  }

  // 2. Contrato de montaje / desmontaje (funciones globales o Web Component)
  function montar(entrada) {
    if (entrada.tipo === 'funcion') {
      const render = window['render' + entrada.nombre];
      if (typeof render !== 'function') throw new Error('window.render' + entrada.nombre + ' no existe');
      render(ID_RAIZ);
    } else if (entrada.tipo === 'webcomponent') {
      if (!customElements.get(entrada.etiqueta)) throw new Error('<' + entrada.etiqueta + '> no está definido');
      raiz.appendChild(document.createElement(entrada.etiqueta));
    }
    montado = entrada;
  }

  function desmontarActual() {
    if (montado && montado.tipo === 'funcion') {
      const desmontar = window['unmount' + montado.nombre];
      if (typeof desmontar === 'function') desmontar(ID_RAIZ);
    }
    raiz.innerHTML = '';
    montado = null;
  }

  // 3. Enrutamiento: la URL decide qué micro frontend se muestra
  async function navegar() {
    const miTurno = ++turno;
    const ruta = location.hash.replace('#', '') || RUTA_INICIAL;
    const entrada = registro[ruta];
    marcarEnlaceActivo(ruta);
    desmontarActual();

    if (!entrada) {
      raiz.innerHTML = '<p class="app-aviso">Página no encontrada.</p>';
      return;
    }
    raiz.innerHTML = '<p class="app-aviso">Cargando ' + entrada.nombre + '…</p>';
    try {
      await cargarScript(entrada);
      if (miTurno !== turno) return;   // el usuario ya navegó a otra ruta
      raiz.innerHTML = '';
      montar(entrada);
    } catch (e) {
      if (miTurno !== turno) return;
      mostrarError(entrada);
      console.error(e);
    }
  }

  // 4. Resiliencia (req. 7): mensaje amigable y botón Reintentar; el resto de la app sigue funcionando
  function mostrarError(entrada) {
    raiz.innerHTML =
      '<div class="app-error" role="alert">' +
      '<p>La sección <b>' + entrada.nombre + '</b> no está disponible en este momento. ' +
      'El resto de SaborUPC sigue funcionando.</p>' +
      '<button type="button" class="app-reintentar">Reintentar</button></div>';
    raiz.querySelector('.app-reintentar').addEventListener('click', navegar);
  }

  function marcarEnlaceActivo(ruta) {
    document.querySelectorAll('.app-nav a').forEach(function (a) {
      a.classList.toggle('activo', a.dataset.ruta === ruta);
    });
  }

  // 5. Comunicación: el contenedor solo ESCUCHA eventos públicos (ver CONTRATOS.md)
  window.addEventListener('carrito:actualizado', function (e) {
    document.getElementById('app-contador').textContent = e.detail.cantidad;
  });
  window.addEventListener('usuario:cambio', function (e) {
    document.getElementById('app-saludo').textContent = 'Hola, ' + (e.detail.nombre || 'invitado');
  });
  window.addEventListener('pedido:estado', function (e) {
    notificar('Pedido <b>#' + e.detail.numero + '</b>: ' + e.detail.estado);
  });

  // 6. Notificación breve (toast) que desaparece sola
  function notificar(html) {
    const caja = document.getElementById('app-notificaciones');
    const toast = document.createElement('div');
    toast.className = 'app-toast';
    toast.innerHTML = html;
    caja.appendChild(toast);
    setTimeout(function () { toast.remove(); }, 3500);
  }

  // 7. Arranque: leer el registro, precargar lo que lo requiera y navegar
  fetch('registro.json', { cache: 'no-store' })
    .then(function (r) {
      if (!r.ok) throw new Error('registro.json respondió ' + r.status);
      return r.json();
    })
    .then(function (datos) {
      registro = datos;
      Object.values(registro)
        .filter(function (m) { return m.precargar; })
        .forEach(function (m) { cargarScript(m).catch(console.error); });
      window.addEventListener('hashchange', navegar);
      navegar();
    })
    .catch(function (e) {
      raiz.innerHTML = '<p class="app-error">No se pudo leer el registro de micro frontends.</p>';
      console.error(e);
    });
})();

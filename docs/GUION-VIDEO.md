# Guion del video (máximo 5 minutos)

Preparación: los seis repositorios clonados uno al lado del otro, `bash iniciar.sh` corriendo, el navegador en
http://localhost:8080 con F12 abierto en **Red / Network** ("Disable cache" activado) y la pestaña **Consola** a mano.
Cada integrante presenta la parte de su equipo.

| Tiempo | Quién | Qué mostrar | Qué decir |
|---|---|---|---|
| 0:00 – 0:30 | Mario | La app y el README (tabla de repositorios) | Seis repositorios, tres equipos, cada pieza en su propio origen. |
| 0:30 – 1:15 | Mario | Pestaña Red filtrada por JS: `catalogo.js` (:8081), `carrito.js` (:8082), `seguimiento.js` (:8084), `tokens.css` (:8085), Vue desde unpkg y Lit desde jsDelivr. Luego la Consola con `[contenedor] … cargado en … ms`. | Carga en tiempo de ejecución por origen; perfil.js aún no se descarga. Métricas con `performance.now()`. |
| 1:15 – 2:00 | Camilo | Catálogo: buscar "arepa", filtrar "Bebida", agregar tres platos; el contador cambia. Mostrar la versión "Vue 3.x" y `contrato.html` del catálogo en :8081. | Catálogo reescrito en Vue 3 sin compilar, con el mismo contrato `renderCatalogo`. Publica `carrito:agregar` v1.0. |
| 2:00 – 3:00 | Christian | Carrito: elegir "Nequi" y confirmar. Ir a "Mis pedidos": los estados avanzan solos y aparecen las notificaciones abajo a la derecha. Mostrar `seguimiento/contrato.html` (compatibilidad v1.0 y v1.1). | Seguimiento en Lit. `pedido:confirmado` subió a la v1.1 con `metodoPago`, y un consumidor de la v1.0 sigue funcionando. |
| 3:00 – 3:45 | Mario | En la terminal de Perfil, Ctrl + C. Ir a Perfil: mensaje y botón **Reintentar**; Catálogo y Carrito siguen funcionando. Levantar de nuevo el servidor y pulsar Reintentar. | Resiliencia: un micro frontend caído no tumba la aplicación. |
| 3:45 – 4:40 | Camilo | **Despliegue independiente en vivo**: con la app abierta y un pedido avanzando, editar `saborupc-catalogo/catalogo.js` (`VERSION = '2.1.0'`, color del botón o un plato nuevo), guardar y recargar. Opcional: `git commit` + `git push` en su repositorio. | Solo cambió el repositorio del catálogo; nadie reinició los otros servidores. No hay *lockstep release*. |
| 4:40 – 5:00 | Christian | http://localhost:8080/?origen=publicado y en Red `seguimiento.js` desde `suppra.github.io`. | Un micro frontend ya está publicado en internet y el contenedor lo integra igual. |

Consejo: ensayen una vez con cronómetro. Si el tiempo no alcanza, recorten la parte de `contrato.html` y
mencionen que `npm test` las ejecuta todas.

# Contratos de SaborUPC 2.0

Este archivo es el **contrato público entre equipos**. Ningún micro frontend importa código de otro: se integran solo
por lo que está escrito aquí. Lo mantiene el equipo Plataforma; cualquier cambio se propone con un Pull Request a
`saborupc-contenedor` y lo aprueban los equipos afectados.

## 1. Contratos de montaje

| Micro frontend | Equipo | Tecnología | Contrato | Origen local |
|---|---|---|---|---|
| Catálogo | Descubrimiento | Vue 3 (CDN) | `window.renderCatalogo(idContenedor)` / `window.unmountCatalogo(idContenedor)` | `http://localhost:8081/catalogo.js` |
| Carrito | Pedidos | JS puro | etiqueta `<mfe-carrito>` | `http://localhost:8082/carrito.js` |
| Seguimiento | Pedidos | Lit (CDN, módulo ES) | etiqueta `<mfe-seguimiento>` | `http://localhost:8084/seguimiento.js` |
| Perfil | Plataforma | JS puro | etiqueta `<mfe-perfil>` | `http://localhost:8083/perfil.js` |

- `renderX` puede devolver una promesa (el catálogo espera a que Vue cargue). `unmountX` debe dejar vacío el contenedor.
- Los Web Components deben funcionar si se crean, se retiran y se vuelven a crear (`connectedCallback` / `disconnectedCallback`).
- Los micro frontends que deben escuchar eventos sin estar en pantalla se marcan con `"precargar": true` en `registro.json`.

## 2. Eventos

Todos viajan por `window` como `CustomEvent`. Quien publica no sabe quién escucha.

| Evento | Versión | Publicador | Consumidores | `detail` |
|---|---|---|---|---|
| `carrito:agregar` | 1.0 | Catálogo | Carrito | `{ version, id: number, nombre: string, precio: number }` |
| `carrito:actualizado` | 1.0 | Carrito | Contenedor (contador) | `{ version, cantidad: number, total: number }` |
| `pedido:confirmado` | **1.1** | Carrito | Seguimiento | `{ version, id: string, fecha: ISO-8601, items: [{ id, nombre, precio, cantidad }], total: number, metodoPago: string }` |
| `pedido:estado` | 1.0 | Seguimiento | Contenedor (notificación) | `{ version, id: string, numero: number, estado: string, estadoAnterior: string \| null }` |
| `usuario:cambio` | 1.0 | Perfil | Contenedor (saludo) | `{ version, nombre: string }` |

Valores de `pedido:estado.estado`, en orden: `Recibido` → `En preparación` → `En camino` → `Entregado`.

## 3. Reglas de versionado

1. Cada `detail` lleva `version` con formato `MAYOR.MENOR`.
2. **Cambio menor** (sube MENOR): solo se **agregan** campos opcionales. Nunca se quitan ni se renombran. Los consumidores
   de la versión anterior deben seguir funcionando.
3. **Cambio mayor** (sube MAYOR): quitar, renombrar o cambiar el tipo de un campo. Se publica un evento nuevo
   (`pedido:confirmado.v2`) y el anterior convive durante al menos una entrega, hasta que todos los consumidores migren.
4. **Lector tolerante:** los consumidores leen solo los campos que necesitan e ignoran los que no conocen.

## 4. Historial de cambios

| Evento | Versión | Cambio | Compatibilidad |
|---|---|---|---|
| `pedido:confirmado` | 1.0 | Primera versión: `{ version, id, fecha, items, total }`. | — |
| `pedido:confirmado` | 1.1 | Se agrega `metodoPago` (`Efectivo`, `Tarjeta` o `Nequi`). | Hacia atrás: Seguimiento acepta la 1.0 y la 1.1 (lo verifica `saborupc-seguimiento/contrato.html`), y el Carrito acepta `carrito:agregar` con campos extra (lo verifica `saborupc-carrito/contrato.html`). |
| Todos | 1.0 | Se agrega `version` a todos los `detail` respecto al taller. | Hacia atrás: ningún consumidor del taller leía `version`. |

## 5. Pruebas de contrato

Cada repositorio de micro frontend tiene `contrato.html`, que sin el contenedor muestra ✓/✗ (y usa `console.assert`) para:
las funciones o etiqueta expuestas, que el montaje genera contenido, y que los eventos publicados tienen esta estructura.
`npm test` en este repositorio las ejecuta todas junto con el recorrido completo.

## 6. Sistema de diseño

`tokens.css` (repositorio `saborupc-tokens`, origen `:8085`) solo define variables `--sabor-*` de color, tipografía y
espaciado. Cada micro frontend las usa con `var(--sabor-…, valorPorDefecto)` para seguir viéndose bien si ese origen cae.

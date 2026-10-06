#!/usr/bin/env bash
# Levanta las seis piezas de SaborUPC 2.0, cada una en su propio origen (Ctrl + C detiene todo).
# Supone los repositorios clonados uno al lado del otro:
#   saborupc-contenedor/  saborupc-tokens/  saborupc-catalogo/  saborupc-carrito/  saborupc-perfil/  saborupc-seguimiento/
cd "$(dirname "$0")/.."
PY=$(command -v python3 || command -v python)
PIEZAS="saborupc-contenedor:8080 saborupc-catalogo:8081 saborupc-carrito:8082 saborupc-perfil:8083 saborupc-seguimiento:8084 saborupc-tokens:8085"
PIDS=()
for pieza in $PIEZAS; do
  carpeta=${pieza%%:*}; puerto=${pieza##*:}
  if [ ! -d "$carpeta" ]; then echo "Falta $carpeta (clónelo junto a saborupc-contenedor)"; continue; fi
  if [ -f "$carpeta/servidor.py" ]; then
    (cd "$carpeta" && exec "$PY" servidor.py "$puerto") > /dev/null 2>&1 &
  else
    (cd "$carpeta" && exec "$PY" -m http.server "$puerto") > /dev/null 2>&1 &
  fi
  PIDS+=($!)
  echo "$carpeta → http://localhost:$puerto"
done
trap 'kill "${PIDS[@]}" 2>/dev/null' EXIT INT TERM
echo "Abra http://localhost:8080   (Ctrl + C para detener)"
wait

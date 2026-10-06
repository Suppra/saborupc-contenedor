@echo off
REM Abre una ventana por equipo. Supone los repositorios clonados uno al lado del otro.
cd /d "%~dp0\.."
start "contenedor 8080"   cmd /k "cd saborupc-contenedor && py -m http.server 8080"
start "catalogo 8081"     cmd /k "cd saborupc-catalogo && py -m http.server 8081"
start "carrito 8082"      cmd /k "cd saborupc-carrito && py -m http.server 8082"
start "perfil 8083"       cmd /k "cd saborupc-perfil && py -m http.server 8083"
start "seguimiento 8084"  cmd /k "cd saborupc-seguimiento && py servidor.py 8084"
start "tokens 8085"       cmd /k "cd saborupc-tokens && py -m http.server 8085"
echo Abra http://localhost:8080

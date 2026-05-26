@echo off
title Slide Competition Manager
color 0B

echo ========================================================
echo        INICIANDO SLIDE COMPETITION MANAGER
echo ========================================================
echo.

:: Detectar en qué carpeta estamos y cambiarse a la correcta
set "CURRENT_DIR=%~dp0"
cd /d "%CURRENT_DIR%"

if exist "slide_temp" (
    echo [Sistema] Carpeta 'slide_temp' detectada. Entrando...
    cd "slide_temp"
)

:: 1. Abrir el navegador por defecto en el puerto de la aplicación
echo [1/2] Abriendo interfaz de competencias en tu navegador...
start "" "http://localhost:3005"
timeout /t 1 /nobreak >nul

:: 2. Iniciar el servidor Node.js directamente
echo [2/2] Iniciando el servidor en tiempo real...
echo.
echo ========================================================
echo  ¡IMPORTANTE! Deja esta ventana abierta.
echo  Si la cierras, el programa se apagará.
echo ========================================================
echo.

node server/server.js
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo ❌ ERROR: No se pudo iniciar el servidor.
    echo.
    echo Posibles causas:
    echo 1. Node.js no está instalado (descárgalo de https://nodejs.org/).
    echo 2. El puerto 3005 ya está ocupado por otra instancia del servidor.
    echo.
    pause
)

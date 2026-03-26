@echo off
REM Iniciar servidor de Slide Battle
REM ==================================

echo ========================================
echo   SLIDE BATTLE - Servidor Local
echo ========================================
echo.

cd /d "%~dp0server"

echo [1/3] Verificando dependencias...
if not exist "node_modules" (
    echo [ERROR] node_modules no encontrado. Instalando dependencias...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Fallo al instalar dependencias
        pause
        exit /b 1
    )
) else (
    echo [OK] Dependencias encontradas
)

echo.
echo [2/3] Verificando archivo .env...
if not exist ".env" (
    echo [WARNING] Archivo .env no encontrado
    echo [INFO] Usando credenciales por defecto:
    echo   - Juez 1: Slide / slide2026
    echo   - Juez 2: juez2 / slide
    echo   - Juez 3: juez3 / slide
) else (
    echo [OK] Archivo .env encontrado
)

echo.
echo [3/3] Iniciando servidor...
echo.
echo ========================================
echo   Servidor corriendo en:
echo   http://localhost:3005
echo ========================================
echo.
echo Presiona CTRL+C para detener
echo.

REM Iniciar servidor
node server.js

pause

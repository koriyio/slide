@echo off
title Servidor Slide Competition
:inicio
cls
echo ==========================================
echo    SERVIDOR SLIDE COMPETITION ACTIVE
echo ==========================================
echo.
echo Para que los jueces se conecten, diles que usen:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set IP=%%a
)
set IP=%IP: =%
echo http://%IP%:3005
echo.
echo (No cierres esta ventana durante la competencia)
echo.
cd /d "%~dp0server"
node server.js
echo.
echo El servidor se detuvo. Reiniciando en 5 segundos...
timeout /t 5
goto inicio

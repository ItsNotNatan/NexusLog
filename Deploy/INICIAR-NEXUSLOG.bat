@echo off
title NexusLog - Auto-Deploy
setlocal enableextensions
set "BASE=%~dp0"
set "REPO_URL=https://github.com/ItsNotNatan/NexusLog.git"
set "APPDIR=%BASE%NexusLog-Sistema"

echo ============================================================
echo   NexusLog - Inicializador do Auto-Deploy
echo ============================================================
echo.

rem --- Avisa se esta rodando de dentro de um clone do proprio repo ---
rem (nesse caso ele clonaria o repositorio dentro dele mesmo)
if exist "%BASE%..\Servidor\server.js" (
  echo [AVISO] Esta pasta Deploy parece estar DENTRO de um clone do NexusLog.
  echo         O certo e' COPIAR a pasta "Deploy" para um lugar proprio,
  echo         por exemplo:  C:\NexusLog\
  echo         Assim o codigo, o banco e os backups ficam bem separados.
  echo.
  choice /c SN /m "Continuar mesmo assim"
  if errorlevel 2 exit /b 0
  echo.
)

rem --- Administrador (aviso) ---
net session >nul 2>&1
if errorlevel 1 (echo [AVISO] Rode como Administrador para as regras de firewall funcionarem.) else (echo [OK] Administrador)

rem --- Node.js ---
where node >nul 2>&1
if errorlevel 1 (
  echo [..] Node.js nao encontrado. Tentando instalar via winget...
  winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
)
where node >nul 2>&1
if errorlevel 1 ( echo [ERRO] Node.js nao encontrado. Instale o Node 18+ em https://nodejs.org e rode de novo. & pause & exit /b 1 )
for /f "delims=" %%v in ('node -v') do echo [OK] Node %%v

rem --- Git ---
where git >nul 2>&1
if errorlevel 1 (
  echo [..] Git nao encontrado. Tentando instalar via winget...
  winget install --id Git.Git -e --accept-source-agreements --accept-package-agreements
)
where git >nul 2>&1
if errorlevel 1 ( echo [ERRO] Git nao encontrado. Instale o Git em https://git-scm.com e rode de novo. & pause & exit /b 1 )
for /f "delims=" %%v in ('git --version') do echo [OK] %%v

rem --- Firewall ---
rem Portas proprias do NexusLog. O ATMLog usa 3001/8080/8082/8091 nesta
rem mesma maquina, por isso aqui sao outras.
call :fw NexusLog-PB-8092 8092
call :fw NexusLog-API-3002 3002
call :fw NexusLog-Front-8083 8083

rem --- Clonar (1a vez) ou usar o existente ---
if not exist "%APPDIR%\.git" (
  echo [..] Clonando o repositorio do GitHub...
  git clone "%REPO_URL%" "%APPDIR%"
  if errorlevel 1 ( echo [ERRO] Falha ao clonar o repositorio. Verifique a internet. & pause & exit /b 1 )
  echo [OK] Repositorio clonado em: %APPDIR%
) else (
  echo [OK] Repositorio ja existe. Sincronizando com o GitHub...
  cd /d "%APPDIR%"
  git fetch origin
  git reset --hard origin/main
)

echo.
echo [..] Iniciando o AUTO-DEPLOY (PocketBase + Servidor + vigia de commits)...
echo     ^(A primeira vez baixa o PocketBase, instala dependencias e builda - pode levar alguns minutos.^)
echo.
cd /d "%APPDIR%"
node "%BASE%auto-deploy.js"

echo.
echo (o auto-deploy foi encerrado)
pause
exit /b

rem ===================== SUB-ROTINA =====================
:fw
netsh advfirewall firewall show rule name="%~1" >nul 2>&1
if errorlevel 1 (
  netsh advfirewall firewall add rule name="%~1" dir=in action=allow protocol=TCP localport=%~2 >nul 2>&1
  echo [OK] firewall: regra %~1 criada
) else (
  echo [OK] firewall: regra %~1 ja existe
)
exit /b

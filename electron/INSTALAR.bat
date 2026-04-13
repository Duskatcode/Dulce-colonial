@echo off
setlocal enabledelayedexpansion

set "BASE_DIR=%~dp0"
set "ENV_FILE=%BASE_DIR%.env"
set "RESOURCES_DIR=%BASE_DIR%resources"
set "BACKEND_DIR=%RESOURCES_DIR%\backend"
set "BACKEND_ENV=%BACKEND_DIR%\.env"
set "APP_EXE=%BASE_DIR%Dulce Colonial.exe"
set "PG_HOST=127.0.0.1"
set "PG_PORT=5432"
set "EXIT_CODE=0"

cd /d "%BASE_DIR%"
if errorlevel 1 (
  echo [ERROR] No es posible acceder a la carpeta de instalacion: %BASE_DIR%
  set "EXIT_CODE=1"
  goto END
)

echo.
echo ==============================================
echo Instalador Dulce Colonial - Cliente final
echo ==============================================
echo.

REM Validate required files
if not exist "%ENV_FILE%" (
  echo [ERROR] No se encontro el archivo de configuracion: %ENV_FILE%
  set "EXIT_CODE=1"
  goto END
)

if not exist "%BACKEND_DIR%" (
  echo [ERROR] No se encontro el backend empaquetado en: %BACKEND_DIR%
  set "EXIT_CODE=1"
  goto END
)

if not exist "%APP_EXE%" (
  echo [ERROR] No se encontro el ejecutable de Dulce Colonial: %APP_EXE%
  set "EXIT_CODE=1"
  goto END
)

REM Copy env file into backend folder
echo Configurando entorno del servidor...
copy /Y "%ENV_FILE%" "%BACKEND_ENV%" >nul
if errorlevel 1 (
  echo [ERROR] No se pudo copiar el archivo .env hacia %BACKEND_ENV%.
  set "EXIT_CODE=1"
  goto END
)
echo [OK] Archivo .env disponible para el backend.

REM Locate pg_isready
set "PG_ISREADY="
for /f "delims=" %%I in ('where pg_isready 2^>nul') do (
  if not defined PG_ISREADY (
    set "PG_ISREADY=%%~fI"
  )
)

if not defined PG_ISREADY (
  for %%P in (
    "C:\Program Files\PostgreSQL\18\bin\pg_isready.exe"
    "C:\Program Files\PostgreSQL\17\bin\pg_isready.exe"
    "C:\Program Files\PostgreSQL\16\bin\pg_isready.exe"
    "C:\Program Files\PostgreSQL\15\bin\pg_isready.exe"
    "C:\Program Files\PostgreSQL\14\bin\pg_isready.exe"
  ) do (
    if not defined PG_ISREADY (
      if exist %%~P (
        set "PG_ISREADY=%%~P"
      )
    )
  )
)

if not defined PG_ISREADY (
  echo [ERROR] No se encontro pg_isready. Instala PostgreSQL 18-14 o agrega pg_isready al PATH.
  set "EXIT_CODE=1"
  goto END
)
echo [OK] pg_isready encontrado: %PG_ISREADY%

REM Check PostgreSQL availability
set /a PG_RETRIES=10
:CHECK_PG
call "%PG_ISREADY%" -h %PG_HOST% -p %PG_PORT% >nul 2>&1
set "PG_READY_CODE=%ERRORLEVEL%"
if "%PG_READY_CODE%"=="0" goto PG_READY
set /a PG_RETRIES-=1
if !PG_RETRIES! LEQ 0 (
  echo [ERROR] PostgreSQL no respondio en %PG_HOST%:%PG_PORT%. Codigo devuelto: %PG_READY_CODE%.
  set "EXIT_CODE=1"
  goto END
)
echo [INFO] PostgreSQL aun no responde (codigo %PG_READY_CODE%). Intentos restantes: !PG_RETRIES!.
timeout /t 3 /nobreak >nul
goto CHECK_PG

:PG_READY
echo [OK] PostgreSQL responde en %PG_HOST%:%PG_PORT%.

REM Launch application
echo Iniciando Dulce Colonial...
start "" "%APP_EXE%"
if errorlevel 1 (
  echo [ERROR] No se pudo iniciar el ejecutable de Dulce Colonial.
  set "EXIT_CODE=1"
  goto END
)
echo [OK] Dulce Colonial se esta iniciando. Esta ventana puede cerrarse.

:END
if not "%EXIT_CODE%"=="0" (
  echo.
  echo El proceso finalizo con errores. Revisa los mensajes anteriores.
)
echo.
pause
endlocal & exit /b %EXIT_CODE%

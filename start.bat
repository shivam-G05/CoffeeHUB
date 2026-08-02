@echo off
setlocal

echo Checking Docker...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo Starting Docker Desktop, this can take a minute...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"

    :waitdocker
    timeout /t 3 /nobreak >nul
    docker info >nul 2>&1
    if %errorlevel% neq 0 goto waitdocker
)
echo Docker is ready.

echo Starting backend + database...
cd /d "%~dp0"
docker compose up -d

echo Waiting for backend to respond...
:waitbackend
timeout /t 2 /nobreak >nul
curl -s -o nul -w "" http://localhost:8080/api/products
if %errorlevel% neq 0 goto waitbackend
echo Backend is ready at http://localhost:8080

echo Starting frontend...
cd /d "%~dp0frontend"
start "CoffeeHub Frontend" cmd /k npm run dev

echo.
echo All set. Once the frontend window shows "ready", open http://localhost:5173
pause

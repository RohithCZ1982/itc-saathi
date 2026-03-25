@echo off
echo Starting ITC Saathi locally...

:: Kill any existing Node processes on port 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)

cd /d "%~dp0"
npm run dev

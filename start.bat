@echo off
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3457" ^| findstr "LISTENING"') do taskkill /PID %%a /F >nul 2>&1
timeout /t 1 /nobreak >nul
echo Starting Mimo API on port 3457...
start /b node server.js
timeout /t 3 /nobreak >nul
echo API is running: http://localhost:3457

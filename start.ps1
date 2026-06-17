$ErrorActionPreference = "SilentlyContinue"
$p = netstat -ano | Select-String ":3457" | Select-String "LISTENING"
foreach ($id in ($p | ForEach-Object { ($_ -split '\s+')[-1] } | Select-Object -Unique)) { taskkill /PID $id /F | Out-Null }
Start-Sleep 1
Write-Host "Starting Mimo API on port 3457..."
Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $PSScriptRoot -NoNewWindow
Start-Sleep 2
$health = curl -s http://localhost:3457/health
if ($health) { Write-Host "API is running: http://localhost:3457" -ForegroundColor Green }
else { Write-Host "Failed to start" -ForegroundColor Red }

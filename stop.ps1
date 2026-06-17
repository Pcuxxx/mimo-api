$ErrorActionPreference = "SilentlyContinue"
$p = netstat -ano | Select-String ":3457" | Select-String "LISTENING"
foreach ($id in ($p | ForEach-Object { ($_ -split '\s+')[-1] } | Select-Object -Unique)) { taskkill /PID $id /F | Out-Null }
Write-Host "Mimo API stopped." -ForegroundColor Yellow

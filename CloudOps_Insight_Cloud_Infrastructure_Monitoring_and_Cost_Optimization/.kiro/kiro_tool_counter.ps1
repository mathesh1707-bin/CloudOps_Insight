# Kironomics — increment tool-call counter (runs after every tool use)
$dir  = "C:\tmp"
$file = "$dir\kironomics_tools"
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
$n = 0
if (Test-Path $file) { try { $n = [int](Get-Content $file -Raw) } catch {} }
Set-Content -Path $file -Value ($n + 1)

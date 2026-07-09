# Kironomics — increment prompt counter + record session start time
$dir    = "C:\tmp"
$start  = "$dir\kironomics_start"
$pfile  = "$dir\kironomics_prompts"
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }

# Record start time only on first prompt of the session
if (-not (Test-Path $start)) {
    $epoch = [int][Math]::Floor(([datetime]::UtcNow - [datetime]'1970-01-01T00:00:00Z').TotalSeconds)
    Set-Content -Path $start -Value $epoch
}

$n = 0
if (Test-Path $pfile) { try { $n = [int](Get-Content $pfile -Raw) } catch {} }
Set-Content -Path $pfile -Value ($n + 1)

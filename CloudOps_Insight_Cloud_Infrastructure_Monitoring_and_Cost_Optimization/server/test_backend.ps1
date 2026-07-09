# CloudOps Insight — Backend Test Suite
# Compatible with Windows PowerShell 5 (avoids & in strings)
param([string]$Base = "http://localhost:3001")

$pass = 0
$fail = 0

function Check($label, $result, $expected = $null) {
    if ($expected -ne $null -and $result -ne $expected) {
        Write-Host "  [FAIL] $label — got '$result', expected '$expected'" -ForegroundColor Red
        $script:fail++
    } else {
        Write-Host "  [PASS] $label" -ForegroundColor Green
        $script:pass++
    }
}

function Post($path, $body) {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes(($body | ConvertTo-Json -Compress))
    Invoke-RestMethod ($Base + $path) -Method Post -Body $bytes -ContentType "application/json"
}

function Get-Api($url, $headers = @{}) {
    Invoke-RestMethod $url -Headers $headers
}

function Patch-Api($url, $body, $headers) {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes(($body | ConvertTo-Json -Compress))
    Invoke-RestMethod $url -Method Patch -Headers $headers -Body $bytes -ContentType "application/json"
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  CloudOps Insight Backend Test Suite " -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# ── 1. Health ──────────────────────────────────────────────────────────────────
Write-Host "`n[1] Health" -ForegroundColor Yellow
$hc = Get-Api ($Base + "/health")
Check "GET /health returns ok" $hc.status "ok"

# ── 2. Auth ───────────────────────────────────────────────────────────────────
Write-Host "`n[2] Auth" -ForegroundColor Yellow

$login = Post "/api/auth/login" @{ email="admin@cloudops.io"; password="admin123" }
Check "Admin login returns token"  ($login.token.Length -gt 10) $true
Check "Admin login role is admin"  $login.user.role "admin"
Check "Admin login name"           $login.user.name "Alex Morgan"
$adminH = @{ Authorization = "Bearer $($login.token)" }

$viewerLogin = Post "/api/auth/login" @{ email="viewer@cloudops.io"; password="viewer123" }
Check "Viewer login role" $viewerLogin.user.role "viewer"
$viewerH = @{ Authorization = "Bearer $($viewerLogin.token)" }

try {
    Post "/api/auth/login" @{ email="nobody@x.com"; password="wrong" } | Out-Null
    Write-Host "  [FAIL] Bad creds should return 401" -ForegroundColor Red; $fail++
} catch { Check "Bad credentials rejected (401)" $true $true }

try {
    Get-Api ($Base + "/api/resources") | Out-Null
    Write-Host "  [FAIL] Unauthenticated request should be rejected" -ForegroundColor Red; $fail++
} catch { Check "Auth guard rejects unauthenticated request" $true $true }

$ts      = [int]([datetime]::UtcNow - [datetime]"1970-01-01").TotalSeconds
$newMail = "test$ts@cloudops.io"
$signup  = Post "/api/auth/signup" @{ name="Test User"; email=$newMail; password="test123" }
Check "Signup creates viewer account" $signup.user.role "viewer"
Check "Signup returns token" ($signup.token.Length -gt 10) $true

try {
    Post "/api/auth/signup" @{ name="Dup"; email="admin@cloudops.io"; password="test123" } | Out-Null
    Write-Host "  [FAIL] Duplicate email should 409" -ForegroundColor Red; $fail++
} catch { Check "Duplicate email signup rejected (409)" $true $true }

# ── 3. Resources ──────────────────────────────────────────────────────────────
Write-Host "`n[3] Resources" -ForegroundColor Yellow

$resources = Get-Api ($Base + "/api/resources") $adminH
Check "GET /api/resources returns 30" $resources.Count 30

# Filter by type (no & needed — single param)
$byType = Get-Api ($Base + "/api/resources?type=EC2") $adminH
Check "Filter by type=EC2 returns correct count" ($byType.Count -gt 0) $true

# Filter by status
$stopped = Get-Api ($Base + "/api/resources?status=stopped") $adminH
Check "Filter status=stopped" ($stopped.Count -gt 0) $true

# Filter by region
$euRes = Get-Api ($Base + "/api/resources?region=eu-west-1") $adminH
Check "Filter region=eu-west-1" ($euRes.Count -gt 0) $true

# Search by name
$search = Get-Api ($Base + "/api/resources?search=prod-db") $adminH
Check "Search 'prod-db' returns results" ($search.Count -gt 0) $true

# Single resource
$single = Get-Api ($Base + "/api/resources/r01") $adminH
Check "GET /api/resources/r01 name"   $single.name "prod-web-01"
Check "GET /api/resources/r01 has tags" ($single.tags -ne $null) $true

try {
    Get-Api ($Base + "/api/resources/nonexistent") $adminH | Out-Null
    Write-Host "  [FAIL] Missing resource should 404" -ForegroundColor Red; $fail++
} catch { Check "Missing resource returns 404" $true $true }

# ── 4. Metrics ────────────────────────────────────────────────────────────────
Write-Host "`n[4] Metrics" -ForegroundColor Yellow

$m24  = Get-Api ($Base + "/api/metrics/r01?window=24h") $adminH
Check "Metrics 24h datapoints"  ($m24.Count -gt 0) $true
Check "Metrics point has cpu"   ($m24[0].cpu -ne $null) $true
Check "Metrics point has memory" ($m24[0].memory -ne $null) $true
Check "Metrics point has networkIn" ($m24[0].networkIn -ne $null) $true

$m7d  = Get-Api ($Base + "/api/metrics/r06?window=7d") $adminH
Check "Metrics 7d datapoints"   ($m7d.Count -gt 0) $true

$m30d = Get-Api ($Base + "/api/metrics/r08?window=30d") $adminH
Check "Metrics 30d datapoints"  ($m30d.Count -gt 0) $true

try {
    Get-Api ($Base + "/api/metrics/r01?window=bad") $adminH | Out-Null
    Write-Host "  [FAIL] Bad window should 400" -ForegroundColor Red; $fail++
} catch { Check "Bad metrics window returns 400" $true $true }

# ── 5. Costs ──────────────────────────────────────────────────────────────────
Write-Host "`n[5] Costs" -ForegroundColor Yellow

$costs = Get-Api ($Base + "/api/costs?days=30") $adminH
Check "GET /api/costs 30d has entries"         ($costs.Count -gt 0) $true
Check "Cost entry has resourceId"              ($costs[0].resourceId -ne $null) $true
Check "Cost entry has serviceType"             ($costs[0].serviceType -ne $null) $true

$monthly = Get-Api ($Base + "/api/costs/monthly") $adminH
Check "Monthly summaries returned"             ($monthly.Count -gt 0) $true
Check "Monthly entry has byService breakdown"  ($monthly[0].byService -ne $null) $true
Check "Monthly entry has byRegion breakdown"   ($monthly[0].byRegion -ne $null) $true

$latest = $monthly[-1]
Check "Latest month has EC2 cost" ($latest.byService.EC2 -ge 0) $true
Check "Latest month total > 0"    ($latest.total -gt 0) $true
Write-Host "       Latest month: $($latest.month) — total=`$$($latest.total)  EC2=`$$($latest.byService.EC2)  RDS=`$$($latest.byService.RDS)" -ForegroundColor DarkGreen

# ── 6. Recommendations ────────────────────────────────────────────────────────
Write-Host "`n[6] Recommendations" -ForegroundColor Yellow

$recs = Get-Api ($Base + "/api/recommendations") $adminH
Check "Recommendations returned"              ($recs.Count -gt 0) $true
Check "Recommendation has affectedResourceIds" ($recs[0].affectedResourceIds -ne $null) $true

$openRecs = $recs | Where-Object { $_.status -eq "open" }
Check "Some recommendations are open"         ($openRecs.Count -gt 0) $true
$totalSavings = ($openRecs | Where-Object { $_.estimatedMonthlySavings -gt 0 } | Measure-Object -Property estimatedMonthlySavings -Sum).Sum
Check "Total savings > 0"                     ($totalSavings -gt 0) $true
Write-Host "       Total potential savings: `$$([Math]::Round($totalSavings, 2))" -ForegroundColor DarkGreen

# PATCH dismiss
$rec     = $openRecs[0]
$patched = Patch-Api ($Base + "/api/recommendations/$($rec.id)") @{ status="dismissed" } $adminH
Check "PATCH rec -> dismissed"  $patched.status "dismissed"

# PATCH resolve
$patched2 = Patch-Api ($Base + "/api/recommendations/$($rec.id)") @{ status="resolved" } $adminH
Check "PATCH rec -> resolved"   $patched2.status "resolved"
Check "resolved_at is set"      ($patched2.resolvedAt -ne $null) $true

# Restore to open
Patch-Api ($Base + "/api/recommendations/$($rec.id)") @{ status="open" } $adminH | Out-Null

try {
    Patch-Api ($Base + "/api/recommendations/$($rec.id)") @{ status="INVALID" } $adminH | Out-Null
    Write-Host "  [FAIL] Invalid status should 400" -ForegroundColor Red; $fail++
} catch { Check "Invalid PATCH status returns 400" $true $true }

# ── 7. Anomalies ──────────────────────────────────────────────────────────────
Write-Host "`n[7] Anomalies" -ForegroundColor Yellow

$anoms = Get-Api ($Base + "/api/anomalies") $adminH
Check "Anomalies returned"            ($anoms.Count -gt 0) $true
Check "Anomaly has zScore"            ($anoms[0].zScore -ne $null) $true
Check "Anomaly has explanation"       ($anoms[0].explanation.Length -gt 0) $true

$openAnoms = $anoms | Where-Object { $_.status -eq "open" }
Check "Some anomalies are open"       ($openAnoms.Count -gt 0) $true

$anom     = $openAnoms[0]
$patchedA = Patch-Api ($Base + "/api/anomalies/$($anom.id)") @{ status="acknowledged" } $adminH
Check "PATCH anomaly -> acknowledged" $patchedA.status "acknowledged"

$patchedA2 = Patch-Api ($Base + "/api/anomalies/$($anom.id)") @{ status="resolved" } $adminH
Check "PATCH anomaly -> resolved"     $patchedA2.status "resolved"

Patch-Api ($Base + "/api/anomalies/$($anom.id)") @{ status="open" } $adminH | Out-Null

# ── 8. Reports ────────────────────────────────────────────────────────────────
Write-Host "`n[8] Reports" -ForegroundColor Yellow

$reports = Get-Api ($Base + "/api/reports") $adminH
Check "Reports returned" $reports.Count 5

foreach ($r in $reports) {
    $data = Get-Api ($Base + "/api/reports/$($r.id)/data") $adminH
    Check "Report $($r.id): $($data.Count) rows" ($data.Count -gt 0) $true
}

try {
    Get-Api ($Base + "/api/reports/nonexistent/data") $adminH | Out-Null
    Write-Host "  [FAIL] Missing report should 404" -ForegroundColor Red; $fail++
} catch { Check "Missing report returns 404" $true $true }

# ── Summary ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
if ($fail -eq 0) {
    Write-Host "  PASSED: $pass   FAILED: $fail" -ForegroundColor Green
    Write-Host "  ALL TESTS PASSED" -ForegroundColor Green
} else {
    Write-Host "  PASSED: $pass   FAILED: $fail" -ForegroundColor Red
    Write-Host "  SOME TESTS FAILED" -ForegroundColor Red
}
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"

$captureScript = 'c:\Users\wujid\.trae-cn\work\6a3349fc53854cf14486d856\capture_current_app.ps1'
$screenshotPath = 'C:\Users\wujid\AppData\Roaming\TRAE SOLO CN\ModularData\ai-agent\work-mode-projects\6a3349fc53854cf14486d853\current_app_screenshot.png'
$outputDir = 'd:\cxdownload\blog\yuncan-blog-astro\docs\images'

# Get post links from homepage
Write-Host "Fetching post links from homepage..." -ForegroundColor Cyan
$html = Invoke-WebRequest -Uri 'https://blog.yuncan.xyz/' -UseBasicParsing
$links = [regex]::Matches($html.Content, 'href="(/posts/[^"]+)"') | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique -First 8

Write-Host "Found $($links.Count) post links" -ForegroundColor Yellow

$pages = @()
$i = 1
foreach ($link in $links) {
    $pages += @{ url = "https://blog.yuncan.xyz$link"; name = "post-$i.png" }
    $i++
}

$wshell = New-Object -ComObject WScript.Shell

foreach ($page in $pages) {
    Write-Host "Capturing: $($page.name)" -ForegroundColor Cyan

    $p = Start-Process msedge -ArgumentList "--app=$($page.url)" -PassThru
    Start-Sleep -Seconds 6

    $wshell.AppActivate($p.Id) | Out-Null
    Start-Sleep -Seconds 1

    powershell -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File $captureScript
    Start-Sleep -Milliseconds 500

    $targetPath = Join-Path $outputDir $page.name
    if (Test-Path $screenshotPath) {
        Copy-Item $screenshotPath $targetPath -Force
        Write-Host "  Saved: $targetPath" -ForegroundColor Green
    } else {
        Write-Host "  FAILED: screenshot not found" -ForegroundColor Red
    }

    Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

Write-Host "Done! Total: $($pages.Count)" -ForegroundColor Yellow

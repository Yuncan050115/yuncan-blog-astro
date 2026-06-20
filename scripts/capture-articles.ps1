$ErrorActionPreference = "Stop"

$captureScript = 'c:\Users\wujid\.trae-cn\work\6a3349fc53854cf14486d856\capture_current_app.ps1'
$screenshotPath = 'C:\Users\wujid\AppData\Roaming\TRAE SOLO CN\ModularData\ai-agent\work-mode-projects\6a3349fc53854cf14486d853\current_app_screenshot.png'
$outputDir = 'd:\cxdownload\blog\yuncan-blog-astro\docs\images'

# Get post links from homepage
Write-Host "Fetching post links..." -ForegroundColor Cyan
$html = Invoke-WebRequest -Uri 'https://blog.yuncan.xyz/' -UseBasicParsing
$links = [regex]::Matches($html.Content, 'href="(/posts/[^"]+)"') | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique -First 6

Write-Host "Found $($links.Count) post links" -ForegroundColor Yellow

$i = 1
foreach ($link in $links) {
    $url = "https://blog.yuncan.xyz$link"
    $name = "article-$i.png"
    Write-Host "Capturing: $name ($url)" -ForegroundColor Cyan

    # Open Edge in app mode (auto becomes foreground)
    $p = Start-Process msedge -ArgumentList "--app=$url" -PassThru
    Start-Sleep -Seconds 7

    # Do NOT call AppActivate - it may activate wrong window
    # Just capture foreground (Edge should be foreground)
    powershell -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File $captureScript
    Start-Sleep -Milliseconds 800

    $targetPath = Join-Path $outputDir $name
    if (Test-Path $screenshotPath) {
        Copy-Item $screenshotPath $targetPath -Force
        Write-Host "  Saved: $targetPath" -ForegroundColor Green
    } else {
        Write-Host "  FAILED" -ForegroundColor Red
    }

    Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    $i++
}

Write-Host "Done!" -ForegroundColor Yellow

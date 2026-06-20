$ErrorActionPreference = "Stop"

$outputDir = 'd:\cxdownload\blog\yuncan-blog-astro\docs\images'
$tempDir = Join-Path $env:TEMP "edge-headless-$(Get-Random)"

# Get post links from homepage
Write-Host "Fetching post links..." -ForegroundColor Cyan
$html = Invoke-WebRequest -Uri 'https://blog.yuncan.xyz/' -UseBasicParsing
$links = [regex]::Matches($html.Content, 'href="(/posts/[^"]+)"') | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique -First 6

Write-Host "Found $($links.Count) post links" -ForegroundColor Yellow

$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edgePath)) {
    $edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
}

$i = 1
foreach ($link in $links) {
    $url = "https://blog.yuncan.xyz$link"
    $name = "article-real-$i.png"
    $outputPath = Join-Path $outputDir $name
    Write-Host "Capturing: $name ($url)" -ForegroundColor Cyan

    & $edgePath --headless=new --disable-gpu --screenshot="$outputPath" --window-size=1280,900 --user-data-dir="$tempDir" $url 2>$null
    Start-Sleep -Seconds 3

    if (Test-Path $outputPath) {
        $size = (Get-Item $outputPath).Length
        Write-Host "  Saved: $outputPath ($size bytes)" -ForegroundColor Green
    } else {
        Write-Host "  FAILED" -ForegroundColor Red
    }
    $i++
}

# Cleanup
Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "Done!" -ForegroundColor Yellow

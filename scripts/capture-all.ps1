$ErrorActionPreference = "Stop"

$outputDir = 'd:\cxdownload\blog\yuncan-blog-astro\docs\images'
$tempDir = Join-Path $env:TEMP "edge-headless-2-$(Get-Random)"

$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edgePath)) {
    $edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
}

# Desktop pages
$desktopPages = @(
    @{ url = 'https://blog.yuncan.xyz/'; name = 'home-desktop.png' },
    @{ url = 'https://blog.yuncan.xyz/archives/'; name = 'archives-desktop.png' },
    @{ url = 'https://blog.yuncan.xyz/bangumis/'; name = 'bangumis-desktop.png' },
    @{ url = 'https://blog.yuncan.xyz/steamgames/'; name = 'steamgames-desktop.png' },
    @{ url = 'https://blog.yuncan.xyz/social/link/'; name = 'friends-desktop.png' },
    @{ url = 'https://blog.yuncan.xyz/social/circle/'; name = 'circle-desktop.png' },
    @{ url = 'https://blog.yuncan.xyz/poems/'; name = 'poems-desktop.png' },
    @{ url = 'https://blog.yuncan.xyz/personal/about/'; name = 'about-desktop.png' },
    @{ url = 'https://blog.yuncan.xyz/projects/'; name = 'projects-desktop.png' },
    @{ url = 'https://blog.yuncan.xyz/comments/'; name = 'comments-desktop.png' }
)

# Mobile pages (iPhone X size)
$mobileUA = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
$mobilePages = @(
    @{ url = 'https://blog.yuncan.xyz/'; name = 'home-mobile.png' },
    @{ url = 'https://blog.yuncan.xyz/archives/'; name = 'archives-mobile.png' },
    @{ url = 'https://blog.yuncan.xyz/bangumis/'; name = 'bangumis-mobile.png' },
    @{ url = 'https://blog.yuncan.xyz/steamgames/'; name = 'steamgames-mobile.png' },
    @{ url = 'https://blog.yuncan.xyz/social/link/'; name = 'friends-mobile.png' },
    @{ url = 'https://blog.yuncan.xyz/poems/'; name = 'poems-mobile.png' },
    @{ url = 'https://blog.yuncan.xyz/personal/about/'; name = 'about-mobile.png' },
    @{ url = 'https://blog.yuncan.xyz/projects/'; name = 'projects-mobile.png' }
)

# More articles
$articlePages = @(
    @{ url = 'https://blog.yuncan.xyz/posts/yoimiya/'; name = 'article-yoimiya.png' },
    @{ url = 'https://blog.yuncan.xyz/posts/done-dragon-boat/'; name = 'article-dragon-boat.png' },
    @{ url = 'https://blog.yuncan.xyz/posts/conghua-rain/'; name = 'article-conghua.png' },
    @{ url = 'https://blog.yuncan.xyz/posts/dark-flash/'; name = 'article-dark-flash.png' }
)

Write-Host "=== Desktop Screenshots ===" -ForegroundColor Yellow
foreach ($page in $desktopPages) {
    $outputPath = Join-Path $outputDir $page.name
    Write-Host "Capturing: $($page.name)" -ForegroundColor Cyan
    & $edgePath --headless=new --disable-gpu --screenshot="$outputPath" --window-size=1280,900 --user-data-dir="$tempDir" $page.url 2>$null
    Start-Sleep -Seconds 3
    if (Test-Path $outputPath) {
        Write-Host "  OK ($((Get-Item $outputPath).Length) bytes)" -ForegroundColor Green
    } else {
        Write-Host "  FAILED" -ForegroundColor Red
    }
}

Write-Host "`n=== Mobile Screenshots ===" -ForegroundColor Yellow
foreach ($page in $mobilePages) {
    $outputPath = Join-Path $outputDir $page.name
    Write-Host "Capturing: $($page.name)" -ForegroundColor Cyan
    & $edgePath --headless=new --disable-gpu --screenshot="$outputPath" --window-size=375,812 --user-agent="$mobileUA" --user-data-dir="$tempDir" $page.url 2>$null
    Start-Sleep -Seconds 3
    if (Test-Path $outputPath) {
        Write-Host "  OK ($((Get-Item $outputPath).Length) bytes)" -ForegroundColor Green
    } else {
        Write-Host "  FAILED" -ForegroundColor Red
    }
}

Write-Host "`n=== Article Screenshots ===" -ForegroundColor Yellow
foreach ($page in $articlePages) {
    $outputPath = Join-Path $outputDir $page.name
    Write-Host "Capturing: $($page.name)" -ForegroundColor Cyan
    & $edgePath --headless=new --disable-gpu --screenshot="$outputPath" --window-size=1280,900 --user-data-dir="$tempDir" $page.url 2>$null
    Start-Sleep -Seconds 3
    if (Test-Path $outputPath) {
        Write-Host "  OK ($((Get-Item $outputPath).Length) bytes)" -ForegroundColor Green
    } else {
        Write-Host "  FAILED" -ForegroundColor Red
    }
}

Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "`nAll done!" -ForegroundColor Yellow

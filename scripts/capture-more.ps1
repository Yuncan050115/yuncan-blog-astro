$ErrorActionPreference = "Stop"

$outputDir = 'd:\cxdownload\blog\yuncan-blog-astro\docs\images'
$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edgePath)) {
    $edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
}

$mobileUA = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"

$pages = @(
    @{ url = 'https://blog.yuncan.xyz/'; name = 'home-mobile.png'; mobile = $true },
    @{ url = 'https://blog.yuncan.xyz/archives/'; name = 'archives-mobile.png'; mobile = $true },
    @{ url = 'https://blog.yuncan.xyz/bangumis/'; name = 'bangumis-mobile.png'; mobile = $true },
    @{ url = 'https://blog.yuncan.xyz/social/link/'; name = 'friends-mobile.png'; mobile = $true },
    @{ url = 'https://blog.yuncan.xyz/poems/'; name = 'poems-mobile.png'; mobile = $true },
    @{ url = 'https://blog.yuncan.xyz/personal/about/'; name = 'about-mobile.png'; mobile = $true },
    @{ url = 'https://blog.yuncan.xyz/cinemas/'; name = 'cinemas-article.png'; mobile = $false },
    @{ url = 'https://blog.yuncan.xyz/site/time/'; name = 'time-article.png'; mobile = $false },
    @{ url = 'https://blog.yuncan.xyz/personal/love/'; name = 'love-article.png'; mobile = $false },
    @{ url = 'https://blog.yuncan.xyz/posts/zmusic-gui/'; name = 'article-zmusic.png'; mobile = $false },
    @{ url = 'https://blog.yuncan.xyz/posts/build-time-fetch/'; name = 'article-build.png'; mobile = $false }
)

foreach ($page in $pages) {
    $outputPath = Join-Path $outputDir $page.name
    if (Test-Path $outputPath) {
        $size = (Get-Item $outputPath).Length
        if ($size -gt 50000) {
            Write-Host "SKIP (exists): $($page.name)" -ForegroundColor DarkGray
            continue
        }
    }

    Write-Host "Capturing: $($page.name)" -ForegroundColor Cyan
    $tempDir = Join-Path $env:TEMP "edge-$(Get-Random)"

    if ($page.mobile) {
        & $edgePath --headless=new --disable-gpu --screenshot="$outputPath" --window-size=375,812 --user-agent="$mobileUA" --user-data-dir="$tempDir" $page.url 2>$null
    } else {
        & $edgePath --headless=new --disable-gpu --screenshot="$outputPath" --window-size=1280,900 --user-data-dir="$tempDir" $page.url 2>$null
    }
    Start-Sleep -Seconds 4

    # Kill any remaining edge processes from headless
    Get-Process msedge -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -eq "" } | Stop-Process -Force -ErrorAction SilentlyContinue

    Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue

    if (Test-Path $outputPath) {
        $size = (Get-Item $outputPath).Length
        if ($size -gt 50000) {
            Write-Host "  OK ($size bytes)" -ForegroundColor Green
        } else {
            Write-Host "  TOO SMALL ($size bytes), retrying..." -ForegroundColor Yellow
            Remove-Item $outputPath -Force
            Start-Sleep -Seconds 2
            $tempDir2 = Join-Path $env:TEMP "edge-retry-$(Get-Random)"
            if ($page.mobile) {
                & $edgePath --headless=new --disable-gpu --screenshot="$outputPath" --window-size=375,812 --user-agent="$mobileUA" --user-data-dir="$tempDir2" $page.url 2>$null
            } else {
                & $edgePath --headless=new --disable-gpu --screenshot="$outputPath" --window-size=1280,900 --user-data-dir="$tempDir2" $page.url 2>$null
            }
            Start-Sleep -Seconds 5
            Remove-Item $tempDir2 -Recurse -Force -ErrorAction SilentlyContinue
            if (Test-Path $outputPath) {
                Write-Host "  Retry OK ($((Get-Item $outputPath).Length) bytes)" -ForegroundColor Green
            } else {
                Write-Host "  Retry FAILED" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "  FAILED" -ForegroundColor Red
    }
}

Write-Host "`nDone!" -ForegroundColor Yellow

$ErrorActionPreference = "Stop"

$captureScript = 'c:\Users\wujid\.trae-cn\work\6a3349fc53854cf14486d856\capture_current_app.ps1'
$screenshotPath = 'C:\Users\wujid\AppData\Roaming\TRAE SOLO CN\ModularData\ai-agent\work-mode-projects\6a3349fc53854cf14486d853\current_app_screenshot.png'
$outputDir = 'd:\cxdownload\blog\yuncan-blog-astro\docs\images'

$pages = @(
    @{ url = 'https://blog.yuncan.xyz/'; name = 'home.png' },
    @{ url = 'https://blog.yuncan.xyz/archives/'; name = 'archives.png' },
    @{ url = 'https://blog.yuncan.xyz/tags/'; name = 'tags.png' },
    @{ url = 'https://blog.yuncan.xyz/categories/'; name = 'categories.png' },
    @{ url = 'https://blog.yuncan.xyz/bangumis/'; name = 'bangumis.png' },
    @{ url = 'https://blog.yuncan.xyz/cinemas/'; name = 'cinemas.png' },
    @{ url = 'https://blog.yuncan.xyz/steamgames/'; name = 'steamgames.png' },
    @{ url = 'https://blog.yuncan.xyz/comments/'; name = 'comments.png' },
    @{ url = 'https://blog.yuncan.xyz/social/link/'; name = 'friends.png' },
    @{ url = 'https://blog.yuncan.xyz/social/circle/'; name = 'circle.png' },
    @{ url = 'https://blog.yuncan.xyz/personal/about/'; name = 'about.png' },
    @{ url = 'https://blog.yuncan.xyz/personal/love/'; name = 'love.png' },
    @{ url = 'https://blog.yuncan.xyz/site/time/'; name = 'time.png' },
    @{ url = 'https://blog.yuncan.xyz/poems/'; name = 'poems.png' },
    @{ url = 'https://blog.yuncan.xyz/projects/'; name = 'projects.png' },
    @{ url = 'https://blog.yuncan.xyz/nonexistent-page-404/'; name = '404.png' }
)

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

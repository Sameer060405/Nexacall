# Push NexaCall changes to GitHub
# Run in PowerShell: .\push-changes.ps1

Set-Location $PSScriptRoot

Write-Host "Staging all changes..." -ForegroundColor Cyan
git add -A

Write-Host "Status:" -ForegroundColor Cyan
git status --short

Write-Host "`nCommitting..." -ForegroundColor Cyan
git commit -m "Add MongoDB Atlas, meeting password, toast, Lobby redesign, delete meeting, link/code display"

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nPushing to origin main..." -ForegroundColor Cyan
    git push -u origin main
    Write-Host "`nDone." -ForegroundColor Green
} else {
    Write-Host "`nNo changes to commit (or commit failed). Try: git status" -ForegroundColor Yellow
}

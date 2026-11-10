$ws = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop "Mimikara JLPT (N3-N2-N1) Flashcard.lnk"
$s = $ws.CreateShortcut($shortcutPath)
$targetDir = $PSScriptRoot
if (-not $targetDir) { $targetDir = Get-Location }
$s.TargetPath = Join-Path $targetDir "Chay_Mimikara.bat"
$s.WorkingDirectory = $targetDir
$s.IconLocation = "shell32.dll,13"
$s.Description = "Mimikara JLPT N3 N2 N1 Flashcard App"
$s.Save()
Write-Host "Shortcut created successfully at $shortcutPath"

import { execSync } from 'child_process';

const psScript = `
$ws = New-Object -ComObject WScript.Shell
$shortcutPath = "$([Environment]::GetFolderPath('Desktop'))\\Mimikara JLPT (N3-N2-N1) Flashcard.lnk"
$s = $ws.CreateShortcut($shortcutPath)
$s.TargetPath = "e:\\Antigravity\\Mimikara\\Chay_Mimikara.bat"
$s.WorkingDirectory = "e:\\Antigravity\\Mimikara"
$s.IconLocation = "shell32.dll,13"
$s.Description = "Mimikara JLPT N3 N2 N1 Flashcard App"
$s.Save()
Write-Host "Shortcut created successfully at $shortcutPath"
`;

execSync(`powershell -Command "${psScript.replace(/\n/g, '; ')}"`, { stdio: 'inherit' });

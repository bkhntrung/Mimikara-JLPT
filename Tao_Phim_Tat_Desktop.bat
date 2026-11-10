@echo off
setlocal
chcp 65001 >nul
title Tao Phim Tat Mimikara ra Desktop
color 0A

echo ===============================================================
echo     TAO PHIM TAT SHORTCUT UNG DUNG MIMIKARA RA DESKTOP
echo ===============================================================
echo.

cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0create_shortcut.ps1"

if errorlevel 1 goto :FAIL
echo.
echo [*] Da tao phim tat thanh cong tren Man hinh Desktop cua ban!
echo [*] Tu nay ban co the nhan dup vao bieu tuong "Mimikara JLPT" ngoai Desktop de hoc.
goto :END

:FAIL
echo.
echo [!] Khong the tao phim tat tu dong bang PowerShell.
echo [*] Meo: Ban co the nhan chuot phai vao file Chay_Mimikara.bat -^> Send to -^> Desktop.

:END
echo.
pause

@echo off
setlocal
chcp 65001 >nul
title Mimikara JLPT (N3 - N2 - N1) - Flashcard
color 0B

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 goto :NO_NODE

if not exist "dist" goto :BUILD_DIST
goto :START_SERVER

:BUILD_DIST
if not exist "node_modules" goto :INSTALL_DEPS
goto :DO_BUILD

:INSTALL_DEPS
echo [*] Lan dau khoi chay: Dang cai dat thu vien can thiet...
call npm install
if errorlevel 1 goto :NPM_ERROR

:DO_BUILD
echo [*] Dang bien dich ma nguon giao dien ung dung...
call npm run build
if errorlevel 1 goto :BUILD_ERROR

:START_SERVER
node serve.cjs
if errorlevel 1 goto :SERVER_ERROR
goto :END

:NO_NODE
color 0C
echo ===============================================================
echo  [!] LOI: May tinh cua ban chua cai dat Node.js!
echo ===============================================================
echo  De chay ung dung tren may ca nhan, ban can co Node.js (mien phi).
echo  [*] Tai phien ban LTS khuyen nghi tai: https://nodejs.org/
echo  [*] Sau khi cai dat xong, hay mo lai file Chay_Mimikara.bat nay.
echo ===============================================================
echo.
pause
exit /b 1

:NPM_ERROR
color 0C
echo.
echo [!] Loi trong qua trinh cai dat thu vien npm!
echo [*] Vui long kiem tra ket noi mang va thu lai.
pause
exit /b 1

:BUILD_ERROR
color 0C
echo.
echo [!] Loi khi bien dich ma nguon ung dung (npm run build)!
pause
exit /b 1

:SERVER_ERROR
color 0C
echo.
echo [!] Co loi xay ra khi khoi chay may chu ung dung!
pause
exit /b 1

:END
pause

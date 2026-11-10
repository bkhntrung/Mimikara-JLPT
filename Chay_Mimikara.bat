@echo off
chcp 65001 >nul
title Mimikara JLPT (N3 • N2 • N1) - Bo The Hoc Tu Vung Tieng Nhat
color 0B

echo ===============================================================
echo     🎴 MIMIKARA OBOERU JLPT (N3 • N2 • N1) - FLASHCARD TOAN DIEN
echo ===============================================================
echo.
echo  Dang khoi dong ung dung hoc tu vung...
echo.

cd /d "%~dp0"

:: Kiem tra Node.js da duoc cai dat tren he thong chua
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] LOI: May tinh cua ban chua cai dat Node.js!
    echo [*] Vui long tai va cai dat Node.js (khuyen nghi ban LTS) tai: https://nodejs.org/
    echo [*] Sau khi cai dat xong, hay mo lai file Chay_Mimikara.bat nay.
    echo.
    pause
    exit /b 1
)

:: Kiem tra neu chay lan dau chua co thu vien node_modules
if not exist "node_modules" (
    echo [*] Phat hien chay lan dau: Dang tu dong cai dat thu vien (npm install)...
    echo [*] Qua trinh nay chi dien ra 1 lan duy nhat, vui long doi trong giay lat...
    call npm install
)

:: Kiem tra neu chua bien dich ung dung dist
if not exist "dist" (
    echo [*] Dang bien dich ung dung lan dau (npm run build)...
    call npm run build
)

:: Tu dong mo trinh duyet web toi localhost:4173
echo [*] Dang mo ung dung tren trinh duyet web tai http://localhost:4173/ ...
start http://localhost:4173/

echo.
echo ===============================================================
echo  UNG DUNG DANG CHAY! BAN CO THE BAT DAU HOC NGAY TREN TRINH DUYET.
echo  - Dia chi may chu ca nhan: http://localhost:4173/
echo  - Cap do ho tro: N3 (871 tu), N2 (1,160 tu), N1 (1,170 tu)
echo  - Tong cong: 3,201 tu vung & 8,543 cau vi du minh hoa
echo  - Toan bo tien do hoc SRS & yeu thich luu truc tiep tren may ban
echo  (Khi hoc xong, ban chi can dong cua so mau den nay lai)
echo ===============================================================
echo.

:: Chay preview server tren cong 4173
call npm run preview -- --port 4173

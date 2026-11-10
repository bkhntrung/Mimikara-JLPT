@echo off
chcp 65001 >nul
title Mimikara JLPT (N3 • N2 • N1) - Bo The Hoc Tu Vung Tieng Nhat
color 0B

echo ===============================================================
echo     🎴 MIMIKARA OBOERU JLPT (N3 • N2 • N1) - FLASHCARD TOAN DIEN
echo ===============================================================
echo.
echo  Dang kiem tra va khoi dong ung dung...
echo.

cd /d "%~dp0"

:: 1. Kiem tra Node.js da duoc cai dat tren may chua
where node >nul 2>nul
if %errorlevel% neq 0 (
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
)

:: 2. Kiem tra neu cong 4173 da co mot ban Mimikara dang chay
netstat -ano | findstr :4173 | findstr LISTENING >nul 2>nul
if %errorlevel% equ 0 (
    echo [*] Phat hien ung dung Mimikara DANG CHAY tren may cua ban (Cong 4173).
    echo [*] Dang tu dong mo lai giao dien hoc tren trinh duyet...
    start http://localhost:4173/
    echo.
    echo [*] Da mo thanh cong! Ban co the hoc ngay tren trinh duyet web.
    echo [*] De giu ung dung chay, hay giu cua so server da mo truoc do.
    echo.
    pause
    exit /b 0
)

:: 3. Kiem tra neu chay lan dau chua co thu vien node_modules
if not exist "node_modules" (
    echo [*] Lan dau chay: Dang tu dong cai dat thu vien can thiet (npm install)...
    echo [*] Qua trinh nay chi dien ra 1 lan duy nhat, vui long doi trong giay lat...
    call npm install
    if %errorlevel% neq 0 (
        color 0C
        echo.
        echo [!] Loi trong qua trinh cai dat thu vien npm!
        echo [*] Vui long kiem tra ket noi mang va thu lai.
        pause
        exit /b 1
    )
)

:: 4. Kiem tra thu muc dist da bien dich chua
if not exist "dist" (
    echo [*] Dang bien dich ma nguon giao dien (npm run build)...
    call npm run build
    if %errorlevel% neq 0 (
        color 0C
        echo.
        echo [!] Loi khi bien dich ma nguon giao dien (npm run build)!
        pause
        exit /b 1
    )
)

:: 5. Tu dong mo trinh duyet sau 1.5 giay khi may chu bat dau san sang
start "" /B powershell -WindowStyle Hidden -Command "Start-Sleep -Milliseconds 1500; Start-Process 'http://localhost:4173/'"

echo.
echo ===============================================================
echo  [OK] UNG DUNG DA KHOI CHAY THANH CONG!
echo  - Dia chi may chu ca nhan: http://localhost:4173/
echo  - Cap do ho tro: N3 (871 tu), N2 (1,160 tu), N1 (1,170 tu)
echo  - Tong cong: 3,201 tu vung & 8,543 cau vi du minh hoa
echo  - Toan bo tien do hoc SRS & yeu thich luu doc lap tren may ban
echo ===============================================================
echo  LUU Y: GIU CUA SO NAY MO TRONG SUOT QUA TRINH HOC.
echo  Khi muon ket thuc buoi hoc, chi can dong cua so mau den nay lai.
echo ===============================================================
echo.

:: 6. Khoi chay Preview Server
call npm run preview -- --port 4173

if %errorlevel% neq 0 (
    color 0C
    echo.
    echo ===============================================================
    echo  [!] May chu da dung hoac gap loi bat ngo!
    echo ===============================================================
)

echo.
echo [*] Cua so nay se tam dung de ban doc thong bao loi (neu co).
echo [*] Nhan mot phim bat ky de dong...
pause

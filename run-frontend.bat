@echo off
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0frontend"
echo ========================================================
echo  Dang khoi dong BrainMemo Frontend (MSW Mock Mode)...
echo ========================================================
npm run dev
pause

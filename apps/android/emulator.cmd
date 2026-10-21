@echo off
rem Double-click: opens the Android emulator with the app installed (in its app drawer), and this computer's internet. It stays open after this window closes.
cd /d "%~dp0"
if not exist ..\..\node_modules (
  echo Installing packages first...
  call npm install || goto :failed
)
node scripts\emulator.cjs || goto :failed
timeout /t 5 >nul
exit /b
:failed
pause

@echo off
rem Double-click: the Android app's live preview on an emulator (started if none is running) or USB phone. Close this window (or Ctrl+C) to stop it.
cd /d "%~dp0"
if not exist ..\..\node_modules (
  echo Installing packages first...
  call npm install || goto :failed
)
call npm run dev || goto :failed
exit /b
:failed
pause

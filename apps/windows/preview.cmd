@echo off
rem Double-click: the Windows app's live preview, in its own window. Close the app to stop it.
cd /d "%~dp0"
if not exist ..\..\node_modules (
  echo Installing packages first...
  call npm install || goto :failed
)
call npm run dev || goto :failed
exit /b
:failed
pause

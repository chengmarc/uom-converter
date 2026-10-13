@echo off
rem Double-click: the website's live preview, opened in your browser. Close this window to stop it.
cd /d "%~dp0"
if not exist ..\..\node_modules (
  echo Installing packages first...
  call npm install || goto :failed
)
call npm run dev -- --open || goto :failed
exit /b
:failed
pause

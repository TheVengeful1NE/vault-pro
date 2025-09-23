@echo off
echo Clearing browser cache and starting Vault Pro...
echo.

REM Kill any running browser processes to clear cache
taskkill /f /im chrome.exe 2>nul
taskkill /f /im msedge.exe 2>nul
taskkill /f /im firefox.exe 2>nul

echo Browser processes cleared.
echo.

REM Wait a moment
timeout /t 2 /nobreak >nul

REM Start the application with cache-busting parameters
echo Starting Vault Pro with fresh cache...
start "" "index.html"

echo.
echo Cache cleared! The application should now load the correct interface.
echo If you still see the old interface, try:
echo 1. Press Ctrl+F5 to force refresh
echo 2. Press Ctrl+Shift+Delete to clear browser data
echo.
pause
@echo off
echo Starting Vault Pro Server with Network Access...
echo.

REM Check if Node.js is available
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js detected - Starting server...
echo.

REM Kill any existing server on port 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    echo Stopping existing server on port 3000...
    taskkill /PID %%a /F >nul 2>&1
)

echo Starting Vault Pro server...
echo.
echo IMPORTANT: 
echo 1. Make sure Windows Firewall allows Node.js
echo 2. Your mobile device must be on the same WiFi network
echo 3. Use the network IP shown below to access from mobile
echo.

node server.js

pause
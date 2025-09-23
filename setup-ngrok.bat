@echo off
echo Setting up Ngrok for Vault Pro...
echo.

REM Check if ngrok is installed
ngrok version >nul 2>&1
if %errorLevel% neq 0 (
    echo Ngrok not found. Please install from: https://ngrok.com/download
    echo After installation, run: ngrok config add-authtoken YOUR_TOKEN
    pause
    exit /b 1
)

echo Starting Vault Pro server...
start /B node server.js

echo Waiting for server to start...
timeout /t 3 /nobreak >nul

echo Starting Ngrok tunnel...
echo.
echo Your Vault Pro will be accessible worldwide at the HTTPS URL shown below:
echo.
ngrok http 3000
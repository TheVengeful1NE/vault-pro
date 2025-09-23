@echo off
echo Setting up Windows Firewall for Vault Pro...
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Running as Administrator - Good!
) else (
    echo ERROR: This script must be run as Administrator
    echo Right-click and select "Run as administrator"
    pause
    exit /b 1
)

echo.
echo Adding Windows Firewall rules for Vault Pro...

REM Add inbound rule for port 3000
netsh advfirewall firewall add rule name="Vault Pro - Inbound" dir=in action=allow protocol=TCP localport=3000
if %errorLevel% == 0 (
    echo ✓ Inbound rule added successfully
) else (
    echo ✗ Failed to add inbound rule
)

REM Add outbound rule for port 3000
netsh advfirewall firewall add rule name="Vault Pro - Outbound" dir=out action=allow protocol=TCP localport=3000
if %errorLevel% == 0 (
    echo ✓ Outbound rule added successfully
) else (
    echo ✗ Failed to add outbound rule
)

echo.
echo Firewall configuration complete!
echo.
echo You can now access Vault Pro from mobile devices on the same network.
echo Use the Device Link panel to get the network access URL.
echo.
pause
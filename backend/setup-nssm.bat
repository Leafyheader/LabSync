@echo off
REM NSSM Setup Script
REM Downloads NSSM (Non-Sucking Service Manager) for use with MedLab Backend

setlocal enabledelayedexpansion

cd /d "%~dp0"

echo.
echo ====================================
echo NSSM Downloader
echo ====================================
echo.

set NSSM_DIR=%CD%\nssm
set NSSM_ZIP=%CD%\nssm-temp.zip

if exist "%NSSM_DIR%\nssm.exe" (
    echo NSSM is already installed at:
    echo %NSSM_DIR%\nssm.exe
    echo.
    pause
    exit /b 0
)

echo Downloading NSSM 2.24 (latest stable)...
echo.

REM Try using PowerShell to download
powershell -NoProfile -Command ^
    "try { ^
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; ^
        $url = 'https://nssm.cc/ci/nssm-2.24-101-g897c7ad.zip'; ^
        $output = '%NSSM_ZIP%'; ^
        Write-Host 'Downloading from: ' $url; ^
        (New-Object System.Net.WebClient).DownloadFile($url, $output); ^
        Write-Host 'Download complete!'; ^
    } catch { ^
        Write-Host 'Error: ' $_.Exception.Message; ^
        exit 1; ^
    }"

if %errorLevel% neq 0 (
    echo.
    echo ERROR: Failed to download NSSM
    echo.
    echo You can manually download NSSM from:
    echo https://nssm.cc/download
    echo.
    echo Steps:
    echo 1. Download nssm-2.24-101-g897c7ad.zip
    echo 2. Extract to: %NSSM_DIR%
    echo 3. Ensure nssm.exe is at: %NSSM_DIR%\nssm.exe
    echo.
    pause
    exit /b 1
)

echo Extracting NSSM...
powershell -NoProfile -Command ^
    "Add-Type -AssemblyName System.IO.Compression.FileSystem; ^
    [System.IO.Compression.ZipFile]::ExtractToDirectory('%NSSM_ZIP%', '%CD%')"

if %errorLevel% neq 0 (
    echo ERROR: Failed to extract NSSM
    pause
    exit /b 1
)

REM Find and move nssm.exe to nssm folder
for /r "%CD%" %%F in (nssm.exe) do (
    if not exist "%NSSM_DIR%" mkdir "%NSSM_DIR%"
    move /y "%%F" "%NSSM_DIR%\nssm.exe"
    goto :found
)

echo ERROR: nssm.exe not found in extracted files
pause
exit /b 1

:found
REM Cleanup
del /f /q "%NSSM_ZIP%" >nul 2>&1
for /d /r "%CD%" %%D in (nssm-*) do rmdir /s /q "%%D" >nul 2>&1

echo.
echo ====================================
echo NSSM Installation Complete!
echo ====================================
echo.
echo NSSM is ready to use.
echo Location: %NSSM_DIR%\nssm.exe
echo.
echo Next step:
echo Run: install-service.bat
echo.
pause

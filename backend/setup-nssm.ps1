# NSSM Setup Script (PowerShell)
# Downloads and installs NSSM for Windows Service Management

param(
    [string]$NssmVersion = "2.24-101-g897c7ad",
    [string]$InstallPath = $PSScriptRoot
)

$ErrorActionPreference = "Stop"

$NssmDir = Join-Path $InstallPath "nssm"
$NssmExe = Join-Path $NssmDir "nssm.exe"

Write-Host ""
Write-Host "===================================="
Write-Host "NSSM Setup Script"
Write-Host "===================================="
Write-Host ""

if (Test-Path $NssmExe) {
    Write-Host "NSSM already installed at: $NssmExe"
    exit 0
}

Write-Host "Downloading NSSM $NssmVersion..."

if (-not (Test-Path $NssmDir)) {
    New-Item -ItemType Directory -Path $NssmDir | Out-Null
}

$NssmUrl = "https://nssm.cc/ci/nssm-$NssmVersion.zip"
$ZipFile = Join-Path $InstallPath "nssm-temp.zip"
$ExtractPath = Join-Path $InstallPath "nssm-extract"

try
{
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    
    Write-Host "Downloading from: $NssmUrl"
    $WebClient = New-Object System.Net.WebClient
    $WebClient.DownloadFile($NssmUrl, $ZipFile)
    Write-Host "Download complete!"
    
    Write-Host "Extracting NSSM..."
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::ExtractToDirectory($ZipFile, $ExtractPath)
    
    $NssmExeFiles = Get-ChildItem -Path $ExtractPath -Filter "nssm.exe" -Recurse
    
    if ($NssmExeFiles.Count -eq 0) {
        Write-Host "ERROR: nssm.exe not found in extracted files"
        exit 1
    }
    
    Copy-Item -Path $NssmExeFiles[0].FullName -Destination $NssmExe -Force
    Write-Host "NSSM copied to: $NssmDir"
    
    Remove-Item $ZipFile -Force -ErrorAction SilentlyContinue
    Remove-Item $ExtractPath -Recurse -Force -ErrorAction SilentlyContinue
    
    Write-Host ""
    Write-Host "===================================="
    Write-Host "NSSM Installation Complete!"
    Write-Host "===================================="
    Write-Host "NSSM ready at: $NssmExe"
    exit 0
}
catch
{
    Write-Host ""
    Write-Host "ERROR: $($_.Exception.Message)"
    Write-Host ""
    Write-Host "Manual installation:"
    Write-Host "  1. Download from https://nssm.cc/download"
    Write-Host "  2. Extract to: $NssmDir"
    Write-Host "  3. Ensure nssm.exe is at: $NssmExe"
    exit 1
}
@echo off
REM Wrapper script for MedLab Backend Service
REM This script ensures the backend runs from the correct directory
cd /d "%~dp0"
call node_modules\.bin\tsx.cmd watch src/server.ts

@echo off
REM Shared helpers. Usage: _tools.bat <command>
REM Commands: read_python | ensure_venv | install_deps

for %%I in ("%~dp0..") do set "ROOT=%%~fI"

set "VENV_PY=%ROOT%\.venv\Scripts\python.exe"
set "VENV_PIP=%ROOT%\.venv\Scripts\pip.exe"

if /i "%~1"=="read_python" goto read_python_from_localdevs
if /i "%~1"=="ensure_venv" goto ensure_venv
if /i "%~1"=="install_deps" goto install_deps
echo [ERROR] Unknown command: %~1
exit /b 1

:read_python_from_localdevs
set "PYTHON="
if not exist "%ROOT%\localdevs.txt" exit /b 1
for /f "usebackq delims=" %%a in (`findstr /b /i "python3:" "%ROOT%\localdevs.txt"`) do set "PYLINE=%%a"
if not defined PYLINE exit /b 1
set "PYTHON=%PYLINE:python3:=%"
for /f "tokens=* delims= " %%a in ("%PYTHON%") do set "PYTHON=%%a"
if not exist "%PYTHON%" (
    echo [ERROR] Python not found: %PYTHON%
    exit /b 1
)
exit /b 0

:ensure_venv
call "%~f0" read_python
if errorlevel 1 exit /b 1
if exist "%VENV_PY%" exit /b 0
echo [INFO] Creating virtual environment...
"%PYTHON%" -m venv "%ROOT%\.venv"
if errorlevel 1 (
    echo [ERROR] Failed to create venv
    exit /b 1
)
exit /b 0

:install_deps
call "%~f0" ensure_venv
if errorlevel 1 exit /b 1
echo [INFO] Installing dependencies...
"%VENV_PIP%" install -r "%ROOT%\requirements.txt"
if errorlevel 1 exit /b 1
exit /b 0

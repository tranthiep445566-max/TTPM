@echo off
cd /d "%~dp0"
echo Dang khoi dong may chu tam thoi...
start "" http://localhost:8080
npx --yes serve -l 8080 .

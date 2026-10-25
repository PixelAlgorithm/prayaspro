@echo off
title PrayasPro Full-Stack Launcher
color 0A

echo ====================================================================
echo        PRAYASPRO — Skill-Based Micro-Task Marketplace
echo            DBMS Level 3 Experiential Learning Project
echo ====================================================================
echo.

echo [1/3] Starting Backend API Server (Port 5000)...
start "PrayasPro Backend Server" cmd /k "cd /d %~dp0backend && npm run dev"

timeout /t 3 /nobreak >nul

echo [2/3] Starting Frontend Next.js Web App (Port 3000)...
start "PrayasPro Frontend Server" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 4 /nobreak >nul

echo [3/3] Opening PrayasPro in your default web browser...
start http://localhost:3000

echo.
echo ====================================================================
echo   Servers are running!
echo   - Frontend: http://localhost:3000
echo   - Backend:  http://localhost:5000/api
echo   - Database: PostgreSQL 18 (localhost:5432/prayaspro)
echo.
echo   Check DEMO_GUIDE.md or demo.txt for your viva presentation script!
echo ====================================================================
pause

@echo off
cd /d C:\Users\Yeghia\whatsapp-ai-bot

echo Starting CHS.ai Bot + Web Server...
start "CHS.ai Bot" cmd /k "node index.js"

timeout /t 3 /nobreak >nul

echo Starting ngrok tunnel...
start "CHS.ai Web" cmd /k "ngrok http 3000"

timeout /t 2 /nobreak >nul

echo Starting Mobile App (Expo)...
start "CHS.ai Mobile" cmd /k "cd /d C:\Users\Yeghia\chs-ai-app && npx expo start"

echo.
echo All three are starting in separate windows.
echo Once ngrok shows a URL, share it as:
echo   https://YOUR-URL.ngrok-free.dev/dashboard/chat
echo.
pause

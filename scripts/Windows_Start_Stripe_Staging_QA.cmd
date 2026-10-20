@echo off
setlocal EnableExtensions DisableDelayedExpansion
title Speakingym STRIPE TEST - localhost only
set "PATH=C:\Program Files\nodejs;%PATH%"
set "SHA=d537d25922c66f51299b6123309236bfa1fa2246"
set "ROOTTEMP=%TEMP%\speakingym-stripe-qa-%RANDOM%-%RANDOM%"
set "CODE=%ROOTTEMP%\speakingym-%SHA%"

echo.
echo Speakingym Stripe TEST browser - LOCALHOST ONLY
echo No production Worker, production D1, Stripe Live, or paid Gemini changes.
echo The purchase button stays DISABLED until staging safety checks pass.
echo.
where node >nul 2>&1 || goto :failed
mkdir "%ROOTTEMP%" || goto :failed
echo Downloading reviewed public draft code...
curl.exe --fail --silent --show-error --location --output "%ROOTTEMP%\code.zip" "https://github.com/keito0518/speakingym/archive/%SHA%.zip" || goto :failed
tar.exe -xf "%ROOTTEMP%\code.zip" -C "%ROOTTEMP%" || goto :failed
if not exist "%CODE%\scripts\serve-stripe-staging-qa.mjs" goto :failed
pushd "%CODE%" || goto :failed
echo Checking local test server safety...
node --test tests\stripe-staging-qa.test.mjs || goto :failed_root
echo.
echo Opening localhost Stripe sandbox QA page in your default browser...
echo Keep this window OPEN during testing. Close it to stop the server.
node scripts\serve-stripe-staging-qa.mjs --open
goto :done_root

:failed_root
echo.
echo STOP: QA did not start. No Stripe charge or Cloudflare change was attempted.
:done_root
popd
goto :done
:failed
echo.
echo STOP: Node.js, download, or archive setup failed.
:done
echo.
pause

@echo off
setlocal EnableExtensions DisableDelayedExpansion
title Speakingym - STAGING D1 billing tables ONLY
set "PATH=C:\Program Files\nodejs;%PATH%"
set "SHA=263b8a1cd9afa3d9e48bdb4825c853309c853b42"
set "TEMP_DIR=%TEMP%\speakingym-stripe-staging-%RANDOM%-%RANDOM%"
set "ROOT=%TEMP_DIR%\speakingym-%SHA%"

echo.
echo Speakingym STAGING D1 billing preparation only.
echo This will create at most two tables: billing_accounts and billing_events
echo in speakingym-plans-staging ONLY. It will not touch production or Stripe.
echo.
where node >nul 2>&1 || goto :failed
mkdir "%TEMP_DIR%" || goto :failed
curl.exe --fail --silent --show-error --location --output "%TEMP_DIR%\source.zip" "https://github.com/keito0518/speakingym/archive/%SHA%.zip" || goto :failed
tar.exe -xf "%TEMP_DIR%\source.zip" -C "%TEMP_DIR%" || goto :failed
if not exist "%ROOT%\scripts\staging-billing-schema-gate.mjs" goto :failed
pushd "%ROOT%" || goto :failed

echo [1/3] Local guard tests (no Cloudflare writes)...
node --test tests\staging-billing-schema-gate.test.mjs worker\staging-worker-config.test.mjs worker\staging-billing-only.test.mjs || goto :failed_root

echo [2/3] Verify EXACT remote staging D1 identity and existing schema (read-only)...
node scripts\staging-billing-schema-gate.mjs || goto :failed_root

echo [3/3] Apply ONLY additive billing schema to isolated staging D1...
node scripts\staging-billing-schema-gate.mjs --apply || goto :failed_root

echo.
echo SUCCESS: isolated staging billing D1 schema verified.
echo Stripe sandbox E2E has NOT been tested; staging billing mode is NOT activated.
goto :done_root

:failed_root
echo.
echo STOP: Schema preparation failed; do not retry by changing to production.
echo No live billing or production changes were requested.
:done_root
popd
goto :done
:failed
echo.
echo STOP: Download, Node.js or local setup failed.
:done
echo.
pause

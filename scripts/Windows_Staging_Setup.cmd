@echo off
setlocal EnableExtensions DisableDelayedExpansion
title Speakingym - STAGING Worker only
set "PATH=C:\Program Files\nodejs;%PATH%"
set "SRC_SHA=82c23e596e498c7057d10384ea8affc8bb57a25f"
set "TMPROOT=%TEMP%\speakingym-staging-%RANDOM%-%RANDOM%"
set "ROOT=%TMPROOT%\speakingym-%SRC_SHA%"
set "STAGING_CONFIG=%ROOT%\worker\wrangler.staging.toml"

echo.
echo Speakingym STAGING-only setup
echo Production Worker, production D1 and Stripe Live will NOT be changed.
echo.
where node >nul 2>&1 || goto :node_missing
where npx.cmd >nul 2>&1 || goto :node_missing
node --version || goto :failed

mkdir "%TMPROOT%" || goto :failed
echo [1/5] Downloading reviewed draft code from GitHub...
curl.exe --fail --silent --show-error --location --output "%TMPROOT%\source.zip" "https://github.com/keito0518/speakingym/archive/%SRC_SHA%.zip" || goto :failed
tar.exe -xf "%TMPROOT%\source.zip" -C "%TMPROOT%" || goto :failed
if not exist "%STAGING_CONFIG%" goto :failed

REM Fail closed if staging target or safety flag differs from reviewed code.
node -e "const fs=require('fs');const c=fs.readFileSync(process.env.STAGING_CONFIG,'utf8');const q=String.fromCharCode(34);const required=['name = '+q+'speakingym-survival-ai-staging'+q,'database_name = '+q+'speakingym-plans-staging'+q,'database_id = '+q+'c608774e-3bc5-4527-be8d-f640e386f504'+q,'STAGING_HEALTH_ONLY = '+q+'true'+q,'ALLOW_AI = '+q+'false'+q,'BILLING_MODE = '+q+'disabled'+q,'keep_vars = false'];if(required.some(x=>!c.includes(x))){console.error('STOP: Staging identity or safety settings do not match.');process.exit(1)}console.log('PASS: isolated staging Worker, D1 and safety flags verified.');" || goto :failed

pushd "%ROOT%" || goto :failed
echo [2/5] Running local staging safety tests (no Cloudflare changes)...
node --test worker\staging-worker-config.test.mjs tests\staging-worker-smoke.test.mjs || goto :failed_pushed

echo [3/5] Cloudflare authentication: approve in your browser if prompted...
call npx.cmd --yes wrangler@4 login || goto :failed_pushed

pushd worker || goto :failed_pushed
echo [4/5] Staging bundle dry-run (no deployment)...
call npx.cmd --yes wrangler@4 deploy --config wrangler.staging.toml --dry-run || goto :failed_twopushed

echo [5/5] Deploying ONLY speakingym-survival-ai-staging in health-only mode...
call npx.cmd --yes wrangler@4 deploy --config wrangler.staging.toml > "%TMPROOT%\deploy-log.txt" 2>&1
set "DEPLOY_EXIT=%ERRORLEVEL%"
type "%TMPROOT%\deploy-log.txt"
if not "%DEPLOY_EXIT%"=="0" goto :failed_twopushed
popd

REM Wrangler prints staging workers.dev URL. Verify exact hostname before any GET-only request.
set "STAGING_URL="
for /f "usebackq delims=" %%U in (\`powershell.exe -NoProfile -Command "$s=Get-Content -Raw (Join-Path $env:TMPROOT 'deploy-log.txt');$m=[regex]::Match($s,'https://speakingym-survival-ai-staging\.[a-z0-9-]+\.workers\.dev');if($m.Success){$m.Value}"\`) do set "STAGING_URL=%%U"
if not defined STAGING_URL goto :no_url
echo.
echo Checking staging /health (GET-only; no real user, AI or Stripe calls)...
node scripts\staging-worker-smoke.mjs "%STAGING_URL%" || goto :failed_pushed
echo.
echo SUCCESS: staging Worker deployed and /health verified.
echo Production and Stripe Live remain untouched.
goto :done

:no_url
echo.
echo Staging deployment succeeded, but the staging URL could not be extracted.
echo STOP: Please share the staging URL from the output above for a separate GET-only check.
goto :done

:node_missing
echo ERROR: Node.js or npx missing. Confirm Node.js LTS installation.
goto :done

:failed_twopushed
popd
:failed_pushed
popd
:failed
echo.
echo STOP: The staging setup did not finish. Do NOT run production config.
echo Please share non-secret error text; never share passwords or access tokens.
:done
echo.
echo You may close this window after reading the result.
pause
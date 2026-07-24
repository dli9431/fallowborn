@echo off
setlocal
rem ============================================================================
rem Fallowborn -> itch deploy (butler). Private tool; notes\ never ships.
rem Usage: from anywhere, run   notes\deploy.cmd
rem   - stages ONLY the allowlisted game files (notes\ and .git\ can't leak)
rem   - pushes the folder to the html5 channel; butler uploads only the diff
rem First-time setup: butler login  (once). Bump FB.VERSION in js\main.js and
rem post an itch devlog with each meaningful release.
rem Each push stamps ?v=<FB.VERSION> onto css/js/data/mods URLs in the STAGED
rem index.html (via stamp.ps1) so Cloudflare/browsers fetch fresh files. That
rem makes the FB.VERSION bump the cache key - never skip it on a real release.
rem ============================================================================

rem this script lives in notes\, so the repo root is one level up
pushd "%~dp0.."

set "stage=%TEMP%\fallowborn-stage"
echo Staging to "%stage%" ...
rmdir /s /q "%stage%" 2>nul
mkdir "%stage%"

rem root-level files (index.html must sit at the staging root)
copy /y index.html "%stage%\" >nul
copy /y LICENSE    "%stage%\" >nul

rem folders
for %%D in (css js data mods docs static) do xcopy "%%D" "%stage%\%%D\" /e /i /q /y >nul

echo Stamping cache-bust version onto staged index.html ...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0stamp.ps1" "%stage%"
if errorlevel 1 (
  echo ERROR: cache-bust stamping failed - aborting push.
  popd
  endlocal
  exit /b 1
)

echo Pushing to itch (dli9431/fallowborn:html5) ...
butler push "%stage%" dli9431/fallowborn:html5

echo.
echo Done. Check processing with:  butler status dli9431/fallowborn:html5
popd
endlocal

@echo off
echo Installing Playwright browsers...
echo.
echo This will download Chromium browser for web automation.
echo.

npx playwright install chromium

echo.
echo Installation complete!
echo.
echo You can now use:
echo   - Browser search (free, no API keys needed)
echo   - OCR with vision models
echo   - Web scraping
echo.
pause
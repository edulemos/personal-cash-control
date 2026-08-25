@echo off
setlocal enabledelayedexpansion

echo ==================================================
echo   Publicador de Release - Personal Cash Control
echo ==================================================
echo.

:: Solicita que você digite ou cole o token no terminal
set /p GH_TOKEN="Por favor, insira o seu token do GitHub gerado: "

:: Se o usuário não digitar nada, cancela a operação
if "%GH_TOKEN%"=="" (
    echo.
    echo [ERRO] O token nao pode estar vazio! Processo cancelado.
    pause
    exit /b 1
)

:: Lê a versão do package.json
for /f "tokens=2 delims=:, " %%v in ('findstr /i "\"version\"" package.json') do (
    set RAW_VERSION=%%v
    goto :got_version
)
:got_version
:: Remove aspas da versão
set VERSION=%RAW_VERSION:"=%
echo.
echo [INFO] Versao detectada: v%VERSION%

:: Deleta drafts duplicados da mesma versao antes de publicar
echo [0/1] Limpando drafts duplicados no GitHub para v%VERSION%...
curl -s -H "Authorization: token %GH_TOKEN%" -H "Accept: application/vnd.github+json" ^
  "https://api.github.com/repos/edulemos/personal-cash-control/releases" > "%TEMP%\gh_releases.json" 2>nul

if exist "%TEMP%\gh_releases.json" (
    for /f "tokens=*" %%i in ('node -e "try{const fs=require('fs');const r=JSON.parse(fs.readFileSync('%TEMP%\\gh_releases.json','utf8'));const tag='v%VERSION%';const drafts=r.filter(x=>x.draft&&x.tag_name===tag);drafts.forEach(x=>process.stdout.write(x.id+'\n'));}catch(e){}"') do (
        echo [INFO] Deletando draft duplicado ID: %%i
        curl -s -X DELETE -H "Authorization: token %GH_TOKEN%" ^
          "https://api.github.com/repos/edulemos/personal-cash-control/releases/%%i" >nul
    )
)

echo.
echo [1/1] Compilando e enviando para o GitHub...
call npm run build -- --publish always
if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Falha ao compilar ou enviar para o GitHub.
    pause
    exit /b %errorlevel%
)

echo ==================================================
echo [SUCESSO] Release enviada para o GitHub com exito!
echo ==================================================
echo.
pause
endlocal

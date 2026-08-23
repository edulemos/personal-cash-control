@echo off
setlocal

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

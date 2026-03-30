#!/bin/bash

# CORES PARA TERMINAL
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}      CONDO PARK : AMBIENTE OFFLINE     ${NC}"
echo -e "${BLUE}=======================================${NC}"

# 1. VERIFICAR DEPENDÊNCIAS
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}Erro: pnpm não encontrado. Por favor, instale o pnpm primeiro.${NC}"
    exit 1
fi

# 2. PREPARAR AMBIENTE
echo -e "${YELLOW}Preparando banco de dados local...${NC}"
mkdir -p local-dev/data

# 3. CONFIGURAR O BANCO (PGLite)
# Rodamos o setup uma vez para garantir que as tabelas existam
npx tsx local-dev/setup-db.ts

# 4. INICIAR TUDO EM PARALELO
echo -e "${GREEN}Iniciando API e Aplicativo...${NC}"
echo -e "${GREEN}O navegador abrirá automaticamente em alguns segundos.${NC}"

# Definimos as PORTAS para evitar conflito com outros processos
API_PORT=3002
APP_PORT=3000

# Usamos concurrently para rodar os dois serviços
# O App agora tem um proxy configurado no local-dev/vite.config.local.ts para falar com a API

npx concurrently \
  --kill-others \
  --prefix "[{name}]" \
  --names "API,APP" \
  --prefix-colors "blue,green" \
  "PORT=3002 npx tsx -P local-dev/tsconfig.json artifacts/api-server/src/index.ts" \
  "PORT=3000 BASE_PATH='/' pnpm --dir artifacts/parking-app vite --config ../../local-dev/vite.config.local.ts --port 3000 --host 0.0.0.0 --open"

# NOTA: O flag --open no vite abrirá o navegador automaticamente.

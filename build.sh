#!/bin/bash
set -e

cd "$(dirname "$0")"

# 颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}   KiroX macOS 构建脚本${NC}"
echo -e "${BLUE}======================================${NC}\n"

# 1. 检查并安装 Go 依赖
echo -e "${BLUE}[1/5] 检查 Go 依赖...${NC}"
if ! command -v go &> /dev/null; then
  echo -e "${RED}✗ Go 未安装，请先安装 Go${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Go 已安装: $(go version)${NC}"

# 2. 检查并安装 Wails
echo -e "\n${BLUE}[2/5] 检查 Wails...${NC}"
WAILS=$(command -v wails || echo "$HOME/go/bin/wails")

if [ ! -x "$WAILS" ]; then
  echo -e "${YELLOW}→ Wails 未找到，正在自动安装...${NC}"
  go install github.com/wailsapp/wails/v2/cmd/wails@latest
  WAILS="$HOME/go/bin/wails"
  echo -e "${GREEN}✓ Wails 安装完成${NC}"
else
  echo -e "${GREEN}✓ Wails 已安装: $($WAILS version)${NC}"
fi

# 3. 安装 Go 模块依赖
echo -e "\n${BLUE}[3/5] 安装 Go 模块依赖...${NC}"
go mod download
go mod tidy
echo -e "${GREEN}✓ Go 依赖安装完成${NC}"

# 4. 安装前端依赖
echo -e "\n${BLUE}[4/5] 安装前端依赖...${NC}"
if [ -d "frontend" ]; then
  cd frontend
  if [ -f "package.json" ]; then
    if command -v npm &> /dev/null; then
      echo -e "${YELLOW}→ 正在执行 npm install...${NC}"
      npm install --silent
      echo -e "${GREEN}✓ 前端依赖安装完成${NC}"
    else
      echo -e "${RED}✗ npm 未安装，请先安装 Node.js${NC}"
      exit 1
    fi
  fi
  cd ..
fi

# 5. 清理并构建
echo -e "\n${BLUE}[5/5] 开始构建应用...${NC}"
echo -e "${YELLOW}→ 清理之前的构建...${NC}"
rm -rf build/bin/*

echo -e "${YELLOW}→ 构建 macOS 通用二进制（Intel + Apple Silicon）...${NC}"
"$WAILS" build -platform darwin/universal

# 检查构建结果
echo ""
if [ -d "build/bin/KiroX.app" ]; then
  echo -e "${GREEN}======================================${NC}"
  echo -e "${GREEN}   ✓ 构建成功！${NC}"
  echo -e "${GREEN}======================================${NC}"
  echo -e "${GREEN}应用位置: build/bin/KiroX.app${NC}"

  # 显示应用大小
  APP_SIZE=$(du -sh build/bin/KiroX.app | cut -f1)
  echo -e "${BLUE}应用大小: ${APP_SIZE}${NC}"

  # 自动打开构建目录
  echo -e "${BLUE}正在打开构建目录...${NC}"
  open build/bin
else
  echo -e "${RED}======================================${NC}"
  echo -e "${RED}   ✗ 构建失败${NC}"
  echo -e "${RED}======================================${NC}"
  exit 1
fi

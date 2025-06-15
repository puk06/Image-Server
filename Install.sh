#!/bin/bash

# Gitがインストールされていない場合のみインストール
if ! command -v git &> /dev/null; then
    echo "Installing Git..."
    sudo apt-get update
    sudo apt-get install -y git
else
    echo "Git is already installed."
fi

# Node.jsとnpmがインストールされていない場合のみインストール
if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
    echo "Installing Node.js and npm..."
    sudo apt install -y nodejs npm
    sudo npm install -g n
    sudo n stable
    sudo apt purge -y nodejs npm
    sudo apt autoremove -y
else
    echo "Node.js and npm are already installed."
fi

# pm2がインストールされていない場合のみインストール
if ! command -v pm2 &> /dev/null; then
    echo "Installing pm2..."
    sudo npm install -g pm2
else
    echo "pm2 is already installed."
fi

# リポジトリのクローン
if [ ! -d "Image-Server" ]; then
    git clone https://github.com/puk06/Image-Server.git
fi

cd Image-Server || exit 1

# .env作成
read -p "Enter your API key: " API_KEY
echo "API_KEY = $API_KEY" > .env

read -p "Enter the server port (default is 8000): " SERVER_PORT
SERVER_PORT=${SERVER_PORT:-8000}
echo "SERVER_PORT = $SERVER_PORT" >> .env

read -p "Enter the cache duration in minutes (default is 10): " CACHE_DURATION
CACHE_DURATION=${CACHE_DURATION:-10}
echo "CACHE_DURATION = $CACHE_DURATION" >> .env

read -p "Enable auto delete? (true/false, default is false): " AUTO_DELETE
AUTO_DELETE=${AUTO_DELETE:-false}
echo "AUTO_DELETE = $AUTO_DELETE" >> .env

read -p "Enter the auto delete duration in days (default is 8): " AUTO_DELETE_DURATION
AUTO_DELETE_DURATION=${AUTO_DELETE_DURATION:-8}
echo "AUTO_DELETE_DURATION = $AUTO_DELETE_DURATION" >> .env

read -p "Enter the upload directory name (default is 'uploads'): " UPLOAD_DIR_NAME
UPLOAD_DIR_NAME=${UPLOAD_DIR_NAME:-uploads}
echo "UPLOAD_DIR_NAME = $UPLOAD_DIR_NAME" >> .env

read -p "Enable request limit? (true/false, default is true): " LIMIT_REQUEST
LIMIT_REQUEST=${LIMIT_REQUEST:-true}
echo "LIMIT_REQUEST = $LIMIT_REQUEST" >> .env

read -p "Enter the request limit per minute (default is 60): " REQUEST_LIMIT_PER_MINUTE
REQUEST_LIMIT_PER_MINUTE=${REQUEST_LIMIT_PER_MINUTE:-60}
echo "REQUEST_LIMIT_PER_MINUTE = $REQUEST_LIMIT_PER_MINUTE" >> .env

# .env内容表示
echo "Configuration saved to .env file:"
cat .env

# 依存関係インストール
npm install

# サーバー起動
pm2 start ImageServer.js --name "Image-API-Server"

echo "Image API Server has been set up and started successfully."

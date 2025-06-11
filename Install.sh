#!/bin/bash

# gitをダウンロード
sudo apt-get update
sudo apt-get install -y git

# Node.js(Stable)、npmをダウンロード
sudo apt install -y nodejs npm
sudo npm install n -g
sudo n stable
sudo apt purge -y nodejs npm
sudo apt autoremove -y

# pm2をグローバルにインストール
sudo npm install -g pm2

# https://github.com/puk06/Image-Server.gitをクローン
git clone https://github.com/puk06/Image-Server.git

# クローンしたディレクトリに移動
cd Image-Server

# .envに書き込む用のデータを入力させる
read -p "Enter your API key: " API_KEY
echo "API_KEY = $API_KEY" > .env

read -p "Enter the server port (default is 8000): " SERVER_PORT
SERVER_PORT=${SERVER_PORT:-8000}
echo "SERVER_PORT = $SERVER_PORT" >> .env

read -p "Enter the cache duration in minutes (default is 10): " CACHE_DURATION
CACHE_DURATION=${CACHE_DURATION:-10}
echo "CACHE_DURATION =$CACHE_DURATION" >> .env

read -p "Enable auto delete? (true/false, default is false): " AUTO_DELETE
AUTO_DELETE=${AUTO_DELETE:-false}
echo "AUTO_DELETE = $AUTO_DELETE" >> .env

read -p "Enter the auto delete duration in days (default is 8): " AUTO_DELETE_DURATION
AUTO_DELETE_DURATION=${AUTO_DELETE_DURATION:-8}
echo "AUTO_DELETE_DURATION = $AUTO_DELETE_DURATION" >> .env

read -p "Enter the upload directory name (default is 'uploads'): " UPLOAD_DIR_NAME
UPLOAD_DIR_NAME=${UPLOAD_DIR_NAME:-uploads}
echo "UPLOAD_DIR_NAME = $UPLOAD_DIR_NAME" >> .env

# .envファイルの内容を確認
echo "Configuration saved to .env file:"
cat .env

# npm installを実行
npm install

# pm2を使ってアプリケーションを起動
pm2 start ImageServer.js --name "Image-API-Server"

# 完了
echo "Image API Server has been set up and started successfully."

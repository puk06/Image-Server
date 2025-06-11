#!/bin/bash

# gitをダウンロード
sudo apt-get update
sudo apt-get install -y git

# Node.jsをダウンロード
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

# .envに書き込む用のAPIキーを入力させる
read -p "Enter your API key: " API_KEY
echo "API_KEY=$API_KEY" > .env

# npm installを実行
npm install

# pm2を使ってアプリケーションを起動
pm2 start ImageServer.js --name "Image-API-Server"

# 完了
echo "Image API Server has been set up and started successfully."

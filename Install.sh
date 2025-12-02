#!/bin/bash

set -e

GIT_PATH=$(command -v git)
if [ -z "$GIT_PATH" ]; then
    echo "Git not found. Installing Git..."
    sudo apt update
    sudo apt install -y git
else
    echo "Git is already installed at: $GIT_PATH"
fi

NODE_PATH=$(command -v node)
NPM_PATH=$(command -v npm)
if [ -z "$NODE_PATH" ] || [ -z "$NPM_PATH" ]; then
    echo "Node.js or npm not found. Installing..."
    sudo apt install -y nodejs npm
    sudo npm install -g n
    sudo n stable
    sudo apt purge -y nodejs npm
    sudo apt autoremove -y
    echo "Node.js has been updated to stable version."
else
    echo "Node.js is already installed at: $NODE_PATH"
    echo "npm is already installed at: $NPM_PATH"
fi

PM2_PATH=$(command -v pm2)
if [ -z "$PM2_PATH" ]; then
    echo "PM2 not found. Installing PM2..."
    sudo npm install -g pm2
else
    echo "✅ PM2 is already installed at: $PM2_PATH"
fi

if [ ! -d "Image-Server" ]; then
    git clone https://github.com/puk06/Image-Server.git
else
    echo "'Image-Server' directory already exists. Skipping clone."
fi

cd Image-Server

echo "🛠 Setting up .env configuration..."

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

echo ".env file created:"
cat .env

echo "Installing npm packages..."
npm install

echo "Starting server with PM2..."
pm2 start ImageServer.js --name "Image-API-Server"

echo "Image API Server has been set up and started successfully."

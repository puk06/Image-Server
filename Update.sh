#!/bin/bash

set -e

echo "Updating Server Scripts..."
git pull

echo "Installing npm packages..."
npm install

echo "Restarting server with PM2..."
pm2 restart "Image-API-Server"

echo "Image API Server has been updated and restarted successfully."

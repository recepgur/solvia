#!/bin/bash
cd /root/solvia
echo "Starting installation at $(date)" > install.log
npm cache clean --force >> install.log 2>&1
rm -rf node_modules package-lock.json >> install.log 2>&1
npm install --legacy-peer-deps >> install.log 2>&1
echo "Installation completed at $(date)" >> install.log 2>&1
node src/index.js >> app.log 2>&1 &
echo $! > app.pid

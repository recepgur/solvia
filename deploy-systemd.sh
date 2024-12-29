#!/bin/bash
set -e

echo "Preparing deployment package..."
tar czf src.tar.gz src/ package.json solvia.service

echo "Uploading to server..."
sshpass -p Sanane120 scp -o StrictHostKeyChecking=no src.tar.gz root@91.151.88.205:/root/solvia/
sshpass -p Sanane120 scp -o StrictHostKeyChecking=no solvia.service root@91.151.88.205:/root/solvia/

echo "Setting up server environment..."
sshpass -p Sanane120 ssh -o StrictHostKeyChecking=no root@91.151.88.205 "cd /root/solvia && \
  tar xzf src.tar.gz && \
  rm src.tar.gz && \
  npm install --no-package-lock && \
  npm pkg set type=module && \
  mv solvia.service /etc/systemd/system/ && \
  systemctl daemon-reload && \
  systemctl enable solvia && \
  systemctl restart solvia && \
  systemctl status solvia"

#!/bin/bash

# Test media upload functionality
echo "Testing media upload functionality..."

# Start the development server
cd frontend
npm run dev &
DEV_PID=$!

# Wait for server to start
sleep 5

# Run tests
npm test -- --grep "MediaUpload"

# Cleanup
kill $DEV_PID

#!/bin/bash

IMAGE_NAME="kumo-ui"
CONTAINER_NAME="kumo-ui"
PORT=4173

echo "Stopping old container..."
docker stop $CONTAINER_NAME 2>/dev/null
docker rm $CONTAINER_NAME 2>/dev/null

echo "Building image..."
docker build -t $IMAGE_NAME .

echo "Running container..."
docker run -d --name $CONTAINER_NAME -p $PORT:$PORT $IMAGE_NAME

echo ""
echo "App is running at http://localhost:$PORT"

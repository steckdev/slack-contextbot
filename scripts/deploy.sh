#!/bin/bash

# Load environment variables from .env.production
if [ -f ".env.production" ]; then
  export $(grep -v '^#' .env.production | xargs)
else
  echo ".env.production file not found!"
  exit 1
fi

# Exit if any command fails
set -e

# Step 1: Build the Docker image
echo "Building Docker image..."
docker build -t ${IMAGE_NAME}:latest .

# Step 2: Tag the Docker image for ACR
echo "Tagging Docker image..."
docker tag ${IMAGE_NAME}:latest ${ACR_NAME}.azurecr.io/${IMAGE_NAME}:latest

# Step 3: Log in to Azure Container Registry
echo "Logging in to Azure Container Registry..."
az acr login --name ${ACR_NAME}

# Step 4: Push the Docker image to ACR
echo "Pushing Docker image to Azure Container Registry..."
docker push ${ACR_NAME}.azurecr.io/${IMAGE_NAME}:latest

# Step 5: Deploy to Azure Container Instance
echo "Deploying to Azure Container Instance..."
az container create \
  --resource-group ${RESOURCE_GROUP} \
  --name ${CONTAINER_NAME} \
  --image ${ACR_NAME}.azurecr.io/${IMAGE_NAME}:latest \
  --cpu 1 \
  --memory 1 \
  --registry-login-server ${ACR_NAME}.azurecr.io \
  --registry-username ${ACR_USERNAME} \
  --registry-password ${ACR_PASSWORD} \
  --environment-variables \
    SLACK_BOT_TOKEN=$SLACK_BOT_TOKEN \
    SLACK_APP_TOKEN=$SLACK_APP_TOKEN \
    OPENAI_API_KEY=$OPENAI_API_KEY \
    PORT=$PORT \
  --dns-name-label ${DNS_LABEL} \
  --ports 80 \
  --location ${LOCATION}

echo "Deployment completed successfully!"

#!/bin/bash

# Load environment variables from .env.production
export $(grep -v '^#' .env.production | xargs)

# Create the container with environment variables
az container create \
  --resource-group SlackBotResourceGroup \
  --name slack-bot-container \
  --image slackcontextbotregistry.azurecr.io/slack-bot-app:latest \
  --cpu 1 \
  --memory 1 \
  --ports 80 \
  --dns-name-label slack-bot-app \
  --environment-variables \
    SLACK_BOT_TOKEN=$SLACK_BOT_TOKEN \
    SLACK_APP_TOKEN=$SLACK_APP_TOKEN \
    OPENAI_API_KEY=$OPENAI_API_KEY \
    PORT=$PORT \
  --registry-login-server slackcontextbotregistry.azurecr.io \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD

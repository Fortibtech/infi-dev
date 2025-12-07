#!/bin/bash
set -e

# Configuration
REGION="eu-west-1"
SERVICE_NAME="infiny-backend"
SECRET_NAME="infiny-backend-env"

# Get the service ARN
SERVICE_ARN=$(aws apprunner list-services --region ${REGION} --query "ServiceSummaryList[?ServiceName=='${SERVICE_NAME}'].ServiceArn" --output text)

if [ -z "$SERVICE_ARN" ]; then
  echo "Error: App Runner service '${SERVICE_NAME}' not found"
  exit 1
fi

# Check if the secret already exists
SECRET_EXISTS=$(aws secretsmanager list-secrets --region ${REGION} --query "SecretList[?Name=='${SECRET_NAME}'].ARN" --output text)

# Create or update the secret with environment variables
if [ -z "$SECRET_EXISTS" ]; then
  echo "Creating new secret for environment variables..."
  aws secretsmanager create-secret \
    --name ${SECRET_NAME} \
    --description "Environment variables for ${SERVICE_NAME}" \
    --secret-string "$(cat .env | grep -v '^#' | grep -v '^$')" \
    --region ${REGION}
else
  echo "Updating existing secret..."
  aws secretsmanager update-secret \
    --secret-id ${SECRET_NAME} \
    --secret-string "$(cat .env | grep -v '^#' | grep -v '^$')" \
    --region ${REGION}
fi

# Get the secret ARN
SECRET_ARN=$(aws secretsmanager describe-secret --secret-id ${SECRET_NAME} --region ${REGION} --query "ARN" --output text)

echo "Secret ARN: ${SECRET_ARN}"

# Update App Runner service to use the secret
echo "Updating App Runner service to use the secret..."
aws apprunner update-service \
  --service-arn ${SERVICE_ARN} \
  --source-configuration '{
    "ImageRepository": {
      "ImageIdentifier": "483519905303.dkr.ecr.eu-west-1.amazonaws.com/infiny/backend:latest",
      "ImageConfiguration": {
        "Port": "3000",
        "RuntimeEnvironmentVariables": {
          "NODE_ENV": "production"
        }
      },
      "ImageRepositoryType": "ECR"
    },
    "AutoDeploymentsEnabled": true
  }' \
  --health-check-configuration '{
    "Protocol": "TCP",
    "Path": "/",
    "Interval": 5,
    "Timeout": 2,
    "HealthyThreshold": 1,
    "UnhealthyThreshold": 5
  }' \
  --instance-configuration '{
    "Cpu": "1 vCPU",
    "Memory": "2 GB",
    "InstanceRoleArn": "arn:aws:iam::483519905303:role/service-role/AppRunnerECRAccessRole"
  }' \
  --region ${REGION}

echo "Environment variables have been securely stored and linked to your App Runner service!"
echo "Note: Make sure your App Runner service has the necessary IAM permissions to access Secrets Manager"

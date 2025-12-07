#!/bin/bash
set -e

# Configuration
REGION="eu-west-1"
ECR_REPO="483519905303.dkr.ecr.eu-west-1.amazonaws.com/infiny/backend"
CLUSTER_NAME="infiny-cluster"
SERVICE_NAME="infiny-backend"
TASK_FAMILY="infiny-backend"
CONTAINER_NAME="infiny-backend"
SECRET_NAME="infiny-backend-env"

# Login to ECR
echo "Logging in to ECR..."
aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ECR_REPO%/*}

# Build and push Docker image
echo "Building and pushing Docker image..."
docker build -t ${ECR_REPO}:latest .
docker push ${ECR_REPO}:latest

# Update environment variables in Secrets Manager
echo "Updating environment variables in Secrets Manager..."
JSON_SECRET="{"
while IFS='=' read -r key value || [ -n "$key" ]; do
  # Skip empty lines and comments
  if [[ -z "$key" || "$key" =~ ^# ]]; then
    continue
  fi
  # Remove any surrounding quotes from the value
  value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//')
  # Add the key-value pair to JSON
  JSON_SECRET+="\"$key\":\"$value\","
done < .env
# Remove trailing comma and close JSON object
JSON_SECRET=${JSON_SECRET%,}
JSON_SECRET+="}"

# Update the secret
aws secretsmanager update-secret \
  --secret-id ${SECRET_NAME} \
  --secret-string "$JSON_SECRET" \
  --region ${REGION}

# Get current task definition
TASK_DEF=$(aws ecs describe-task-definition \
  --task-definition ${TASK_FAMILY} \
  --region ${REGION})

# Create new task definition
NEW_TASK_DEF=$(echo $TASK_DEF | jq --arg IMAGE "${ECR_REPO}:latest" \
  '.taskDefinition | .containerDefinitions[0].image = $IMAGE | del(.taskDefinitionArn) | del(.revision) | del(.status) | del(.requiresAttributes) | del(.compatibilities) | del(.registeredAt) | del(.registeredBy)')

# Register new task definition
NEW_TASK_DEF_ARN=$(aws ecs register-task-definition \
  --region ${REGION} \
  --cli-input-json "$NEW_TASK_DEF" \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)

echo "New task definition: ${NEW_TASK_DEF_ARN}"

# Update service
echo "Updating ECS service..."
aws ecs update-service \
  --cluster ${CLUSTER_NAME} \
  --service ${SERVICE_NAME} \
  --task-definition ${NEW_TASK_DEF_ARN} \
  --region ${REGION}

echo "Service update initiated. You can monitor the deployment in the AWS Console."
echo "The new version should be deployed in a few minutes."
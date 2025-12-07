#!/bin/bash
set -e

# Configuration
REGION="eu-west-1"
ECR_REPO="483519905303.dkr.ecr.eu-west-1.amazonaws.com/infiny/backend"
CLUSTER_NAME="infiny-cluster"
SERVICE_NAME="infiny-backend"
TASK_FAMILY="infiny-backend"
CONTAINER_NAME="infiny-backend"
CONTAINER_PORT=3000
SECRET_NAME="infiny-backend-env"
EXECUTION_ROLE_NAME="ecsTaskExecutionRole"
TASK_ROLE_NAME="infinyBackendTaskRole"
VPC_ID=$(aws ec2 describe-vpcs --query "Vpcs[0].VpcId" --output text --region ${REGION})
SUBNETS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=${VPC_ID}" --query "Subnets[?MapPublicIpOnLaunch==\`true\`].SubnetId" --output text --region ${REGION})
SUBNET_IDS=(${SUBNETS})

echo "Using VPC: ${VPC_ID}"
echo "Using Subnets: ${SUBNET_IDS[@]}"

# Login to ECR
echo "Logging in to ECR..."
aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ECR_REPO%/*}

# Build and push Docker image
echo "Building and pushing Docker image..."
docker build -t ${ECR_REPO}:latest .
docker push ${ECR_REPO}:latest

# Create or update the secret with environment variables
echo "Setting up environment variables in Secrets Manager..."
SECRET_EXISTS=$(aws secretsmanager list-secrets --region ${REGION} --query "SecretList[?Name=='${SECRET_NAME}'].ARN" --output text)

# Convert env file to JSON format
echo "Converting environment variables to JSON format..."
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

if [ -z "$SECRET_EXISTS" ]; then
  echo "Creating new secret for environment variables..."
  aws secretsmanager create-secret \
    --name ${SECRET_NAME} \
    --description "Environment variables for ${SERVICE_NAME}" \
    --secret-string "$JSON_SECRET" \
    --region ${REGION}
else
  echo "Updating existing secret..."
  aws secretsmanager update-secret \
    --secret-id ${SECRET_NAME} \
    --secret-string "$JSON_SECRET" \
    --region ${REGION}
fi

# Get the secret ARN
SECRET_ARN=$(aws secretsmanager describe-secret --secret-id ${SECRET_NAME} --region ${REGION} --query "ARN" --output text)
echo "Secret ARN: ${SECRET_ARN}"

# Create security group for the service
echo "Creating security group..."
SG_EXISTS=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=${SERVICE_NAME}-sg" --query "SecurityGroups[*].GroupId" --output text --region ${REGION})

if [ -z "$SG_EXISTS" ]; then
  echo "Creating new security group..."
  SG_ID=$(aws ec2 create-security-group \
    --group-name ${SERVICE_NAME}-sg \
    --description "Security group for ${SERVICE_NAME}" \
    --vpc-id ${VPC_ID} \
    --region ${REGION} \
    --query "GroupId" --output text)

  # Allow inbound traffic on container port
  aws ec2 authorize-security-group-ingress \
    --group-id ${SG_ID} \
    --protocol tcp \
    --port ${CONTAINER_PORT} \
    --cidr 0.0.0.0/0 \
    --region ${REGION}
else
  SG_ID=${SG_EXISTS}
  echo "Using existing security group: ${SG_ID}"
fi

# Create ECS execution role if it doesn't exist
EXECUTION_ROLE_ARN=$(aws iam get-role --role-name ${EXECUTION_ROLE_NAME} --query "Role.Arn" --output text 2>/dev/null || echo "")

if [ -z "$EXECUTION_ROLE_ARN" ]; then
  echo "Creating ECS execution role..."

  # Create trust policy document
  cat > /tmp/execution-role-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

  # Create the role
  aws iam create-role \
    --role-name ${EXECUTION_ROLE_NAME} \
    --assume-role-policy-document file:///tmp/execution-role-trust-policy.json \
    --region ${REGION}

  # Attach required policies
  aws iam attach-role-policy \
    --role-name ${EXECUTION_ROLE_NAME} \
    --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy \
    --region ${REGION}

  # Add permissions for Secrets Manager
  cat > /tmp/secrets-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "${SECRET_ARN}"
    }
  ]
}
EOF

  aws iam put-role-policy \
    --role-name ${EXECUTION_ROLE_NAME} \
    --policy-name SecretsManagerAccess \
    --policy-document file:///tmp/secrets-policy.json \
    --region ${REGION}

  EXECUTION_ROLE_ARN=$(aws iam get-role --role-name ${EXECUTION_ROLE_NAME} --query "Role.Arn" --output text --region ${REGION})
fi

echo "Execution Role ARN: ${EXECUTION_ROLE_ARN}"

# Create task role if it doesn't exist
TASK_ROLE_ARN=$(aws iam get-role --role-name ${TASK_ROLE_NAME} --query "Role.Arn" --output text 2>/dev/null || echo "")

if [ -z "$TASK_ROLE_ARN" ]; then
  echo "Creating task role..."

  # Create trust policy document
  cat > /tmp/task-role-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

  # Create the role
  aws iam create-role \
    --role-name ${TASK_ROLE_NAME} \
    --assume-role-policy-document file:///tmp/task-role-trust-policy.json \
    --region ${REGION}

  # Add any additional permissions your app needs
  # For example, if your app needs to access other AWS services

  TASK_ROLE_ARN=$(aws iam get-role --role-name ${TASK_ROLE_NAME} --query "Role.Arn" --output text --region ${REGION})
fi

echo "Task Role ARN: ${TASK_ROLE_ARN}"

# Extract environment variables from .env file
ENV_VARS=$(cat .env | grep -v '^#' | grep -v '^$' | cut -d= -f1)
SECRETS_JSON="["

for VAR in $ENV_VARS; do
  SECRETS_JSON+="{\"name\":\"$VAR\",\"valueFrom\":\"${SECRET_ARN}:$VAR::\"}"
  SECRETS_JSON+=","
done

# Remove the trailing comma and close the JSON array
SECRETS_JSON=${SECRETS_JSON%,}
SECRETS_JSON+="]"

# Create task definition
echo "Creating task definition..."
cat > /tmp/task-definition.json << EOF
{
  "family": "${TASK_FAMILY}",
  "networkMode": "awsvpc",
  "executionRoleArn": "${EXECUTION_ROLE_ARN}",
  "taskRoleArn": "${TASK_ROLE_ARN}",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "${CONTAINER_NAME}",
      "image": "${ECR_REPO}:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": ${CONTAINER_PORT},
          "hostPort": ${CONTAINER_PORT},
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": ${SECRETS_JSON},
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/${SERVICE_NAME}",
          "awslogs-region": "${REGION}",
          "awslogs-stream-prefix": "ecs",
          "awslogs-create-group": "true"
        }
      }
    }
  ]
}
EOF

# Register task definition
TASK_DEFINITION=$(aws ecs register-task-definition \
  --cli-input-json file:///tmp/task-definition.json \
  --region ${REGION} \
  --query "taskDefinition.taskDefinitionArn" --output text)

echo "Task Definition: ${TASK_DEFINITION}"

# Create ECS cluster if it doesn't exist
CLUSTER_EXISTS=$(aws ecs describe-clusters --clusters ${CLUSTER_NAME} --region ${REGION} --query "clusters[?status=='ACTIVE'].clusterName" --output text)

if [ -z "$CLUSTER_EXISTS" ]; then
  echo "Creating ECS cluster..."
  aws ecs create-cluster --cluster-name ${CLUSTER_NAME} --region ${REGION}
fi

# Create or update service
SERVICE_EXISTS=$(aws ecs describe-services --cluster ${CLUSTER_NAME} --services ${SERVICE_NAME} --region ${REGION} --query "services[?status!='INACTIVE'].serviceName" --output text)

if [ -z "$SERVICE_EXISTS" ]; then
  echo "Creating new ECS service..."

  # Create load balancer
  echo "Creating load balancer..."
  LB_NAME="${SERVICE_NAME}-lb"

  # Create load balancer
  LB_ARN=$(aws elbv2 create-load-balancer \
    --name ${LB_NAME} \
    --subnets ${SUBNET_IDS[@]} \
    --security-groups ${SG_ID} \
    --region ${REGION} \
    --query "LoadBalancers[0].LoadBalancerArn" --output text)

  echo "Load Balancer ARN: ${LB_ARN}"

  # Create target group
  TG_ARN=$(aws elbv2 create-target-group \
    --name ${SERVICE_NAME}-tg \
    --protocol HTTP \
    --port ${CONTAINER_PORT} \
    --vpc-id ${VPC_ID} \
    --target-type ip \
    --health-check-path "/" \
    --health-check-interval-seconds 30 \
    --health-check-timeout-seconds 5 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 2 \
    --region ${REGION} \
    --query "TargetGroups[0].TargetGroupArn" --output text)

  echo "Target Group ARN: ${TG_ARN}"

  # Create listener
  LISTENER_ARN=$(aws elbv2 create-listener \
    --load-balancer-arn ${LB_ARN} \
    --protocol HTTP \
    --port 80 \
    --default-actions Type=forward,TargetGroupArn=${TG_ARN} \
    --region ${REGION} \
    --query "Listeners[0].ListenerArn" --output text)

  echo "Listener ARN: ${LISTENER_ARN}"

  # Create service
  aws ecs create-service \
    --cluster ${CLUSTER_NAME} \
    --service-name ${SERVICE_NAME} \
    --task-definition ${TASK_DEFINITION} \
    --desired-count 1 \
    --launch-type FARGATE \
    --platform-version LATEST \
    --network-configuration "awsvpcConfiguration={subnets=[${SUBNET_IDS[0]}],securityGroups=[${SG_ID}],assignPublicIp=ENABLED}" \
    --load-balancers "targetGroupArn=${TG_ARN},containerName=${CONTAINER_NAME},containerPort=${CONTAINER_PORT}" \
    --region ${REGION}

  # Get the load balancer DNS name
  LB_DNS=$(aws elbv2 describe-load-balancers \
    --load-balancer-arns ${LB_ARN} \
    --region ${REGION} \
    --query "LoadBalancers[0].DNSName" --output text)

  echo "Application is being deployed and will be available at: http://${LB_DNS}"

else
  echo "Updating existing ECS service..."
  aws ecs update-service \
    --cluster ${CLUSTER_NAME} \
    --service ${SERVICE_NAME} \
    --task-definition ${TASK_DEFINITION} \
    --region ${REGION}

  # Get the load balancer ARN
  LB_ARN=$(aws elbv2 describe-load-balancers \
    --names ${SERVICE_NAME}-lb \
    --region ${REGION} \
    --query "LoadBalancers[0].LoadBalancerArn" --output text)

  # Get the load balancer DNS name
  LB_DNS=$(aws elbv2 describe-load-balancers \
    --load-balancer-arns ${LB_ARN} \
    --region ${REGION} \
    --query "LoadBalancers[0].DNSName" --output text)

  echo "Service updated. Application is available at: http://${LB_DNS}"
fi

# Clean up temporary files
rm -f /tmp/task-definition.json /tmp/execution-role-trust-policy.json /tmp/task-role-trust-policy.json /tmp/secrets-policy.json

echo "Deployment completed successfully!"

#!/bin/bash
set -e

# Configuration (same as deploy-to-ecs.sh)
REGION="eu-west-1"
ECR_REPO="483519905303.dkr.ecr.eu-west-1.amazonaws.com/infiny/backend"
CLUSTER_NAME="infiny-cluster"
SERVICE_NAME="infiny-backend"
TASK_FAMILY="infiny-backend"
CONTAINER_NAME="infiny-backend"
SECRET_NAME="infiny-backend-new"
EXECUTION_ROLE_NAME="ecsTaskExecutionRole"
TASK_ROLE_NAME="infinyBackendTaskRole"

echo "Starting cleanup of ECS resources..."

# Update ECS service to 0 tasks first
echo "Scaling down ECS service..."
aws ecs update-service \
  --cluster ${CLUSTER_NAME} \
  --service ${SERVICE_NAME} \
  --desired-count 0 \
  --region ${REGION} || true

# Wait for tasks to drain
echo "Waiting for tasks to drain..."
sleep 30

# Delete ECS service
echo "Deleting ECS service..."
aws ecs delete-service \
  --cluster ${CLUSTER_NAME} \
  --service ${SERVICE_NAME} \
  --region ${REGION} \
  --force || true

# Delete task definitions
echo "Deregistering task definitions..."
TASK_DEFINITIONS=$(aws ecs list-task-definitions \
  --family-prefix ${TASK_FAMILY} \
  --region ${REGION} \
  --query 'taskDefinitionArns[]' \
  --output text)

for td in ${TASK_DEFINITIONS}; do
  echo "Deregistering task definition: ${td}"
  aws ecs deregister-task-definition \
    --task-definition ${td} \
    --region ${REGION} || true
done

# Delete the cluster
echo "Deleting ECS cluster..."
aws ecs delete-cluster \
  --cluster ${CLUSTER_NAME} \
  --region ${REGION} || true

# Delete ECR repository
echo "Deleting ECR repository..."
REPO_NAME=$(echo ${ECR_REPO} | cut -d'/' -f2-)
aws ecr delete-repository \
  --repository-name ${REPO_NAME} \
  --force \
  --region ${REGION} || true

# Delete CloudWatch log group
echo "Deleting CloudWatch log group..."
aws logs delete-log-group \
  --log-group-name "/ecs/${SERVICE_NAME}" \
  --region ${REGION} || true

# Delete security group
echo "Deleting security group..."
SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=${SERVICE_NAME}-sg" \
  --query "SecurityGroups[*].GroupId" \
  --output text \
  --region ${REGION})

if [ ! -z "$SG_ID" ]; then
  aws ec2 delete-security-group \
    --group-id ${SG_ID} \
    --region ${REGION} || true
fi

# Delete IAM roles and policies
echo "Cleaning up IAM roles..."

# Task Role cleanup
if aws iam get-role --role-name ${TASK_ROLE_NAME} >/dev/null 2>&1; then
  # Get and detach all policies
  ATTACHED_POLICIES=$(aws iam list-attached-role-policies \
    --role-name ${TASK_ROLE_NAME} \
    --query 'AttachedPolicies[*].PolicyArn' \
    --output text)

  for policy in ${ATTACHED_POLICIES}; do
    aws iam detach-role-policy \
      --role-name ${TASK_ROLE_NAME} \
      --policy-arn ${policy}
  done

  # Delete inline policies
  INLINE_POLICIES=$(aws iam list-role-policies \
    --role-name ${TASK_ROLE_NAME} \
    --query 'PolicyNames[]' \
    --output text)

  for policy in ${INLINE_POLICIES}; do
    aws iam delete-role-policy \
      --role-name ${TASK_ROLE_NAME} \
      --policy-name ${policy}
  done

  # Delete the role
  aws iam delete-role --role-name ${TASK_ROLE_NAME}
fi

# Execution Role cleanup
if aws iam get-role --role-name ${EXECUTION_ROLE_NAME} >/dev/null 2>&1; then
  # Get and detach all policies
  ATTACHED_POLICIES=$(aws iam list-attached-role-policies \
    --role-name ${EXECUTION_ROLE_NAME} \
    --query 'AttachedPolicies[*].PolicyArn' \
    --output text)

  for policy in ${ATTACHED_POLICIES}; do
    aws iam detach-role-policy \
      --role-name ${EXECUTION_ROLE_NAME} \
      --policy-arn ${policy}
  done

  # Delete inline policies
  INLINE_POLICIES=$(aws iam list-role-policies \
    --role-name ${EXECUTION_ROLE_NAME} \
    --query 'PolicyNames[]' \
    --output text)

  for policy in ${INLINE_POLICIES}; do
    aws iam delete-role-policy \
      --role-name ${EXECUTION_ROLE_NAME} \
      --policy-name ${policy}
  done

  # Delete the role
  aws iam delete-role --role-name ${EXECUTION_ROLE_NAME}
fi

# Delete Secrets Manager secret
echo "Deleting secret from Secrets Manager..."
aws secretsmanager delete-secret \
  --secret-id ${SECRET_NAME} \
  --force-delete-without-recovery \
  --region ${REGION} || true

echo "Cleanup completed!"
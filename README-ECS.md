# Deploying NestJS to ECS with Fargate

This guide explains how to deploy your NestJS application to AWS ECS with Fargate using your existing ECR repository.

## Why ECS + Fargate?

ECS with Fargate offers several advantages over App Runner:

1. **More control** over your infrastructure and deployment configuration
2. **Better scaling options** for handling traffic spikes
3. **Deeper integration** with other AWS services
4. **More mature service** with a larger user base and more documentation
5. **Cost optimization** options for different workloads

## Prerequisites

- AWS Account
- AWS CLI configured
- Docker installed locally
- Your NestJS application code

## Deployment Script

The `deploy-to-ecs.sh` script handles the entire deployment process:

1. **Builds and pushes** your Docker image to ECR
2. **Stores environment variables** securely in AWS Secrets Manager
3. **Creates necessary IAM roles** with appropriate permissions
4. **Sets up a security group** for your application
5. **Creates an ECS cluster** if it doesn't exist
6. **Defines your task definition** with the correct container configuration
7. **Creates an Application Load Balancer** to route traffic to your containers
8. **Deploys your service** with the desired configuration

## How to Deploy

1. Make the script executable:
   ```bash
   chmod +x deploy-to-ecs.sh
   ```

2. Run the deployment script:
   ```bash
   ./deploy-to-ecs.sh
   ```

3. The script will output the URL where your application will be available once deployment is complete.

## Environment Variables

Your environment variables from your `.env` file are securely stored in AWS Secrets Manager and injected into your containers at runtime. This keeps sensitive information like database credentials secure.

## Monitoring and Scaling

1. **CloudWatch Logs**: Your application logs are automatically sent to CloudWatch Logs
2. **Scaling**: You can adjust the desired count of tasks in your service to scale horizontally
3. **Auto Scaling**: You can set up auto scaling based on CPU/memory usage or custom metrics

## Troubleshooting

If you encounter issues:

1. Check the CloudWatch Logs for your service
2. Verify that your security group allows traffic on the container port
3. Ensure your Supabase database allows connections from your ECS tasks
4. Check that your IAM roles have the necessary permissions

## Cleanup

To remove all resources created by this deployment:

1. Delete the ECS service
2. Delete the load balancer and target group
3. Delete the task definition
4. Delete the security group
5. Delete the secrets from Secrets Manager
6. Delete the IAM roles if they're no longer needed

## Next Steps

- Set up a custom domain name with Route 53
- Configure HTTPS with AWS Certificate Manager
- Set up auto scaling for your service
- Implement a CI/CD pipeline for automated deployments

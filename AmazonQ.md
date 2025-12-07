# Deploying NestJS Application to AWS App Runner

This guide explains how to deploy your NestJS application to AWS App Runner using your existing ECR repository.

## Prerequisites

- AWS Account
- AWS CLI configured
- Docker installed locally (for testing)
- Your NestJS application code

## Files Created

1. **Dockerfile** - Defines how to build the Docker image for your application
2. **apprunner.yaml** - Configuration file for AWS App Runner (for source code deployments)
3. **deploy-to-apprunner.sh** - Script to build, push, and deploy your application
4. **setup-secrets.sh** - Script to set up environment variables securely

## Deployment Steps

### Option 1: Using the Deployment Scripts

The easiest way to deploy is using the provided scripts:

1. **Deploy your application**:
   ```bash
   # Make the scripts executable if needed
   chmod +x deploy-to-apprunner.sh setup-secrets.sh
   
   # Deploy the application
   ./deploy-to-apprunner.sh
   
   # Set up environment variables securely
   ./setup-secrets.sh
   ```

### Option 2: Manual Deployment

1. **Build and push your Docker image to your ECR repository**:
   ```bash
   # Login to ECR
   aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin 483519905303.dkr.ecr.eu-west-1.amazonaws.com
   
   # Build the Docker image
   docker build -t 483519905303.dkr.ecr.eu-west-1.amazonaws.com/infiny/backend:latest .
   
   # Push the image to ECR
   docker push 483519905303.dkr.ecr.eu-west-1.amazonaws.com/infiny/backend:latest
   ```

2. **Create App Runner service**:
   - Go to AWS Console > App Runner
   - Click "Create service"
   - Select "Container registry" as source
   - Choose your ECR image: `483519905303.dkr.ecr.eu-west-1.amazonaws.com/infiny/backend:latest`
   - Configure service settings (name, environment variables, etc.)
   - Set port to 3000
   - Configure any environment variables needed by your application
   - Create service

### Option 3: Using AWS CLI

1. **Create App Runner service from CLI**:
   ```bash
   aws apprunner create-service \
     --service-name infiny-backend \
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
     --instance-configuration '{
       "Cpu": "1 vCPU",
       "Memory": "2 GB"
     }' \
     --region eu-west-1
   ```

## Important Notes

1. **Database Connection**: 
   - Make sure your database is accessible from App Runner
   - Your app is using Supabase PostgreSQL (as seen in your .env file)
   - Make sure the database connection string is properly set in environment variables

2. **Environment Variables**:
   - The setup-secrets.sh script will securely store your environment variables in AWS Secrets Manager
   - This includes sensitive information like database credentials and API keys

3. **Networking**:
   - If your app needs to connect to other AWS services, configure VPC settings
   - Ensure your Supabase database allows connections from App Runner

4. **Scaling**:
   - App Runner can automatically scale your application based on traffic

5. **Monitoring**:
   - Use AWS CloudWatch to monitor your application

## Troubleshooting

- Check App Runner logs in the AWS Console
- Ensure all environment variables are correctly set
- Verify database connection string is correct
- Check that your application is listening on the correct port (3000)

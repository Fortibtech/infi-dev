FROM node:20-alpine AS builder

WORKDIR /app

# Copy package.json and yarn.lock
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN yarn build
RUN ls -la dist/  # Add this to verify build output

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package.json and yarn.lock
COPY package.json yarn.lock ./

# Install production dependencies only
RUN yarn install --frozen-lockfile --production

# Copy Prisma schema and necessary files
COPY prisma ./prisma/
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Verify the dist directory contents
RUN ls -la dist/

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["node", "dist/src/main"]

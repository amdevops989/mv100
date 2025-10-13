# ===== Base image =====
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Enable Yarn via Corepack
RUN corepack enable && corepack prepare yarn@stable --activate

# Copy only package files first for caching
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install

# Copy all source code
COPY . .

# Expose default port (if needed)
EXPOSE 3005

# Use Node to run your index.js
CMD ["node", "index.js"]

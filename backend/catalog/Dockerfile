# ===== Base image =====
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Enable Yarn via Corepack
RUN corepack enable && corepack prepare yarn@stable --activate

# Copy package files for caching
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install

# Copy all source code
COPY . .

# Expose app port
EXPOSE 3001

# Run the service
CMD ["node", "index.js"]

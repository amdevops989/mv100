# ===== Base image =====
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Enable Yarn via Corepack
# RUN corepack enable && corepack prepare yarn@stable --activate

# Copy package files and lockfile for dependency caching
COPY package*.json ./

# Install dependencies (express must be listed in package.json!)
RUN npm install

# Copy all source code
COPY . .

# Expose app port
EXPOSE 3000

# Run the service
CMD ["node", "index.js"]

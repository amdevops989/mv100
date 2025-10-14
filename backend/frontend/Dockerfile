# --- Build stage ---
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build

# --- Nginx stage ---
FROM nginx:alpine

# Copy built app to nginx html directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Optional: use a minimal nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

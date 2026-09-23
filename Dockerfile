FROM node:24-alpine

WORKDIR /app

# Native module build fallback for better-sqlite3 (prebuilds usually win)
RUN apk add --no-cache python3 make g++

# Workspace manifests
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY backend/package.json backend/
COPY wcp-web/package.json wcp-web/

RUN npm ci

# Build shared package, then the API
COPY packages/shared packages/shared
COPY backend backend
RUN npm run build:shared && npm --workspace wcp-api run build

ENV NODE_ENV=production
EXPOSE 3001

CMD ["npm", "--workspace", "wcp-api", "start"]

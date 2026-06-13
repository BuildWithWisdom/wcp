FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript code
RUN npm run build

# Expose the port (Cloud Run will override this via the PORT environment variable)
EXPOSE 3001

# Run the server
CMD ["node", "dist/server.js"]

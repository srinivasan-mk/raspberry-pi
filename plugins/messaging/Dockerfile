# Multi-arch lightweight Node.js image for Raspberry Pi 4B (ARM64)
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* tsconfig.json ./
RUN npm install

# Copy source code and compile
COPY src/ ./src/
RUN npm run build

# Create session directory for WhatsApp credentials
RUN mkdir -p sessions/whatsapp

ENV NODE_ENV=production

# Read JSON command from stdin and write JSON result to stdout
ENTRYPOINT ["node", "dist/index.js"]

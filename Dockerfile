FROM node:18-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ENTRYPOINT ["node", "/app/index.js"]
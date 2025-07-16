FROM node:18-slim

RUN apt-get update && apt-get install -y git
RUN git config --global --add safe.directory /github/workspace

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ENTRYPOINT ["node", "/app/index.js"]
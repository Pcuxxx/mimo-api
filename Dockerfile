FROM node:18-alpine

RUN npm install -g @mimo-ai/cli

WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .

EXPOSE 3456

CMD ["node", "server.js"]

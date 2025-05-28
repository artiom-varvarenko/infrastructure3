FROM node:18-alpine

WORKDIR /app

COPY package.json ./

RUN npm install --only=production && \
    npm cache clean --force

COPY . .

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 4000

CMD ["node", "server.js"]
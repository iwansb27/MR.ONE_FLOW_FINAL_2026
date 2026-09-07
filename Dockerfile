FROM node:20-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app/backend

COPY backend/package.json ./
RUN npm install --omit=dev --ignore-scripts

COPY backend/src ./src
COPY queue /app/queue

EXPOSE 8787

CMD ["node", "src/server.js"]

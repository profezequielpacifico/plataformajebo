FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --omit=dev

COPY knexfile.js ./
COPY migrations ./migrations
COPY scripts ./scripts
COPY src ./src

ENV NODE_ENV=production
EXPOSE 3000

RUN mkdir -p /app/logs /app/uploads \
    && chown -R node:node /app/logs /app/uploads \
    && chmod 750 /app/logs /app/uploads

USER node

CMD ["node", "scripts/docker-entrypoint.js"]

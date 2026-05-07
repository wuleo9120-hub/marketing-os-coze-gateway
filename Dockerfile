FROM node:24-alpine

WORKDIR /app

RUN apk add --no-cache postgresql-client

COPY package.json ./
COPY apps ./apps
COPY docs ./docs
COPY infra ./infra
COPY integrations ./integrations
COPY packages ./packages
COPY scripts ./scripts

RUN mkdir -p /data

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8787
ENV STORE_PATH=/data/dev-store.json

EXPOSE 8787

CMD ["node", "apps/api/src/server.mjs"]

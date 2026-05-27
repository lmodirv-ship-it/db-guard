FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g bun
COPY package.json bun.lockb* package-lock.json* ./
RUN bun install --frozen-lockfile || npm install
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]

FROM oven/bun:1 AS builder

WORKDIR /app

COPY package.json bun.lock* ./
RUN bun i --frozen-lockfile

COPY . .
RUN bun run build

FROM oven/bun:1-slim AS production

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY entrypoint.sh ./

RUN bun i -g serve && chmod +x entrypoint.sh

EXPOSE 4173

CMD ["./entrypoint.sh"]

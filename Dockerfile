FROM oven/bun:1 AS builder

WORKDIR /app

COPY package.json bun.lock* ./
RUN bun i --frozen-lockfile

COPY . .
RUN bun run build

FROM oven/bun:1-slim AS production

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

EXPOSE 4173

CMD ["bun", "run", "preview", "--host", "0.0.0.0"]

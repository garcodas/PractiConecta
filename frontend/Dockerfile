# El contexto de construcción es este directorio y nada más.
FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable
ARG GATEWAY_URL=http://api-gateway:4000
ENV GATEWAY_URL=$GATEWAY_URL NEXT_TELEMETRY_DISABLED=1
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
USER node
CMD ["node", "server.js"]

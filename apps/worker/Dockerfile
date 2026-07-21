FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/worker/package.json apps/worker/package.json
COPY packages ./packages
RUN npm install --omit=dev=false

FROM base AS build
COPY apps/worker apps/worker
COPY apps/api/prisma apps/api/prisma
RUN npx prisma generate --schema apps/api/prisma/schema.prisma
RUN npm run build -w apps/worker

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/worker/dist ./apps/worker/dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/worker/node_modules ./apps/worker/node_modules
CMD ["node", "apps/worker/dist/index.js"]

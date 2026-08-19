FROM node:22-alpine AS build

RUN corepack enable

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/backend/package.json packages/backend/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json

RUN pnpm install --frozen-lockfile --filter=@eco-globe/backend...

COPY packages/backend packages/backend
COPY packages/typescript-config packages/typescript-config

RUN pnpm --filter=@eco-globe/backend build

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080

WORKDIR /workspace

COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/packages/backend/package.json ./packages/backend/package.json
COPY --from=build /workspace/packages/backend/node_modules ./packages/backend/node_modules
COPY --from=build /workspace/packages/backend/dist ./packages/backend/dist

WORKDIR /workspace/packages/backend

EXPOSE 8080

CMD ["node", "dist/index.js"]

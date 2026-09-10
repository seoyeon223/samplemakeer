FROM node:20-alpine
RUN apk add --no-cache openssl

EXPOSE 3000

WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY extensions/gwp-free-gift-discount/package.json ./extensions/gwp-free-gift-discount/package.json

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm exec prisma generate
RUN pnpm run build

CMD ["pnpm", "run", "docker-start"]

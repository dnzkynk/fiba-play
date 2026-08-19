# FIBA Oyunları portalı (Next.js + watcher)
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Canlı destek widget'ı (boşsa hiç yüklenmez) — derleme zamanında gömülür
ARG NEXT_PUBLIC_TAWK_SRC=""
ENV NEXT_PUBLIC_TAWK_SRC=$NEXT_PUBLIC_TAWK_SRC
RUN npm run build && node scripts/compress-wasm.mjs

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3000
CMD npm start -- -p ${PORT:-3000}

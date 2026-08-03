# FIBA yamalı bgammon (tavla) sunucusu
# Railway ayarı: Root Directory BOŞ + RAILWAY_DOCKERFILE_PATH=deploy/bgammon/Dockerfile
# (build bağlamı repo köküdür; kaynak yolu aşağıda açıkça yazılıdır)
FROM golang:1.24-alpine AS build
WORKDIR /src
COPY deploy/bgammon/ .
RUN go build -tags full -o /bgammon-server ./cmd/bgammon-server

FROM alpine:3.20
COPY --from=build /bgammon-server /usr/local/bin/bgammon-server
# WS $PORT'tan dinlenir; TLS'i Railway üstlenir
CMD bgammon-server -tcp localhost:1337 -ws 0.0.0.0:${PORT:-1338}

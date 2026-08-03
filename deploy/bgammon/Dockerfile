# FIBA yamalı bgammon (tavla) sunucusu
# Build bağlamı repo kökü de olsa bu klasörün kendisi de olsa çalışır.
FROM golang:1.24-alpine AS build
WORKDIR /ctx
COPY . .
RUN SRC=/ctx; [ -d /ctx/deploy/bgammon ] && SRC=/ctx/deploy/bgammon; \
    cd $SRC && go build -tags full -o /bgammon-server ./cmd/bgammon-server

FROM alpine:3.20
COPY --from=build /bgammon-server /usr/local/bin/bgammon-server
# WS $PORT'tan dinlenir; TLS'i Railway üstlenir
CMD bgammon-server -tcp localhost:1337 -ws 0.0.0.0:${PORT:-1338}

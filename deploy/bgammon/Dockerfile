# FIBA yamalı bgammon sunucusu (webhook + auto-join + TLS'siz WS yamaları dahil)
FROM golang:1.24-alpine AS build
WORKDIR /src
COPY . .
RUN go build -tags full -o /bgammon-server ./cmd/bgammon-server

FROM alpine:3.20
COPY --from=build /bgammon-server /usr/local/bin/bgammon-server
# Railway $PORT verir; WS o porttan dinlenir, TLS'i Railway üstlenir
CMD bgammon-server -tcp localhost:1337 -ws 0.0.0.0:${PORT:-1338}

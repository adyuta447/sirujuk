FROM golang:1.23-alpine AS build
WORKDIR /src
COPY . .
RUN go build -o /out/sirujuk ./cmd

FROM alpine:3.20
COPY --from=build /out/sirujuk /sirujuk
EXPOSE 8080
ENTRYPOINT ["/sirujuk"]

# Pinned patch: a floating tag makes builds unreproducible. Bump when govulncheck reports a stdlib fix.
FROM golang:1.26.10-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download && go mod verify
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/sirujuk ./cmd

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/sirujuk /sirujuk
USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/sirujuk"]

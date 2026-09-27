FROM golang:1.23-alpine
WORKDIR /src
COPY backend-go .
RUN go build -o /sirujuk ./cmd
CMD ["/sirujuk"]

FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY go.mod ./
# COPY go.sum ./
COPY . .
RUN go build -o /heysakhi-engine ./cmd/main.go

FROM alpine:3.19
WORKDIR /app
COPY --from=builder /heysakhi-engine /app/heysakhi-engine

EXPOSE 8080
CMD ["/app/heysakhi-engine"]


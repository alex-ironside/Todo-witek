# syntax=docker/dockerfile:1
# Build a static serve binary, then ship it in a distroless non-root image.
# The DB is external (Neon); DATABASE_URL is provided at runtime.
FROM golang:1.26.6-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/serve ./cmd/serve

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/serve /serve
EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/serve"]

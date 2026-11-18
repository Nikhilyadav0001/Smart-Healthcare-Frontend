# Stage 1: Build React/Vite assets
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Build metrics exporter
FROM golang:1.27-alpine AS exporter-builder
WORKDIR /src
COPY exporter.go .
RUN CGO_ENABLED=0 go build -ldflags="-w -s" -o /bin/frontend-exporter exporter.go

# Stage 3: Serve with Nginx
FROM nginx:alpine
RUN apk add --no-cache ca-certificates
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=exporter-builder /bin/frontend-exporter /bin/frontend-exporter
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]

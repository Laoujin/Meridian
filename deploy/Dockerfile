FROM oven/bun:1-alpine AS builder
WORKDIR /build

COPY app/package.json app/bun.lock ./app/
RUN cd app && bun install

COPY app ./app
COPY data ./data
RUN cd app && bun run build

FROM nginx:alpine
COPY --from=builder /build/app/dist /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

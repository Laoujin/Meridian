FROM node:22 AS builder
WORKDIR /build

COPY app/package.json ./app/
RUN cd app && npm install

COPY app ./app
COPY data ./data
RUN cd app && npm run build

FROM nginx:alpine
COPY --from=builder /build/app/dist /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

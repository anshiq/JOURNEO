FROM node:22.23-alpine AS build
WORKDIR /repo
COPY frontend/package.json frontend/package-lock.json frontend/
RUN cd frontend && npm ci
COPY contracts contracts
COPY frontend frontend
RUN cd frontend && npm run build

FROM nginx:stable-alpine
COPY --from=build /repo/frontend/dist /usr/share/nginx/html
COPY frontend/nginx/default.conf.template /etc/nginx/templates/default.conf.template
ENV PORT=80

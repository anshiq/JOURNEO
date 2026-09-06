FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps
COPY . .
ARG VITE_JOURNEY_SERVICE_URL
ARG VITE_ANALYTICS_SERVICE_URL
ARG VITE_AI_SERVICE_URL
ARG VITE_CONNECTORS_SERVICE_URL
ENV VITE_JOURNEY_SERVICE_URL=$VITE_JOURNEY_SERVICE_URL
ENV VITE_ANALYTICS_SERVICE_URL=$VITE_ANALYTICS_SERVICE_URL
ENV VITE_AI_SERVICE_URL=$VITE_AI_SERVICE_URL
ENV VITE_CONNECTORS_SERVICE_URL=$VITE_CONNECTORS_SERVICE_URL
RUN npm run build
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["sh","-c","sed -i \"s/listen 80;/listen ${PORT:-80};/\" /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]

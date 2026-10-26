FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Build-time configuration. The public repository tracks no .env.production,
# so the production values are passed in by the deployment as build args and
# exported for `vite build`, which reads VITE_-prefixed variables from the
# environment. An empty VITE_CONVERT_API_URL disables the PDF feature.
ARG VITE_CONVERT_API_URL=
ARG VITE_IMAGE_FIELDS=
ENV VITE_CONVERT_API_URL=$VITE_CONVERT_API_URL
ENV VITE_IMAGE_FIELDS=$VITE_IMAGE_FIELDS

COPY . .
RUN npm run build

FROM nginx:alpine
RUN rm /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80 443

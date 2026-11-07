FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN npm run build
RUN find dist -type f \( -name '*.js' -o -name '*.css' -o -name '*.html' -o -name '*.svg' -o -name '*.json' \) -exec gzip -9 -k {} +

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY security_headers.conf /etc/nginx/security_headers.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

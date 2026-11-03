FROM nginx:1.27-alpine
COPY helmerch.html /usr/share/nginx/html/index.html
COPY must-logo.webp /usr/share/nginx/html/must-logo.webp
EXPOSE 80

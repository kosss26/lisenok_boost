FROM node:24-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv ffmpeg \
    && rm -rf /var/lib/apt/lists/*
RUN python3 -m venv /opt/build-venv
ENV PATH="/opt/build-venv/bin:${PATH}"
WORKDIR /app
COPY requirements-build.txt ./
RUN pip install --no-cache-dir -r requirements-build.txt
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
FROM nginx:stable-alpine
COPY deploy/nginx-container.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

# Modern Debian base for current FFmpeg and Intel media drivers.
FROM node:20-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       ffmpeg ca-certificates \
       libva2 libva-drm2 intel-media-va-driver i965-va-driver \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /home/node/app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build
EXPOSE 8000
CMD ["npm", "start"]

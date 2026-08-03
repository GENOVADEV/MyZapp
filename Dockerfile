FROM node:22-alpine
RUN apk add --no-cache \
    git \
    ffmpeg \
    libwebp-tools \
    python3 \
    make \
    g++
WORKDIR /rgnk
RUN mkdir -p temp
ENV TZ=Asia/Kolkata
RUN npm install -g --force yarn pm2
COPY . .
RUN yarn install --no-immutable || yarn install
CMD ["npm", "start"]

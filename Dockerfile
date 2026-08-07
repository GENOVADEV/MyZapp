FROM node:22-alpine
RUN apk add --no-cache \
    git \
    openssh-client \
    ffmpeg \
    libwebp-tools \
    python3 \
    make \
    g++
WORKDIR /rgnk
RUN git config --global url."https://github.com/".insteadOf "ssh://git@github.com/" && \
    git config --global url."https://github.com/".insteadOf "git@github.com:"
RUN mkdir -p temp
ENV TZ=Asia/Kolkata
RUN npm install -g --force pm2
COPY ./myzapp-server ./
RUN npm install --legacy-peer-deps
CMD ["node", "index.js"]

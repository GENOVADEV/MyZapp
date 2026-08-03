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
RUN git config --system url."https://github.com/".insteadOf "ssh://git@github.com/" && \
    git config --system url."https://github.com/".insteadOf "git@github.com:"
RUN mkdir -p temp
ENV TZ=Asia/Kolkata
RUN npm install -g --force yarn pm2
COPY . .
RUN yarn install --no-immutable || yarn install
CMD ["npm", "start"]

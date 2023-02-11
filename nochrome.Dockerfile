FROM node:16
ENV LC_ALL=C.UTF-8
ENV GA_OAUTH_CID=
ENV GA_OAUTH_CS=
ENV GA_SDM_PID=
ENV HTTP_PORT=3000
ENV RTSP_CLIENT_PORT=554
ENV RTSP_SERVER_PORT=6554
ENV RTSP_RTP_START=10000
ENV RTSP_RTP_COUNT=10000
ENV GA_OAUTH_RDR=
ENV WEBRTC_RESOLUTION_WIDTH=640
ENV WEBRTC_RESOLUTION_HEIGHT=480
ENV DEBUG=nest-rtsp:*
WORKDIR /home/nest-rtsp
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - 
RUN sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'
RUN apt-get update -y
RUN apt-get install ffmpeg gconf-service libasound2 libatk1.0-0 libatk-bridge2.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget libgbm-dev -y
COPY package*.json ./
RUN NODE_ENV=build && npm ci && NODE_ENV=production
COPY . .
EXPOSE 3000/tcp
EXPOSE 554/tcp
EXPOSE 554/udp
EXPOSE 10000-20000/tcp
EXPOSE 10000-20000/udp
VOLUME /home/nest-rtsp/persistent/
CMD ["node", "/home/nest-rtsp/dockerized.js"]
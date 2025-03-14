FROM node:21.6.1-slim

WORKDIR /app
COPY package*.json ./

RUN npm ci
COPY . .
RUN npm run build

CMD [ "node", "./dist/main.js" ]
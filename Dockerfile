FROM node:18.20-alpine3.18 as base
WORKDIR /usr/src/app
RUN npm i -g @angular/cli
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 4200
CMD ["ng","serve", "--host=0.0.0.0"]

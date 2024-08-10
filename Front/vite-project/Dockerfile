FROM --platform=linux/amd64 node:21-alpine as build
WORKDIR /usr/src/app
COPY . /usr/src/app
RUN npm install
EXPOSE 5173
CMD [ "npm", "run", "dev", "--", "--host" ]

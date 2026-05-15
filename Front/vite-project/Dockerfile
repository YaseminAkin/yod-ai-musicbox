FROM node:22-alpine
WORKDIR /usr/src/app
COPY . /usr/src/app
RUN npm install
EXPOSE 5173
CMD [ "npm", "run", "dev", "--", "--host" ]

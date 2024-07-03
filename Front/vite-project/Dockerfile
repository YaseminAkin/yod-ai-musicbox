# Use the official Node.js image as the base image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Install the global `serve` package
RUN npm install -g serve

# Copy the rest of the application code to the working directory
COPY . .

# Build the application
RUN npm run build

# Expose the port on which the application will run
EXPOSE 5173

# Use `serve` to serve the build directory
CMD ["serve", "-s", "dist"]

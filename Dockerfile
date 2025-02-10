# Use official Node.js image
FROM node:18

# Set working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the entire project
COPY . .

# Expose the application port (match this with your backend server port)
EXPOSE 5000

# Start the application
CMD ["npm", "start"]

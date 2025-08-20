FROM node:18-alpine

WORKDIR /app

# Copy package files from backend
COPY backend/package*.json ./

# Install dependencies
RUN npm install

# Copy backend source code
COPY backend/ .

# Expose port
EXPOSE 5000

# Add build timestamp to force rebuild
RUN echo "Build timestamp: $(date)" > build-info.txt

# Start the application
CMD ["npm", "start"]

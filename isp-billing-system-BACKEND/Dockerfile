# Use Node.js LTS (Alpine for smaller image size)
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package*.json ./

# Install dependencies (ci for clean, deterministic install)
# Only install production dependencies if you want a smaller image, 
# but we might need devDeps if build scripts run. 
# For now, standard install.
# Install dependencies with legacy peer deps to avoid ERESOLVE errors (due to jest/jest-watch-typeahead conflict)
RUN npm install --legacy-peer-deps

# Copy the rest of the application
COPY . .

# Expose the API port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]

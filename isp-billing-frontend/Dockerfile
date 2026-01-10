# Stage 1: Build the React application
FROM node:18-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
# Install dependencies (using install instead of ci to be more lenient with lockfile)
RUN npm install

# Copy source code
COPY . .

# Build args usually cannot be accessed in the build stage unless declared
# We can inject REACT_APP_API_URL if we want it hardcoded at build time,
# or handle it differently. For now, we assume relative path /api via proxy.
# So we don't necessarily need to set it if the app defaults to /api or localhost:3000/api
# But if it defaults to localhost:3000/api, the browser outside container will try 
# to hit localhost:3000. That works only if backend is exposed on 3000 to host.
# Current plan exposes backend on 3000.
# However, for cleaner production setup, we might want /api proxy.
# Let's support both. 
# Set API URL build argument (default to relatively /api if not provided)
ARG REACT_APP_API_URL=/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL

RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy the build output to replace the default nginx contents.
COPY --from=build /app/build /usr/share/nginx/html

# Remove default nginx configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy our custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]

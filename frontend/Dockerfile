FROM node:20-slim

WORKDIR /app

# Copy dependency configuration
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy all project files
COPY . .

# Expose Vite dev port
EXPOSE 3000

# Start dev server
CMD ["npm", "run", "dev"]

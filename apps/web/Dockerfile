# ============================================
# DOCKERFILE — Frontend (Next.js)
# ============================================

FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.10.0 --activate

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build argument for backend URL
ARG BACKEND_URL=http://localhost:8080
ENV BACKEND_URL=$BACKEND_URL

# Build the application
RUN pnpm build

# Expose port
EXPOSE 3000

# Start the application
CMD ["pnpm", "start"]

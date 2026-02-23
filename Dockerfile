# Use an official Node runtime as a parent image, choosing a Debian-based slim image
# to easily install Python and Playwright dependencies
FROM node:20-bookworm-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Install Python, pip, uv, and Playwright system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    # Playwright dependencies
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    && rm -rf /var/lib/apt/lists/*

# Install uv (astral-sh/uv)
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:${PATH}"

# Set the working directory
WORKDIR /app

# Copy the entire project
COPY . .

# --- Python Scraper Setup ---
WORKDIR /app/scraper
# Use uv to install python dependencies
RUN uv venv
RUN uv pip install -r pyproject.toml
# Install playwright browser binaries internally
RUN uv run playwright install chromium

# --- Node.js Next.js Setup ---
WORKDIR /app
# Install Node dependencies
RUN npm ci

# NEXT_PUBLIC_* variables are inlined into the JS bundle at build time by Next.js.
# They must be available during `npm run build`, not just at runtime.
# We declare them as ARGs so they can be passed in from render.yaml via buildArgs.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG SUPABASE_SERVICE_ROLE_KEY

# Make them available as ENV so Next.js can read them during the build
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY

RUN npm run build

# Expose the standard Next.js port
EXPOSE 3000

# Set Node environment to production
ENV NODE_ENV=production

# Start the Next.js production server
CMD ["npm", "start"]

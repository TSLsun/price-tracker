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

# Build the Next.js application
# Note: Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 
# are available at build time if your Next.js app needs them for static generation.
# In a standard full-stack Next.js app on Render, they can be injected at runtime,
# but Next.js build sometimes checks them. We pass them in render.yaml.
RUN npm run build

# Expose the standard Next.js port
EXPOSE 3000

# Set Node environment to production
ENV NODE_ENV=production

# Start the Next.js production server
CMD ["npm", "start"]

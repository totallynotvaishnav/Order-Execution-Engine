#!/bin/bash
# Render build script

echo "Installing dependencies..."
npm install

echo "Building TypeScript..."
npm run build

echo "Initializing database schema..."
# Only run if DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
  echo "DATABASE_URL found, creating schema..."
  # Install psql if not available (Render provides it)
  npm run db:init || echo "Database initialization will be done on first run"
else
  echo "No DATABASE_URL - skipping database initialization"
fi

echo "Build complete!"

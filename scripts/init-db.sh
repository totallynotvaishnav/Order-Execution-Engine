#!/bin/bash

# Database initialization script for DEX Transaction Processor
# This script creates the database schema in PostgreSQL

echo "Creating database schema..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL environment variable is not set"
  echo "Example: postgresql://user:password@localhost54 32/database_name"
  exit 1
fi

# Run schema creation
psql "$DATABASE_URL" -f "$(dirname "$0")/../src/modules/database/schema.sql"

if [ $? -eq 0 ]; then
  echo "✓ Database schema created successfully"
else
  echo "✗ Failed to create database schema"
  exit 1
fi

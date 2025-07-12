#!/bin/bash

echo "🚀 Ludo Game Backend Setup & Test Script"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
print_status "Checking Node.js installation..."
if command -v node > /dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    print_success "Node.js $NODE_VERSION is installed"
else
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if npm is installed
print_status "Checking npm installation..."
if command -v npm > /dev/null 2>&1; then
    NPM_VERSION=$(npm --version)
    print_success "npm $NPM_VERSION is installed"
else
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies
print_status "Installing dependencies..."
if npm install; then
    print_success "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Check PostgreSQL
print_status "Checking PostgreSQL..."
if systemctl is-active --quiet postgresql; then
    print_success "PostgreSQL is running"
else
    print_warning "PostgreSQL is not running. Attempting to start..."
    if sudo systemctl start postgresql; then
        print_success "PostgreSQL started successfully"
    else
        print_error "Failed to start PostgreSQL. Please check your installation."
        exit 1
    fi
fi

# Run database migration
print_status "Running database migration..."
if npm run db:migrate; then
    print_success "Database migration completed"
else
    print_warning "Database migration failed. You may need to check your database configuration."
fi

# Start the server in background
print_status "Starting the server..."
npm run start:no-redis &
SERVER_PID=$!

# Wait for server to start
print_status "Waiting for server to start..."
sleep 5

# Test if server is running
print_status "Testing server health..."
if curl -s http://localhost:3000/health > /dev/null; then
    print_success "Server is running successfully!"
else
    print_error "Server failed to start or is not responding"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

# Test Swagger documentation
print_status "Testing Swagger API documentation..."
if npm run test:swagger; then
    print_success "Swagger API documentation is working!"
else
    print_warning "Swagger test had some issues, but basic server is running"
fi

# Display information
echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📚 Access Points:"
echo "   Server: http://localhost:3000"
echo "   Health Check: http://localhost:3000/health"
echo "   API Documentation: http://localhost:3000/api-docs"
echo ""
echo "🧪 Testing Commands:"
echo "   npm run test:swagger   - Test Swagger setup"
echo "   npm run test:api       - Test all API endpoints"
echo "   npm run test:server    - Test server components"
echo ""
echo "🔧 Control Commands:"
echo "   To stop server: kill $SERVER_PID"
echo "   To restart: npm run start:no-redis"
echo ""
echo "📖 Open your browser and go to:"
echo "   http://localhost:3000/api-docs"
echo ""
echo "Server is running in background (PID: $SERVER_PID)"
echo "Press Ctrl+C to stop this script (server will keep running)"

# Keep script running to show logs
wait 
#!/bin/bash

# 🚀 MCP Flow Validation Runner
# Complete automated testing script for FocusFlow MCP compatibility

echo "🎯 =============================================="
echo "🚀 MCP Flow Validation Runner"
echo "📅 $(date)"
echo "🎯 =============================================="

# Set up environment
export NODE_ENV=test
export CI=false

# Navigate to project directory
cd "$(dirname "$0")"

echo "📍 Working directory: $(pwd)"

# Check prerequisites
echo "🔍 Checking prerequisites..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install npm first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Install Playwright browsers if needed
echo "🌐 Ensuring Playwright browsers are installed..."
npx playwright install chromium

# Check if backend is running
echo "🔍 Checking backend availability..."
if curl -f http://localhost:8080/health &>/dev/null; then
    echo "✅ Backend is running on port 8080"
else
    echo "⚠️ Backend not detected on port 8080"
    echo "📋 Please start the backend with: npm run backend"
    echo "🔄 Attempting to start backend..."
    
    # Try to start backend in background
    npm run backend &
    BACKEND_PID=$!
    
    # Wait for backend to start
    echo "⏱️ Waiting for backend to start..."
    for i in {1..30}; do
        if curl -f http://localhost:8080/health &>/dev/null; then
            echo "✅ Backend started successfully"
            break
        fi
        sleep 2
        if [ $i -eq 30 ]; then
            echo "❌ Backend failed to start within 60 seconds"
            kill $BACKEND_PID 2>/dev/null
            exit 1
        fi
    done
fi

# Check if frontend is running
echo "🔍 Checking frontend availability..."
if curl -f http://localhost:8082 &>/dev/null; then
    echo "✅ Frontend is running on port 8082"
else
    echo "⚠️ Frontend not detected on port 8082"
    echo "📋 Please start the frontend with: npm run web"
    echo "🔄 Attempting to start frontend..."
    
    # Try to start frontend in background
    npm run web &
    FRONTEND_PID=$!
    
    # Wait for frontend to start
    echo "⏱️ Waiting for frontend to start..."
    for i in {1..30}; do
        if curl -f http://localhost:8082 &>/dev/null; then
            echo "✅ Frontend started successfully"
            break
        fi
        sleep 2
        if [ $i -eq 30 ]; then
            echo "❌ Frontend failed to start within 60 seconds"
            kill $FRONTEND_PID 2>/dev/null
            kill $BACKEND_PID 2>/dev/null
            exit 1
        fi
    done
fi

echo ""
echo "🎯 =============================================="
echo "🧪 Starting MCP Flow Validation Tests"
echo "🎯 =============================================="

# Create results directory
RESULTS_DIR="e2e-tests-comprehensive/test-results/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$RESULTS_DIR"

echo "📁 Results will be saved to: $RESULTS_DIR"

# Execute the comprehensive MCP validation
echo "🚀 Executing MCP validation..."

# Run the TypeScript executor
npx ts-node e2e-tests-comprehensive/execute-mcp-validation.ts

VALIDATION_EXIT_CODE=$?

echo ""
echo "🎯 =============================================="
echo "📊 MCP Validation Completed"
echo "🎯 =============================================="

if [ $VALIDATION_EXIT_CODE -eq 0 ]; then
    echo "🎉 All tests passed successfully!"
    echo "✅ MCP compatibility validated"
else
    echo "⚠️ Some tests failed or encountered issues"
    echo "📋 Check the generated reports for details"
fi

echo "📁 Test results available in: $RESULTS_DIR"
echo "📊 Generated reports:"
echo "   - JSON: $RESULTS_DIR/reports/comprehensive-validation-report.json"
echo "   - Summary: $RESULTS_DIR/reports/validation-summary.md"

# Cleanup background processes if we started them
if [ ! -z "$BACKEND_PID" ]; then
    echo "🧹 Stopping backend process..."
    kill $BACKEND_PID 2>/dev/null
fi

if [ ! -z "$FRONTEND_PID" ]; then
    echo "🧹 Stopping frontend process..."
    kill $FRONTEND_PID 2>/dev/null
fi

echo ""
echo "🎯 =============================================="
echo "✅ MCP Validation Runner completed"
echo "📅 $(date)"
echo "🎯 =============================================="

exit $VALIDATION_EXIT_CODE
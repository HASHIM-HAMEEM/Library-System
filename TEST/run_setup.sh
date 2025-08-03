#!/bin/bash

# Complete Library System Setup Script
# This script executes the complete library system setup

echo "🚀 Complete Library System Setup"
echo "================================="
echo ""

# Check if we're in the TEST directory
if [ ! -f "execute_complete_setup.js" ]; then
    echo "❌ Error: execute_complete_setup.js not found"
    echo "Please run this script from the TEST directory"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    echo "Please install Node.js to run this script"
    exit 1
fi

# Check if package.json exists and install dependencies if needed
if [ -f "package.json" ]; then
    echo "📦 Installing dependencies..."
    npm install
else
    echo "📦 Installing required dependencies..."
    npm init -y
    npm install @supabase/supabase-js dotenv
fi

echo ""
echo "🔧 Executing complete library system setup..."
echo ""

# Run the setup script
node execute_complete_setup.js

echo ""
echo "✅ Setup script execution completed!"
echo ""
echo "📋 Next Steps:"
echo "1. Check the output above for any errors"
echo "2. If successful, your library system is ready to use"
echo "3. If there were errors, follow the manual setup instructions"
echo ""
echo "🔗 Manual Setup (if needed):"
echo "1. Open your Supabase Dashboard"
echo "2. Go to SQL Editor"
echo "3. Copy the SQL from FINAL_SETUP_INSTRUCTIONS.md"
echo "4. Paste and execute in SQL Editor"
echo ""
echo "🎉 Your library access control system should now be ready!"
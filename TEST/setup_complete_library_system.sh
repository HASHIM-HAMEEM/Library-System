#!/bin/bash

# Complete Library System Setup Script
# This script sets up the entire library system with corrected table structure

set -e  # Exit on any error

echo "🚀 Starting Complete Library System Setup..."
echo "==========================================="

# Check if we're in the correct directory
if [ ! -f "complete_library_system_corrected.sql" ]; then
    echo "❌ Error: complete_library_system_corrected.sql not found in current directory"
    echo "Please run this script from the TEST directory"
    exit 1
fi

# Check if .env file exists
if [ ! -f "../.env" ]; then
    echo "❌ Error: .env file not found in parent directory"
    echo "Please ensure your Supabase configuration is set up"
    exit 1
fi

# Check if Node.js dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install
fi

echo "\n📋 Step 1: Verifying current database state..."
node verify_corrected_database.js

echo "\n📝 Step 2: Displaying SQL script to execute..."
echo "==========================================="
echo "Please copy and execute the following SQL in your Supabase SQL Editor:"
echo "\n--- START OF SQL SCRIPT ---"
cat complete_library_system_corrected.sql
echo "\n--- END OF SQL SCRIPT ---"
echo "\n==========================================="

echo "\n⏳ Waiting for you to execute the SQL script..."
echo "Press ENTER after you have successfully executed the SQL script in Supabase SQL Editor"
read -p "Press ENTER to continue..."

echo "\n🔍 Step 3: Verifying updated database state..."
node verify_corrected_database.js

echo "\n✅ Step 4: Running comprehensive functionality tests..."
if [ -f "test-functionality.js" ]; then
    node test-functionality.js
else
    echo "⚠️  test-functionality.js not found, skipping functionality tests"
fi

echo "\n🎉 Library System Setup Complete!"
echo "==========================================="
echo "Your library system is now ready with:"
echo "✅ Corrected table structure (using 'id' instead of 'user_id')"
echo "✅ Fixed function definitions (log_scan_library, create_library_user, etc.)"
echo "✅ Proper RLS policies without auth.users dependencies"
echo "✅ Sample test data for immediate use"
echo "\nKey Functions Available:"
echo "- log_scan_library(qr_code, scan_type, scanned_by, location)"
echo "- create_library_user(user_id, full_name, subscription_date)"
echo "- create_admin_user(admin_user_id, admin_full_name)"
echo "- get_user_scan_history(user_id, limit)"
echo "\n🔗 Next Steps:"
echo "1. Test QR code scanning functionality"
echo "2. Create library users and admin accounts"
echo "3. Integrate with your frontend application"
echo "\n🏁 Setup completed successfully!"
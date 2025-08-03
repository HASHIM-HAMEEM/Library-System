#!/bin/bash

# Supabase Email Fix Setup Script
# This script automates the implementation of the email registration fix

set -e  # Exit on any error

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

print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}\n"
}

# Check if required files exist
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    if [ ! -f ".env" ]; then
        print_error ".env file not found!"
        exit 1
    fi
    
    if [ ! -f "package.json" ]; then
        print_error "package.json not found! Are you in the right directory?"
        exit 1
    fi
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed!"
        exit 1
    fi
    
    # Check if npm dependencies are installed
    if [ ! -d "node_modules" ]; then
        print_status "Installing npm dependencies..."
        npm install
    fi
    
    print_success "Prerequisites check passed"
}

# Test current email registration status
test_email_status() {
    print_header "Testing Current Email Registration Status"
    
    if [ -f "implement_email_fix.cjs" ]; then
        print_status "Running email registration tests..."
        node implement_email_fix.cjs
    else
        print_error "implement_email_fix.cjs not found!"
        exit 1
    fi
}

# Open Supabase dashboard
open_supabase_dashboard() {
    print_header "Opening Supabase Dashboard"
    
    # Extract Supabase URL from .env file
    SUPABASE_URL=$(grep "VITE_SUPABASE_URL\|SUPABASE_URL" .env | head -1 | cut -d '=' -f2)
    
    if [ -z "$SUPABASE_URL" ]; then
        print_error "Could not find Supabase URL in .env file"
        exit 1
    fi
    
    # Convert API URL to dashboard URL
    DASHBOARD_URL=$(echo $SUPABASE_URL | sed 's/\.supabase\.co/.supabase.co\/dashboard/')
    AUTH_SETTINGS_URL="${DASHBOARD_URL}/project/settings/auth"
    
    print_status "Opening Supabase Authentication Settings..."
    print_status "URL: $AUTH_SETTINGS_URL"
    
    # Try to open in browser (works on macOS, Linux, and Windows)
    if command -v open &> /dev/null; then
        open "$AUTH_SETTINGS_URL"
    elif command -v xdg-open &> /dev/null; then
        xdg-open "$AUTH_SETTINGS_URL"
    elif command -v start &> /dev/null; then
        start "$AUTH_SETTINGS_URL"
    else
        print_warning "Could not automatically open browser. Please manually visit:"
        echo "$AUTH_SETTINGS_URL"
    fi
}

# Open Resend website
open_resend() {
    print_header "Opening Resend Website"
    
    RESEND_URL="https://resend.com"
    
    print_status "Opening Resend signup page..."
    print_status "URL: $RESEND_URL"
    
    # Try to open in browser
    if command -v open &> /dev/null; then
        open "$RESEND_URL"
    elif command -v xdg-open &> /dev/null; then
        xdg-open "$RESEND_URL"
    elif command -v start &> /dev/null; then
        start "$RESEND_URL"
    else
        print_warning "Could not automatically open browser. Please manually visit:"
        echo "$RESEND_URL"
    fi
}

# Display SMTP configuration instructions
show_smtp_instructions() {
    print_header "SMTP Configuration Instructions"
    
    echo -e "${YELLOW}📧 Follow these steps to configure SMTP:${NC}\n"
    
    echo "1. 🔧 Create Resend Account:"
    echo "   • Go to https://resend.com"
    echo "   • Sign up for a free account"
    echo "   • Verify your email address"
    echo ""
    
    echo "2. 🔑 Get SMTP Credentials:"
    echo "   • In Resend dashboard, go to Settings → API Keys"
    echo "   • Create a new API key"
    echo "   • Copy the API key (starts with 're_')"
    echo ""
    
    echo "3. ⚙️  Configure Supabase SMTP:"
    echo "   • Go to Supabase Dashboard → Authentication → Settings"
    echo "   • Scroll down to 'SMTP Settings'"
    echo "   • Toggle 'Enable Custom SMTP' to ON"
    echo "   • Fill in the configuration:"
    echo "     Host: smtp.resend.com"
    echo "     Port: 587"
    echo "     Username: resend"
    echo "     Password: [Your Resend API Key]"
    echo "     Sender Email: noreply@yourdomain.com"
    echo "     Sender Name: Your App Name"
    echo "   • Click 'Save'"
    echo ""
    
    echo "4. ✅ Test the Fix:"
    echo "   • Run this script again to verify the fix works"
    echo "   • Or run: node implement_email_fix.cjs"
    echo ""
    
    echo -e "${GREEN}💡 Quick Development Fix (Alternative):${NC}"
    echo "   • Go to Supabase Dashboard → Authentication → Providers"
    echo "   • Click on 'Email'"
    echo "   • Turn OFF 'Confirm Email'"
    echo "   • Save changes"
    echo -e "   ${RED}⚠️  Warning: Not recommended for production!${NC}"
}

# Main menu
show_menu() {
    print_header "Supabase Email Fix Implementation"
    
    echo "Choose an option:"
    echo "1. Test current email registration status"
    echo "2. Open Resend website (to create account)"
    echo "3. Open Supabase dashboard (to configure SMTP)"
    echo "4. Show SMTP configuration instructions"
    echo "5. Run complete setup process"
    echo "6. Exit"
    echo ""
    read -p "Enter your choice (1-6): " choice
    
    case $choice in
        1)
            test_email_status
            ;;
        2)
            open_resend
            ;;
        3)
            open_supabase_dashboard
            ;;
        4)
            show_smtp_instructions
            ;;
        5)
            run_complete_setup
            ;;
        6)
            print_success "Goodbye!"
            exit 0
            ;;
        *)
            print_error "Invalid choice. Please try again."
            show_menu
            ;;
    esac
}

# Run complete setup process
run_complete_setup() {
    print_header "Complete Email Fix Setup Process"
    
    print_status "Step 1: Testing current status..."
    test_email_status
    
    echo ""
    read -p "Do you need to configure SMTP? (y/n): " configure_smtp
    
    if [[ $configure_smtp =~ ^[Yy]$ ]]; then
        print_status "Step 2: Opening Resend website..."
        open_resend
        
        echo ""
        read -p "Press Enter after creating your Resend account..."
        
        print_status "Step 3: Opening Supabase dashboard..."
        open_supabase_dashboard
        
        echo ""
        show_smtp_instructions
        
        echo ""
        read -p "Press Enter after configuring SMTP in Supabase..."
        
        print_status "Step 4: Testing the fix..."
        test_email_status
        
        print_success "Setup process completed!"
    else
        print_success "Email registration appears to be working correctly!"
    fi
}

# Main script execution
main() {
    # Check if running with arguments
    if [ $# -eq 0 ]; then
        # Interactive mode
        check_prerequisites
        show_menu
    else
        # Command line mode
        case $1 in
            "test")
                check_prerequisites
                test_email_status
                ;;
            "setup")
                check_prerequisites
                run_complete_setup
                ;;
            "resend")
                open_resend
                ;;
            "dashboard")
                open_supabase_dashboard
                ;;
            "instructions")
                show_smtp_instructions
                ;;
            *)
                echo "Usage: $0 [test|setup|resend|dashboard|instructions]"
                echo "  test         - Test current email registration status"
                echo "  setup        - Run complete setup process"
                echo "  resend       - Open Resend website"
                echo "  dashboard    - Open Supabase dashboard"
                echo "  instructions - Show SMTP configuration instructions"
                echo ""
                echo "Run without arguments for interactive mode."
                exit 1
                ;;
        esac
    fi
}

# Run main function with all arguments
main "$@"
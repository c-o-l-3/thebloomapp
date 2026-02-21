#!/bin/bash

#===============================================================================
# Airtable to GHL Sync Engine - Shell Wrapper Script
#===============================================================================

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# Functions
print_header() {
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║     Airtable to GoHighLevel Sync Engine                   ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check Node.js version
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi

    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version $NODE_VERSION is too old. Please install Node.js 18+."
        exit 1
    fi

    print_success "Node.js version $(node -v) detected"
}

# Install dependencies if needed
install_dependencies() {
    if [ ! -d "node_modules" ]; then then
        print_info "Installing dependencies..."
        npm install
        if [ $? -ne 0 ]; then
            print_error "Failed to install dependencies"
            exit 1
        fi
        print_success "Dependencies installed"
    else
        print_success "Dependencies already installed"
    fi
}

# Check environment variables
check_env() {
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            print_warning ".env file not found. Copying from .env.example..."
            cp .env.example .env
            print_warning "Please edit .env and add your API keys before running sync."
        else
            print_error ".env file not found and .env.example doesn't exist"
        fi
    fi
}

# Run the sync
run_sync() {
    local args="$*"
    print_info "Starting sync engine..."

    # Check for dry-run flag
    if echo "$args" | grep -q "\-\-dry-run"; then
        print_warning "DRY RUN MODE - No changes will be made"
    fi

    node src/cli.js sync $args

    if [ $? -eq 0 ]; then
        print_success "Sync completed successfully"
    else
        print_error "Sync completed with errors"
        exit 1
    fi
}

# Test connections
test_connections() {
    print_info "Testing API connections..."
    node src/cli.js test
}

# Show help
show_help() {
    print_header
    echo "Usage: ./scripts/sync.sh [command] [options]"
    echo ""
    echo "Commands:"
    echo "  sync          Run the sync process"
    echo "  test          Test API connections"
    echo "  history       Show sync history"
    echo "  status        Show sync engine status"
    echo "  conflicts     Show current conflicts"
    echo "  help          Show this help message"
    echo ""
    echo "Options for sync:"
    echo "  --dry-run         Show what would be synced without changes"
    echo "  --client=<name>  Sync only for specific client"
    echo "  --journey=<id>    Sync only specific journey"
    echo ""
    echo "Examples:"
    echo "  ./scripts/sync.sh sync"
    echo "  ./scripts/sync.sh sync --dry-run"
    echo "  ./scripts/sync.sh sync --client=maison-albion"
    echo "  ./scripts/sync.sh sync --journey=welcome-series"
    echo "  ./scripts/sync.sh history"
    echo ""
}

# Main execution
main() {
    local command="${1:-sync}"
    shift || true

    print_header

    case "$command" in
        sync|run)
            check_node
            install_dependencies
            check_env
            run_sync "$@"
            ;;
        test|connections)
            check_node
            install_dependencies
            test_connections
            ;;
        history)
            check_node
            install_dependencies
            node src/cli.js history "$@"
            ;;
        status)
            check_node
            install_dependencies
            node src/cli.js status
            ;;
        conflicts)
            check_node
            install_dependencies
            node src/cli.js conflicts
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

main "$@"

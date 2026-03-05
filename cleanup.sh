#!/bin/bash
# AI Dashboard Cleanup Script
# Run this periodically to free disk space and maintain performance

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${GREEN}=== AI Dashboard Cleanup Script ===${NC}"
echo "Started at $(date)"
echo ""

# Function to get directory size
get_size() {
    if command -v du &> /dev/null; then
        du -sh "$1" 2>/dev/null | cut -f1
    else
        echo "unknown"
    fi
}

# Function to get file count
get_count() {
    find "$1" -type f 2>/dev/null | wc -l
}

echo -e "${YELLOW}Analyzing what can be cleaned...${NC}"
echo ""

# 1. Check .next directory
if [ -d ".next" ]; then
    NEXT_SIZE=$(get_size ".next")
    echo "📦 .next/ (build cache): $NEXT_SIZE"
fi

# 2. Check node_modules
if [ -d "node_modules" ]; then
    NODE_SIZE=$(get_size "node_modules")
    NODE_COUNT=$(get_count "node_modules")
    echo "📦 node_modules/: $NODE_SIZE ($NODE_COUNT files)"
fi

# 3. Check logs
LOG_FILES=$(find . -name "*.log" -type f 2>/dev/null | grep -v node_modules | wc -l)
if [ "$LOG_FILES" -gt 0 ]; then
    LOG_SIZE=$(find . -name "*.log" -type f -exec du -ch {} + 2>/dev/null | grep total$ | cut -f1 | head -1 || echo "0")
    echo "📝 Log files: $LOG_FILES files (~$LOG_SIZE)"
fi

# 4. Check old session reports (older than 30 days)
OLD_REPORTS=$(find docs -name "SESSION-*.md" -o -name "*CHANGELOG-session*.md" -type f -mtime +30 2>/dev/null | wc -l)
if [ "$OLD_REPORTS" -gt 0 ]; then
    echo "📄 Old session reports (30+ days): $OLD_REPORTS files"
fi

# 5. Check data backups
if [ -d "data" ]; then
    DATA_BACKUPS=$(find data -name "*.backup" -o -name "*.bak" -o -name "*.old" 2>/dev/null | wc -l)
    if [ "$DATA_BACKUPS" -gt 0 ]; then
        echo "💾 Data backups: $DATA_BACKUPS files"
    fi
fi

echo ""
echo -e "${GREEN}=== Cleanup Options ===${NC}"
echo ""

# Function to ask for confirmation
ask_confirm() {
    read -p "$1 (y/N): " response
    case "$response" in
        [Yy]* ) return 0 ;;
        * ) return 1 ;;
    esac
}

# 1. Clean .next directory
echo "1️⃣ Clean build cache (.next/)"
if ask_confirm "   Remove .next/ directory?"; then
    if [ -d ".next" ]; then
        rm -rf .next
        echo -e "   ${GREEN}✓ .next/ removed${NC}"
    else
        echo -e "   ${YELLOW}⚠ .next/ doesn't exist${NC}"
    fi
fi
echo ""

# 2. Clean log files
echo "2️⃣ Clean log files"
if ask_confirm "   Remove all .log files (except node_modules)?"; then
    find . -name "*.log" -type f -not -path "./node_modules/*" -delete 2>/dev/null || true
    echo -e "   ${GREEN}✓ Log files cleaned${NC}"
fi
echo ""

# 3. Archive old session reports
echo "3️⃣ Archive old session reports"
if ask_confirm "   Archive session reports older than 30 days to docs/archive/?"; then
    mkdir -p docs/archive
    find docs -name "SESSION-*.md" -mtime +30 -exec mv {} docs/archive/ \; 2>/dev/null || true
    find docs -name "*CHANGELOG-session*.md" -mtime +30 -exec mv {} docs/archive/ \; 2>/dev/null || true
    find docs -name "*REPORT-*.md" -mtime +30 -exec mv {} docs/archive/ \; 2>/dev/null || true
    
    ARCHIVED_COUNT=$(ls docs/archive/ 2>/dev/null | wc -l)
    if [ "$ARCHIVED_COUNT" -gt 0 ]; then
        echo -e "   ${GREEN}✓ Archived $ARCHIVED_COUNT old reports${NC}"
    else
        echo -e "   ${YELLOW}⚠ No old reports to archive${NC}"
    fi
fi
echo ""

# 4. Clean node_modules (optional - requires reinstall)
echo -e "${RED}4️⃣ Clean node_modules/ (⚠️ Requires 'npm install' afterwards)${NC}"
echo -e "   ${YELLOW}This will remove all dependencies and requires reinstall${NC}"
if ask_confirm "   Remove node_modules/ directory?"; then
    if [ -d "node_modules" ]; then
        rm -rf node_modules
        echo -e "   ${GREEN}✓ node_modules/ removed${NC}"
        echo -e "   ${YELLOW}⚠️ Run 'npm install' to reinstall dependencies${NC}"
    else
        echo -e "   ${YELLOW}⚠ node_modules/ doesn't exist${NC}"
    fi
fi
echo ""

# 5. Vacuum SQLite database (if sqlite3 is available)
echo "5️⃣ Optimize SQLite database"
if command -v sqlite3 &> /dev/null; then
    if [ -f "data/assistant.db" ]; then
        if ask_confirm "   Vacuum and optimize assistant.db?"; then
            sqlite3 data/assistant.db "VACUUM;" 2>/dev/null || echo -e "   ${YELLOW}⚠ Could not vacuum database${NC}"
            echo -e "   ${GREEN}✓ Database optimized${NC}"
        fi
    fi
else
    echo -e "   ${YELLOW}⚠ sqlite3 not available, skipping database optimization${NC}"
fi
echo ""

# Summary
echo -e "${GREEN}=== Cleanup Complete ===${NC}"
echo "Finished at $(date)"
echo ""

# Show current sizes
echo "Current project size:"
if command -v du &> /dev/null; then
    du -sh . 2>/dev/null | cut -f1
fi

echo ""
echo "💡 Tip: Run this script weekly or when disk space is low"
echo "💡 To automate: Add to crontab (Linux/Mac) or Task Scheduler (Windows)"

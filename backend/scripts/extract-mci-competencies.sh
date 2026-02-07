#!/bin/bash
# Extract MCI Competencies from PDF files
# This script extracts text from the MCI curriculum PDFs

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DOC_DIR="$PROJECT_ROOT/../documentation"
OUTPUT_DIR="/tmp/mci_extraction"

echo "🏥 MCI Competency Extraction Script"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Extract text from PDFs
echo "📄 Extracting text from PDF files..."

if [ -f "$DOC_DIR/UG-Curriculum-Vol-I.pdf" ]; then
    echo "   ➜ Volume I..."
    pdftotext -layout "$DOC_DIR/UG-Curriculum-Vol-I.pdf" "$OUTPUT_DIR/vol1.txt"
    echo "   ✓ Volume I extracted ($(wc -l < "$OUTPUT_DIR/vol1.txt") lines)"
fi

if [ -f "$DOC_DIR/UG-Curriculum-Vol-II.pdf" ]; then
    echo "   ➜ Volume II..."
    pdftotext -layout "$DOC_DIR/UG-Curriculum-Vol-II.pdf" "$OUTPUT_DIR/vol2.txt"
    echo "   ✓ Volume II extracted ($(wc -l < "$OUTPUT_DIR/vol2.txt") lines)"
fi

if [ -f "$DOC_DIR/UG-Curriculum-Vol-III.pdf" ]; then
    echo "   ➜ Volume III..."
    pdftotext -layout "$DOC_DIR/UG-Curriculum-Vol-III.pdf" "$OUTPUT_DIR/vol3.txt"
    echo "   ✓ Volume III extracted ($(wc -l < "$OUTPUT_DIR/vol3.txt") lines)"
fi

echo ""
echo "✅ Text extraction complete!"
echo "📁 Output directory: $OUTPUT_DIR"
echo ""
echo "Next step: Run the parser to extract competencies"
echo "   node scripts/parse-mci-competencies.js"

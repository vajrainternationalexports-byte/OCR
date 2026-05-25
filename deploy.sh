#!/bin/bash
echo "=== OCR for ALL Deploy Helper ==="

# Initialize git if not present
if [ ! -d .git ]; then
  echo "Initializing local Git repository..."
  git init
fi

# Stage files
echo "Staging files..."
git add .

# Commit
echo "Creating initial commit..."
git commit -m "Initial commit of OCR for ALL VSCode extension"

echo ""
echo "=========================================================="
echo "                   MANUAL ACTIONS REQUIRED                "
echo "=========================================================="
echo "I have set up the local git repo and made the first commit."
echo "Because GitHub and Open VSX require account authorization:"
echo ""
echo "1. Create a GitHub Repo:"
echo "   - Go to https://github.com/new"
echo "   - Create a blank repository named 'ocr-for-all'"
echo ""
echo "2. Push the code to GitHub:"
echo "   Run the following commands in this terminal:"
echo "     git remote add origin https://github.com/<your-username>/ocr-for-all.git"
echo "     git branch -M main"
echo "     git push -u origin main"
echo ""
echo "3. Sign the Open VSX Publisher Agreement:"
echo "   - Go to https://open-vsx.org/user-settings/extensions"
echo "   - Log in and sign the agreement."
echo ""
echo "4. Upload/Publish to Open VSX Registry:"
echo "   - Drag & drop the packaged file:"
echo "     /Users/anjanagarwal/Desktop/Extension/ocr-for-all-1.0.0.vsix"
echo "     directly into your browser page, OR publish using the command:"
echo "     npx ovsx publish ocr-for-all-1.0.0.vsix -p <your-open-vsx-token>"
echo "=========================================================="

#!/bin/bash

# Setup Git hooks for the CMF project
echo "🔧 Setting up Git hooks..."

# Create pre-commit hook that checks STAGED content
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/sh

# Pre-commit hook to check code formatting of staged files
echo "🔍 Checking code formatting of staged files..."

# Get list of staged files that match our prettier patterns
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx|json|css|md)$' | grep '^src/')

if [ -z "$STAGED_FILES" ]; then
  echo "ℹ️ No staged files to check"
  exit 0
fi

echo "Checking $(echo "$STAGED_FILES" | wc -l) staged file(s)..."

# Check formatting of staged files only
FORMATTING_ISSUES=0
for FILE in $STAGED_FILES; do
  # Get staged content and check formatting
  OUTPUT=$(git show :$FILE | npx prettier --check --stdin-filepath $FILE 2>&1)
  EXIT_CODE=$?

  # Check for syntax errors (Prettier outputs [error] but exits 0)
  if echo "$OUTPUT" | grep -q "\[error\]"; then
    echo "[error] $FILE - syntax error detected"
    echo "$OUTPUT" | grep "\[error\]"
    FORMATTING_ISSUES=1
  # Check for formatting issues (Prettier exits 1)
  elif [ $EXIT_CODE -ne 0 ]; then
    echo "[warn] $FILE - formatting issues.  To see details:"
    echo "FN=$FILE npm run format:diff"
    FORMATTING_ISSUES=1
  fi
done

if [ $FORMATTING_ISSUES -ne 0 ]; then
  echo ""
  echo "❌ Staged files have formatting or syntax issues! Aborting git commit."
  echo "💡 Fix syntax errors manually, run 'npm run format' for formatting issues, then 'git add' the fixed files."
  echo ""
  exit 1
fi

echo "✅ All staged files are properly formatted and have no syntax errors!"
exit 0
EOF

# Make it executable
chmod +x .git/hooks/pre-commit

echo "✅ Pre-commit hook installed successfully!"
echo ""
echo "The hook will now check code formatting of STAGED files before each commit."
echo "This prevents the issue where you fix a file but forget to stage the changes."
echo ""
echo "Workflow:"
echo "1. Make changes to files"
echo "2. Run 'npm run format' to fix formatting"
echo "3. Run 'git add <files>' to stage the formatted files"
echo "4. Run 'git commit' - hook will check the staged content"

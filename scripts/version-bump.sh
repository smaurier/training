#!/usr/bin/env bash
# Usage: ./scripts/version-bump.sh [patch|minor|major]
# Bumps version in app/package.json, appends CHANGELOG entry, creates git tag.

set -e

TYPE=${1:-patch}
if [[ "$TYPE" != "patch" && "$TYPE" != "minor" && "$TYPE" != "major" ]]; then
  echo "Usage: $0 [patch|minor|major]"
  exit 1
fi

# Current version from last git tag
CURRENT=$(git describe --tags --abbrev=0 2>/dev/null | sed 's/^v//' || echo "0.0.0")
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

case "$TYPE" in
  major) MAJOR=$((MAJOR+1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR+1)); PATCH=0 ;;
  patch) PATCH=$((PATCH+1)) ;;
esac

NEW="$MAJOR.$MINOR.$PATCH"
TAG="v$NEW"
DATE=$(date +%Y-%m-%d)

echo "Bumping v$CURRENT → $NEW ($TYPE)"

# Update app/package.json
sed -i "s/\"version\": \"$CURRENT\"/\"version\": \"$NEW\"/" app/package.json

# Generate commit list since last tag
COMMITS=$(git log "v$CURRENT"..HEAD --oneline --no-decorate 2>/dev/null || git log --oneline -20)

# Prepend entry to CHANGELOG.md (insert before first ## [ line)
ENTRY="## [$NEW] — $DATE\n\n$COMMITS\n\n---\n"
TMP=$(mktemp)
awk -v entry="$ENTRY" '
  /^## \[/ && !inserted { printf "%s\n", entry; inserted=1 }
  { print }
' CHANGELOG.md > "$TMP" && mv "$TMP" CHANGELOG.md

# Commit + tag
git add app/package.json CHANGELOG.md
git commit -m "chore(release): bump to $TAG"
git tag "$TAG"

echo "Done. Tag $TAG created locally."
echo "To push: git push origin main && git push origin $TAG"

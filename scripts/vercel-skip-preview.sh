#!/bin/bash
# Vercel "Ignored Build Step" — exit 0 skips the build, non-zero proceeds.
# Wire it up: Vercel project -> Settings -> Git -> Ignored Build Step -> Command:
#   bash scripts/vercel-skip-preview.sh $VERCEL_GIT_COMMIT_REF

REF="${1:-$VERCEL_GIT_COMMIT_REF}"
echo "VERCEL_GIT_COMMIT_REF: $REF"

if [[ "$REF" == "main" ]]; then
  echo "main branch — building"
  exit 1
fi

echo "non-main branch — skipping preview build"
exit 0

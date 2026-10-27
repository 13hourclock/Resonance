#!/bin/bash
# Overseer's cheap misread scan: Wilbow's phrases used as headings/rules/terms, and either/or framings.
# Usage: tools/misread_check.sh [files...]  (default: team docs)
cd /workspace/softsound
FILES=${@:-"NEW_ENGINE.md SCALE_MUSIC.md CONCEPTS.md GOAL_AND_FEATURES.md QUESTIONS_REVIEW.md BRAINSTORM.md START_HERE.md"}
echo "== His phrases used as headings or rules =="
rg -n -i '^(#+|\*\*|- \*\*).*(unified scale|heartbeat|harmony as|scale)' $FILES 2>/dev/null
rg -n -i '(rule|must|always|never|framework|principle)[^.]{0,60}(unified scale|om tone|heartbeat)' $FILES 2>/dev/null
echo "== Either/or framings to check =="
rg -n -i '(either .{1,40} or |which one|pick one|instead of)' $FILES 2>/dev/null | head -60

#!/usr/bin/env bash
# Build the defensive disclosure (DP-009) to a submission-ready PDF.
#   docs/DEFENSIVE-DISCLOSURE.md -> docs/DEFENSIVE-DISCLOSURE.pdf
#
# Target format: US Letter, 12pt body, 1" margins — the submission spec used by
# Research Disclosure and accepted by TDCommons/IP.com.
#
# disclosure-header.typ carries the layout rules (breakable tables, repeated
# table headers, sticky headings, sized code blocks). Without it, pandoc's
# default Typst template makes tables unbreakable and the build produces
# near-empty pages wherever a table does not fit the remaining space.
set -euo pipefail
cd "$(dirname "$0")/.."

SRC=docs/DEFENSIVE-DISCLOSURE.md
OUT=docs/DEFENSIVE-DISCLOSURE.pdf

pandoc "$SRC" -o "$OUT" \
  --pdf-engine=typst \
  --include-in-header=docs/disclosure-header.typ \
  --resource-path=. \
  -V papersize=us-letter \
  -V margin-left=1in -V margin-right=1in \
  -V margin-top=1in  -V margin-bottom=1in \
  -V fontsize=12pt \
  -V mainfont="New Computer Modern"
# No --metadata title: the source markdown opens with its own H1, and passing
# the variable renders pandoc's title block too, printing the title twice.
# PDF document metadata is set in disclosure-header.typ instead.

pages=$(pdfinfo "$OUT" 2>/dev/null | awk '/^Pages/{print $2}')
echo "→ $OUT ($(du -h "$OUT" | cut -f1), ${pages} pages)"

# Report any page with almost nothing on it — the defect this template fixes.
# The final page is legitimately partial — that is just where the text ends.
sparse=0
for i in $(seq 1 $((pages - 1))); do
  n=$(pdftotext -f "$i" -l "$i" "$OUT" - 2>/dev/null | tr -d '[:space:]' | wc -c)
  if [ "$n" -lt 900 ]; then
    echo "   WARNING: page $i holds only $n characters"
    sparse=$((sparse + 1))
  fi
done
[ "$sparse" -eq 0 ] && echo "   layout: no sparse pages"

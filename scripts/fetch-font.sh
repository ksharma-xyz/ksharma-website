#!/usr/bin/env bash
# Get the Switzer webfont. It is not in this repo (its licence forbids publishing the file
# in a public repository), so every checkout and every deploy fetches the official file
# from Fontshare with this script. See docs/assets/fonts/README.md.
#
#   ./scripts/fetch-font.sh                 # download into docs/assets/fonts/ (skips if already there)
#   ./scripts/fetch-font.sh --check         # exit 0 if the local font is present and correct, 1 if not
#   ./scripts/fetch-font.sh --verify FILE   # check any file against the expected checksum
#
# If Fontshare ships a new version the checksum fails: look at the new file, then update
# FONT_SHA256 below. It is the only place the checksum lives.
set -euo pipefail

FONT=Switzer-Variable.woff2
FONT_ZIP_URL=https://api.fontshare.com/v2/fonts/download/switzer
FONT_SHA256=d1bf801ffb1a6096def70a7c532255722ad87d948b13a8a586e342f7091f8ee4

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="$ROOT/docs/assets/fonts/$FONT"

sha256() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | cut -d' ' -f1
  else shasum -a 256 "$1" | cut -d' ' -f1
  fi
}

matches() { [ -f "$1" ] && [ "$(sha256 "$1")" = "$FONT_SHA256" ]; }

case "${1:-}" in
  --check)
    matches "$DEST"
    exit
    ;;
  --verify)
    if matches "${2:?usage: fetch-font.sh --verify FILE}"; then
      echo "$2 is the expected $FONT"
      exit 0
    fi
    echo "$2 is missing or is not the expected $FONT" >&2
    exit 1
    ;;
  '') ;;
  *)
    echo "unknown option: $1" >&2
    exit 2
    ;;
esac

if matches "$DEST"; then
  echo "$FONT is already in place"
  exit 0
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "Downloading Switzer from Fontshare"
curl --silent --show-error --fail --location --retry 3 --retry-delay 5 \
  --user-agent 'ksharma-website-fonts/1.0' \
  --output "$TMP/switzer.zip" "$FONT_ZIP_URL"
unzip -q -j "$TMP/switzer.zip" "*/WEB/fonts/$FONT" -d "$TMP"

if ! matches "$TMP/$FONT"; then
  echo "Checksum mismatch: Fontshare's $FONT is not the version this site expects." >&2
  echo "  expected $FONT_SHA256" >&2
  echo "  got      $(sha256 "$TMP/$FONT")" >&2
  exit 1
fi

cp "$TMP/$FONT" "$DEST"
echo "Saved $DEST"

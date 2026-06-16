#!/bin/bash
# ============================================
# Copyright 2026 SoTeen Studio
# Domloo Release Action
# ============================================
set -euo pipefail

CHANGELOG_FILE="docs/CHANGELOG.md"

if [ ! -s "$CHANGELOG_FILE" ]; then
    echo "::error::[GUARD] File $CHANGELOG_FILE kosong atau tidak ditemukan!"
    exit 1
fi

echo "[GUARD] Memulai pemindaian keamanan tingkat tinggi pada $CHANGELOG_FILE..."

if [ -L "$CHANGELOG_FILE" ]; then
    echo "::error::[GUARD] Deteksi Serangan Symlink! File changelog tidak boleh berupa tautan simbolik."
    exit 1
fi

REAL_PATH=$(readlink -f "$CHANGELOG_FILE")
CURRENT_DIR=$(pwd)
if [[ "$REAL_PATH" != "$CURRENT_DIR"* ]]; then
    echo "::error::[GUARD] Deteksi Directory Traversal Attempt! File di luar workspace dilarang."
    exit 1
fi

MAX_SIZE=51200
FILE_SIZE=$(wc -c < "$CHANGELOG_FILE" | tr -d ' ')
if [ "$FILE_SIZE" -gt "$MAX_SIZE" ]; then
    echo "::error::[GUARD] Ukuran file changelog terlalu besar ($FILE_SIZE bytes)! Maksimal $MAX_SIZE bytes."
    exit 1
fi

LONGEST_LINE=$(wc -L < "$CHANGELOG_FILE" | tr -d ' ')
if [ "$LONGEST_LINE" -gt 1000 ]; then
    echo "::error::[GUARD] Deteksi baris tidak wajar! Panjang baris maksimal 1000 karakter (Terindikasi Base64/Payload Bomb)."
    exit 1
fi

CLEANED_TEXT=$(sed -e "s/['\"\`\\]//g" "$CHANGELOG_FILE")

MAP_URLS=$(grep -oE "https?://[^)\"' ]+" "$CHANGELOG_FILE" || true)

if [ ! -z "$MAP_URLS" ]; then
    while read -r url; do
        [ -z "$url" ] && continue
        
        if echo "$url" | grep -qP "[^\x00-\x7F]"; then
            echo "::error::[GUARD] Deteksi Homograph Attack! Karakter non-ASCII ditemukan di URL: $url"
            exit 1
        fi

        if [[ ! "$url" =~ ^https://(www\.)?github\.com/ ]]; then
            echo "::error::[GUARD] Link Haram Diblokir! Domain luar tidak diizinkan: $url"
            exit 1
        fi

        if [[ ! "$url" =~ ^https://(www\.)?github\.com/[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+/(issues|pull)/[0-9]+$ ]]; then
            echo "::error::[GUARD] Struktur URL GitHub Tidak Sah: $url"
            echo "::error::[GUARD] Hanya boleh nge-link langsung ke spesifik nomor Issues atau PR repo!"
            exit 1
        fi
    done <<< "$MAP_URLS"
fi

if echo "$CLEANED_TEXT" | grep -qiE "(<script|<iframe|<html|</?applet|javascript:|data:text/html|onload=)" ; then
    echo "::error::[GUARD] Deteksi injeksi HTML/Script/XSS berbahaya di dalam changelog!"
    exit 1
fi

if grep -qE "(\\\$|\\\$\{)(GITHUB_|GH_|TOKEN|SECRET)" "$CHANGELOG_FILE"; then
    echo "::error::[GUARD] Deteksi upaya exfiltrasi token! Dilarang menulis variabel env di changelog."
    exit 1
fi

if echo "$CLEANED_TEXT" | grep -qiE "(printenv|env\b|cat\s+/|curl|wget|eval\s*\(|system\s*\(|sh\s+-c|bash\s+-s|exec\s+)" ; then
    echo "::error::[GUARD] Deteksi instruksi/perintah shell mencurigakan (RCE Attempt)!"
    exit 1
fi

echo "[GUARD] Hasil scan: 100% AMAN! File changelog lolos enkripsi pertahanan."
exit 0

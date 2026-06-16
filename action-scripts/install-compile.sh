#!/bin/bash

set -e

echo "=== [Domloo Engine] Perubahan terdeteksi atau cache kosong. Nge-build ulang... ==="
cd GITHUB_ACTION_PATH
npm ci
npm run build
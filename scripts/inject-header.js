/**
 * Copyright 2026 SoTeen Studio
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_DIR = path.join(__dirname, '../action-scripts');

const COPYRIGHT_HEADER = `# ============================================
# Copyright 2026 SoTeen Studio
# Domloo Release Action
# ============================================
set -euo pipefail`;

const s = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  red: '\x1b[31m',
};

const logger = {
  info: (msg) => console.log(`${s.bold}${s.cyan}⠋${s.reset} ${msg}`),
  success: (msg) => console.log(`${s.bold}${s.green}✔${s.reset} ${msg}`),
  skip: (msg) => console.log(`${s.bold}${s.dim}🧹 ${msg}${s.reset}`),
  error: (msg) => console.error(`${s.bold}${s.red}𐄂 ${msg}${s.reset}`),
};

function cleanComments(code) {
  return code
    .split('\n')
    .filter(line => {
      const trimmed = line.trim();
      return !trimmed.startsWith('#') || trimmed.startsWith('#!');
    })
    .join('\n');
}

function injectHeaders() {
  if (!fs.existsSync(TARGET_DIR)) {
    logger.error(`Directory ${TARGET_DIR} not found.`);
    return;
  }

  const files = fs.readdirSync(TARGET_DIR);

  files.forEach(file => {
    if (path.extname(file) !== '.sh') return;

    const filePath = path.join(TARGET_DIR, file);
    let content = fs.readFileSync(filePath, 'utf8');

    if (file === 'utils.sh') return;

    content = content.trimStart();

    if (content.includes('set -euo pipefail') || content.includes('Copyright 2026')) {
      logger.skip(`${file} already protected. Skipping.`);
      return;
    }

    let cleanedContent = cleanComments(content);
    let finalContent = '';
    
    if (cleanedContent.startsWith('#!/bin/bash')) {
      const lines = cleanedContent.split('\n');
      const shebang = lines.shift(); 
      const restOfCode = lines.join('\n'); 

      finalContent = `${shebang}\n${COPYRIGHT_HEADER}\n\n${restOfCode.trimStart()}`;
    } else {
      finalContent = `#!/bin/bash\n${COPYRIGHT_HEADER}\n\n${cleanedContent.trimStart()}`;
    }

    fs.writeFileSync(filePath, finalContent, 'utf8');
    logger.success(`Successfully injected and cleaned: ${file}`);
  });

  console.log('');
  logger.success('All shell scripts have been secured.');
}

try {
  logger.info(`${s.bold}Injecting security headers and cleaning comments...${s.reset}`);
  injectHeaders();
} catch (err) {
  logger.error(`Execution failed: ${err.message}`);
  process.exit(1);
}

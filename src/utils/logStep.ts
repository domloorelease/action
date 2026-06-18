/**
 * Copyright 2026 SoTeen Studio
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

const colors = {
  INFO: '\x1b[36m',
  SUCCESS: '\x1b[32m',
  WARN: '\x1b[33m',
  ERROR: '\x1b[31m',
  GRAY: '\x1b[90m',
  BOLD: '\x1b[1m',
  RESET: '\x1b[0m',
};

export function logStart(boxWidth: number = 50) {
  console.log(`\n${colors.GRAY}${'═'.repeat(boxWidth)}${colors.RESET}`);
}

export function logLine(
  msg: string,
  type: 'INFO' | 'SUCCESS' | 'ERROR' | 'WARN' = 'INFO',
) {
  const timestamp = new Date().toTimeString().split(' ')[0];
  const badge = `${colors[type]}[${type}]${colors.RESET}`;

  console.log(
    `${colors.GRAY}[${timestamp}]${colors.RESET} ${badge} ${colors.BOLD}${msg}${colors.RESET}`,
  );
}

export function logEnd(boxWidth: number = 50) {
  console.log(`${colors.GRAY}${'─'.repeat(boxWidth)}${colors.RESET}\n`);
}

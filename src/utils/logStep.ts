export function logStep(msg: string, type: 'INFO' | 'SUCCESS' | 'ERROR' | 'WARN' = 'INFO') {
  // Warna ANSI Node.js
  const colors = {
    INFO: '\x1b[36m',
    SUCCESS: '\x1b[32m',
    WARN: '\x1b[33m',
    ERROR: '\x1b[31m',
    GRAY: '\x1b[90m',
    BOLD: '\x1b[1m',
    RESET: '\x1b[0m'
  };

  // Format jam HH:MM:SS biar presisi sama kayak Bash
  const timestamp = new Date().toTimeString().split(' ')[0];
  const badge = `${colors[type]}[${type}]${colors.RESET}`;
  const totalLen = msg.length + 16;

  console.log(`\n${colors.GRAY}${'═'.repeat(totalLen)}${colors.RESET}`);
  console.log(`${colors.GRAY}[${timestamp}]${colors.RESET} ${badge} ${colors.BOLD}${msg}${colors.RESET}`);
  console.log(`${colors.GRAY}${'─'.repeat(totalLen)}${colors.RESET}`);
}

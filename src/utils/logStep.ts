// Objek warna dipisah biar gak dideklarasi ulang terus
const colors = {
  INFO: '\x1b[36m',
  SUCCESS: '\x1b[32m',
  WARN: '\x1b[33m',
  ERROR: '\x1b[31m',
  GRAY: '\x1b[90m',
  BOLD: '\x1b[1m',
  RESET: '\x1b[0m'
};

// 1. FUNGSI UNTUK MEMBUKA KOTAK (Hanya garis atas '═')
export function logStart(boxWidth: number = 50) {
  console.log(`\n${colors.GRAY}${'═'.repeat(boxWidth)}${colors.RESET}`);
}

// 2. FUNGSI UNTUK ISI BARIS LOG (Tengah-tengah kotak, tanpa border atas/bawah)
export function logLine(msg: string, type: 'INFO' | 'SUCCESS' | 'ERROR' | 'WARN' = 'INFO') {
  const timestamp = new Date().toTimeString().split(' ')[0];
  const badge = `${colors[type]}[${type}]${colors.RESET}`;
  
  console.log(`${colors.GRAY}[${timestamp}]${colors.RESET} ${badge} ${colors.BOLD}${msg}${colors.RESET}`);
}

// 3. FUNGSI UNTUK MENUTUP KOTAK (Hanya garis bawah '─')
export function logEnd(boxWidth: number = 50) {
  console.log(`${colors.GRAY}${'─'.repeat(boxWidth)}${colors.RESET}\n`);
}

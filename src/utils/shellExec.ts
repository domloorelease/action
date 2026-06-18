/**
 * Copyright 2026 SoTeen Studio
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { execSync } from 'child_process';

export function shellExec(command: string): string {
  try {
    // Ubah 'ignore' jadi 'pipe' biar kita bisa baca pesan errornya
    return execSync(command, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch (error: any) {
    // Print pesan error terminal ke console workflow biar kelihatan pas debugging
    console.error(`\n❌ [Shell Error] Command failed: ${command}`);
    if (error.stderr) {
      console.error(`Reason: ${error.stderr.toString().trim()}\n`);
    } else {
      console.error(`Reason: ${error.message}\n`);
    }
    
    // Lempar error ke atas biar proses Node.js/GitHub Action auto-fail
    throw new Error(`Execution failed for: ${command}`);
  }
}

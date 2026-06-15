import * as core from '@actions/core';
import * as github from '@actions/github';
import { execSync } from 'child_process';
import * as fs from 'fs';

// Helper biar eksekusi CLI dapet string bersih dan handal kayak Bash
function shellExec(command: string): string {
  try {
    return execSync(command, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

async function run() {
  try {
    // Ambil env variable yang diset di step deteksi trigger sebelumnya
    const isComment = process.env.IS_COMMENT || '';
    const commentFound = process.env.COMMENT_FOUND || '';

    console.log("=== 1. SEARCHING LATEST TAG & ANCHOR COMMIT ===");
    let latestTag = shellExec('git describe --tags --abbrev=0');
    console.log(`DEBUG: Result of git describe: "${latestTag}"`); // TAMBAHKAN INI
    if (!latestTag) {
      latestTag = "v0.1.0-proto.0";
    }
    console.log(`Latest tag found: ${latestTag}`);

    const tagCommitSha = shellExec(`git rev-list -n 1 "${latestTag}"`);
    console.log(`Commit SHA for that tag: ${tagCommitSha}`);

    console.log("=== 2. FETCHING COMMITS FOR CURRENT RELEASE ===");
    let rawLog = '';
    if (!tagCommitSha) {
      rawLog = shellExec('git log --format="* %s"');
    } else {
      rawLog = shellExec(`git log --format="* %s" ${tagCommitSha}..HEAD`);
    }

    // Meniru persis logic sed -E '/.../d' menggunakan filter regex di TS
    const rawLogLines = rawLog.split('\n').filter(line => line.length > 0);
    const changelogCommitsArray = rawLogLines.filter(line => {
      // Sesuai sed regex 1: /^\* (Merge pull request|Merge branch|chore|docs|test|ci)(\([^)]+\))?:/d
      const regex1 = /^\* (Merge pull request|Merge branch|chore|docs|test|ci)(\([^)]+?\))?:/;
      // Sesuai sed regex 2: /^\* Merge pull request #[0-9]+ from .*/d
      const regex2 = /^\* Merge pull request #[0-9]+ from .*/;
      
      return !regex1.test(line) && !regex2.test(line);
    });

    // ... di dalam run()
    const changelogCommits = changelogCommitsArray.join('\n');

    // GANTI SEMUA INI:
    if (!changelogCommits || !/[^\s]/.test(changelogCommits)) {
      console.log("No new feature/bugfix commits found. Skipping release PR!");
      // JANGAN process.exit(0), cukup set kosong dan return
      core.exportVariable('NEW_VERSION', ''); 
      return; 
    }
    
    // HAPUS BLOCK IF YANG KEMBAR DI BAWAHNYA
    // HAPUS BLOCK IF (if (!changelogCommits) { ... process.exit(0) }) DI BAWAHNYA
    
    // Lanjut ke logic parsing versi di bawah...

    console.log("=== 3. PARSING COMMAND FROM PR ===");
    // BASE_VERSION=$(echo "$LATEST_TAG" | sed -E 's/([^#-]+).*/\1/')
    const baseVersionMatch = latestTag.match(/^([^#-]+)/);
    const baseVersion = baseVersionMatch ? baseVersionMatch[1] : latestTag;

    // TAG_COUNTER=$(echo "$LATEST_TAG" | sed -E 's/.*\.([0-9]+)$/\1/' | grep -E '^[0-9]+$' || echo "0")
    const tagCounterMatch = latestTag.match(/\.([0-9]+)$/);
    const tagCounter = tagCounterMatch && /^[0-9]+$/.test(tagCounterMatch[1]) ? parseInt(tagCounterMatch[1], 10) : 0;

    const currentCommit = shellExec('git rev-parse HEAD');
    
    // Gunakan GH_TOKEN bawaan env untuk otentikasi gh CLI
    const prNumber = shellExec(`gh pr list --state merged --search "${currentCommit}" --json number -q '.[0].number'`);

    let command = "";
    const commandRegex = /@domloo-release (major|minor|patch|proto|alpha|beta|rc|stable|set [0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]*)?)/;

    if (isComment === "true") {
      const match = commentFound.match(commandRegex);
      if (match) command = match[0];
    } else if (prNumber) {
      const prBody = shellExec(`gh pr view "${prNumber}" --json body -q '.body'`);
      const match = prBody.match(commandRegex);
      if (match) command = match[0];
    }

    // TYPE=${COMMAND:-@domloo-release alpha}
    let fullType = command || "@domloo-release alpha";
    // TYPE=${TYPE#@domloo-release }
    let type = fullType.replace("@domloo-release ", "");

    const versionParts = baseVersion.replace(/^v/, "").split('.');
    const major = parseInt(versionParts[0], 10) || 0;
    const minor = parseInt(versionParts[1], 10) || 0;
    const patch = parseInt(versionParts[2], 10) || 0;

    let nextVersion = "";
    let versionBase = "";

    // Exact replica dari switch-case di Bash
    if (type === "major") {
      nextVersion = `${major + 1}.0.0`;
    } else if (type === "minor") {
      nextVersion = `${major}.${minor + 1}.0`;
    } else if (type === "patch") {
      nextVersion = `${major}.${minor}.${patch + 1}`;
    } else if (type === "proto") {
      versionBase = latestTag.replace(/-proto\.[0-9]+/, '');
      nextVersion = `${versionBase}-proto.${tagCounter + 1}`;
    } else if (type === "alpha") {
      versionBase = latestTag.replace(/-alpha\.[0-9]+/, '');
      nextVersion = `${versionBase}-alpha.${tagCounter + 1}`;
    } else if (type === "beta") {
      versionBase = latestTag.replace(/-beta\.[0-9]+/, '');
      nextVersion = `${versionBase}-beta.${tagCounter + 1}`;
    } else if (type === "rc") {
      versionBase = latestTag.replace(/-rc\.[0-9]+/, '');
      nextVersion = `${versionBase}-rc.${tagCounter + 1}`;
    } else if (type === "stable") {
      nextVersion = latestTag.replace(/-.*/, '');
    } else if (type.startsWith("set")) {
      // awk '{print $2}' dari string "set 1.2.3" -> "1.2.3"
      const setParts = type.split(/\s+/);
      nextVersion = setParts[1] || "";
    }

    // 1. Export buat standard @actions/core
    core.exportVariable('NEW_VERSION', nextVersion);

    // 2. FORCE WRITING ke GITHUB_ENV (Ini kunci biar step berikutnya kebaca)
    if (process.env.GITHUB_ENV) {
      fs.appendFileSync(process.env.GITHUB_ENV, `NEW_VERSION=${nextVersion}\n`);
      console.log(`DEBUG: Wrote NEW_VERSION=${nextVersion} to GITHUB_ENV`);
    } else {
      console.log("DEBUG: GITHUB_ENV not found!");
    }

    // Write file current_changelog.md persis gaya echo > dan echo >>
    const changelogContent = `## Changelog for ${nextVersion}\n\n${changelogCommits}\n`;
    fs.writeFileSync('current_changelog.md', changelogContent, 'utf8');

  } catch (error: any) {
    core.setFailed(`Otak Bot Error: ${error.message}`);
  }
}

run();

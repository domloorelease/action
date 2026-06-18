/**
 * Copyright 2026 SoTeen Studio
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import * as core from '@actions/core';
import * as github from '@actions/github';
import { execSync } from 'child_process';
import * as fs from 'fs';
import { shellExec } from "./utils/shellExec.js";

async function run() {
  try {
    
    const isComment = process.env.IS_COMMENT || '';
    const commentFound = process.env.COMMENT_FOUND || '';

    console.log("=== 1. SEARCHING LATEST TAG & ANCHOR COMMIT ===");
    let latestTag = shellExec('git describe --tags --abbrev=0');
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
    
    const rawLogLines = rawLog.split('\n').filter(line => line.length > 0);
    const changelogCommitsArray = rawLogLines.filter(line => {
      
      const regex1 = /^\* (Merge pull request|Merge branch|chore|docs|test|ci)(\([^)]+?\))?:/;
      
      const regex2 = /^\* Merge pull request #[0-9]+ from .*/;
      
      return !regex1.test(line) && !regex2.test(line);
    });

    const changelogCommits = changelogCommitsArray.join('\n');
    
    if (!changelogCommits || !/[^\s]/.test(changelogCommits)) {
      console.log("No feature or bugfix commits found. Skipping release PR!");
      process.exit(0);
    }

    if (!changelogCommits || !/[^\s]/.test(changelogCommits)) {
      console.log("No feature or bugfix commits found. All new commits are minor maintenance (chore/docs/test/ci). Skipping release PR!");
      process.exit(0);
    }

    if (!changelogCommits) {
      console.log(`No new commits found after tag ${latestTag}. Skipping release PR!`);
      process.exit(0);
    }

    console.log("=== 3. PARSING COMMAND FROM PR ===");
    
    const cleanLatestTag = latestTag.replace(/^v/, "");
    
    const baseVersionMatch = cleanLatestTag.match(/^([^#-]+)/);
    const baseVersion = baseVersionMatch ? baseVersionMatch[1] : latestTag;
    
    const tagCounterMatch = cleanLatestTag.match(/\.([0-9]+)$/);
    const tagCounter = tagCounterMatch && /^[0-9]+$/.test(tagCounterMatch[1]) ? parseInt(tagCounterMatch[1], 10) : 0;

    const currentCommit = shellExec('git rev-parse HEAD');
    
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
    
    // Ambil string perintah utuh
    let fullType = command || "@domloo-release alpha";
    
    // Ambil isi di dalam kurung Regex (Capture Group ke-1)
    const matchGroup = fullType.match(/@domloo-release (major|minor|patch|proto|alpha|beta|rc|stable|set \S+)/);
    // Trim string-nya biar gak ada spasi ghaib yang bikin if-statement gagal
    let type = matchGroup ? matchGroup[1].trim() : "alpha";

    console.log(`[Domloo Debug] Parsed Command Type: "${type}"`);

    const versionParts = baseVersion.replace(/^v/, "").split('.');
    const major = parseInt(versionParts[0], 10) || 0;
    const minor = parseInt(versionParts[1], 10) || 0;
    const patch = parseInt(versionParts[2], 10) || 0;

    let nextVersion = "";
    let versionBase = "";
    
    const cleanBase = (tag: string, pattern: RegExp) => {
      return tag.replace(pattern, '').replace(/^v/, '');
    };
    
    if (type === "major") {
      nextVersion = `${major + 1}.0.0`;
    } else if (type === "minor") {
      nextVersion = `${major}.${minor + 1}.0`;
    } else if (type === "patch") {
      nextVersion = `${major}.${minor}.${patch + 1}`;
    } else if (type === "proto") {
      versionBase = cleanBase(cleanLatestTag, /-proto\.[0-9]+/);
      nextVersion = `${versionBase}-proto.${tagCounter + 1}`;
    } else if (type === "alpha") {
      versionBase = cleanBase(cleanLatestTag, /-alpha\.[0-9]+/);
      nextVersion = `${versionBase}-alpha.${tagCounter + 1}`;
    } else if (type === "beta") {
      versionBase = cleanBase(cleanLatestTag, /-beta\.[0-9]+/);
      nextVersion = `${versionBase}-beta.${tagCounter + 1}`;
    } else if (type === "rc") {
      versionBase = cleanBase(cleanLatestTag, /-rc\.[0-9]+/);
      nextVersion = `${versionBase}-rc.${tagCounter + 1}`;
    } else if (type === "stable") {
      nextVersion = cleanLatestTag.replace(/-.*/, '');
    } else if (type.startsWith("set")) {
      
      const setParts = type.split(/\s+/);
      nextVersion = setParts[1] || "";
    }
    
    core.exportVariable('NEW_VERSION', nextVersion);
    
    const changelogContent = `## Changelog for ${nextVersion}\n\n${changelogCommits}\n`;
    fs.writeFileSync('current_changelog.md', changelogContent, 'utf8');

  } catch (error: any) {
    core.setFailed(`Otak Bot Error: ${error.message}`);
  }
}

run();

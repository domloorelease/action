/**
 * Copyright 2026 SoTeen Studio
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { execSync } from 'child_process';
import * as fs from 'fs';

function shellExec(command: string): string {
  try {
    return execSync(command, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

function logStep(msg: string) {
  console.log(`\n\x1b[36m=== ${msg} ===\x1b[0m`);
}

async function run() {
  const nextVersion = process.env.NEW_VERSION;
  const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;

  if (!nextVersion) {
    console.log("NEW_VERSION env is missing. Skipping push engine.");
    return;
  }

  logStep("CONFIGURING BOT IDENTITY");
  shellExec('git config --global user.name "domloo-release[bot]"');
  shellExec('git config --global user.email "293296910+domloo-release[bot]@users.noreply.github.com"');

  logStep("PREPARING CHANGELOG");
  if (fs.existsSync('docs/CHANGELOG.md')) {
    shellExec('cat current_changelog.md docs/CHANGELOG.md > temp_changelog.md && mv temp_changelog.md docs/CHANGELOG.md');
  } else {
    shellExec('cp current_changelog.md docs/CHANGELOG.md');
  }

  const branchName = `release/${nextVersion}`;
  shellExec(`git checkout -B "${branchName}"`);

  logStep("STAGING & COMMITTING");
  if (fs.existsSync('package.json')) shellExec('git add package.json');
  if (fs.existsSync('Cargo.toml')) shellExec('git add Cargo.toml');
  if (fs.existsSync('docs/CHANGELOG.md')) shellExec('git add docs/CHANGELOG.md');

  shellExec(`git commit -m "chore: prepare release ${nextVersion}"`);

  logStep("PUSHING TO REMOTE");
  shellExec(`git push -f "https://x-access-token:${githubToken}@github.com/${repository}.git" "${branchName}"`);

  logStep("CLEANING UP OLD PRS");
  const oldPrsRaw = shellExec(`gh pr list --base main --state open --limit 100 --json headRefName,number -q '.[] | select(.headRefName != null and (.headRefName | startswith("release/")) and .headRefName != "'"${branchName}"'") | .number'`);
  
  if (oldPrsRaw) {
    const oldPrs = oldPrsRaw.split('\n').filter(Boolean);
    for (const prNum of oldPrs) {
      const oldBranch = shellExec(`gh pr view "${prNum}" --json headRefName -q '.headRefName'`);
      console.log(`Closing old PR #${prNum} and deleting branch ${oldBranch}...`);
      shellExec(`gh pr close "${prNum}" --delete-branch`);
      shellExec(`git push "https://x-access-token:${githubToken}@github.com/${repository}.git" --delete "${oldBranch}"`);
    }
  } else {
    console.log("No old release PRs to cleanup.");
  }

  logStep("MANAGING RELEASE PR");
  const prExists = shellExec(`gh pr list --head "${branchName}" --json number -q '.[0].number'`);

  if (!prExists) {
    console.log(`Opening a brand new Release PR for ${branchName}...`);
    shellExec(`gh pr create --title "chore: release ${nextVersion}" --body-file current_changelog.md --base main --head "${branchName}"`);
  } else {
    console.log(`Updating existing PR #${prExists} body...`);
    shellExec(`gh pr edit "${prExists}" --body-file current_changelog.md`);
  }
}

run();

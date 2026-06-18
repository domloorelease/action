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
import { logStart, logLine, logEnd } from './utils/logStep.js';
import { shellExec } from './utils/shellExec.js';

async function run() {
  logStart(16);
  const nextVersion = process.env.NEW_VERSION;
  const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;

  if (!nextVersion) {
    logLine('NEW_VERSION env is missing. Skipping push engine.', 'ERROR');
    logEnd(16);
    return;
  }

  logLine('CONFIGURING BOT IDENTITY');
  shellExec('git config --global user.name "domloo-release[bot]"');
  shellExec(
    'git config --global user.email "293296910+domloo-release[bot]@users.noreply.github.com"',
  );

  logLine('PREPARING CHANGELOG');
  if (fs.existsSync('docs/CHANGELOG.md')) {
    shellExec(
      'cat current_changelog.md docs/CHANGELOG.md > temp_changelog.md && mv temp_changelog.md docs/CHANGELOG.md',
    );
  } else {
    shellExec('cp current_changelog.md docs/CHANGELOG.md');
  }

  const branchName = `release/${nextVersion}`;
  shellExec(`git checkout -B "${branchName}"`);

  logLine('STAGING & COMMITTING');
  if (fs.existsSync('package.json')) shellExec('git add package.json');
  if (fs.existsSync('Cargo.toml')) shellExec('git add Cargo.toml');
  if (fs.existsSync('docs/CHANGELOG.md'))
    shellExec('git add docs/CHANGELOG.md');

  shellExec(`git commit -m "chore: prepare release ${nextVersion}"`);

  logLine('PUSHING TO REMOTE');
  shellExec(
    `git push -f "https://x-access-token:${githubToken}@github.com/${repository}.git" "${branchName}"`,
  );

  logLine('CLEANING UP OLD PRS');
  const oldPrsRaw = shellExec(
    `gh pr list --base main --state open --limit 100 --json headRefName,number -q '.[] | select(.headRefName != null and (.headRefName | startswith("release/")) and .headRefName != "'"${branchName}"'") | .number'`,
  );

  if (oldPrsRaw) {
    const oldPrs = oldPrsRaw.split('\n').filter(Boolean);
    for (const prNum of oldPrs) {
      const oldBranch = shellExec(
        `gh pr view "${prNum}" --json headRefName -q '.headRefName'`,
      );
      logLine(
        `Closing old PR #${prNum} and deleting branch ${oldBranch}...`,
        'WARN',
      );
      shellExec(`gh pr close "${prNum}" --delete-branch`);
      shellExec(
        `git push "https://x-access-token:${githubToken}@github.com/${repository}.git" --delete "${oldBranch}"`,
      );
    }
  } else {
    logLine('No old release PRs to cleanup.');
  }

  logLine('MANAGING RELEASE PR');
  const prExists = shellExec(
    `gh pr list --head "${branchName}" --json number -q '.[0].number'`,
  );

  if (!prExists) {
    logLine(`Opening a brand new Release PR for ${branchName}...`, 'SUCCESS');
    shellExec(
      `gh pr create --title "chore: release ${nextVersion}" --body-file current_changelog.md --base main --head "${branchName}"`,
    );
  } else {
    logLine(`Updating existing PR #${prExists} body...`, 'WARN');
    shellExec(`gh pr edit "${prExists}" --body-file current_changelog.md`);
  }
  logEnd(16);
}

run();

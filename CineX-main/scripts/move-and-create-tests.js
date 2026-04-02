// scripts/move-and-create-tests.js
// Usage: node scripts/move-and-create-tests.js [--move] [--create-stubs] [--backup-dir=some/path]
// Default behavior: --move (remove originals), --create-stubs must be supplied to make stubs.
import { readFile, readdir, copyFile, mkdir, rm, writeFile, access } from 'fs/promises';
import { constants as fsConstants } from 'fs';
import { resolve, join } from 'path';
import process from 'process';

const args = process.argv.slice(2);
const flagMove = args.includes('--move') || !args.includes('--no-move'); // default true
const flagCreateStubs = args.includes('--create-stubs');
const backupArg = args.find(a => a.startsWith('--backup-dir=')) || '';
const backupDirOverride = backupArg ? backupArg.split('=')[1] : null;

const root = process.cwd();
const testsDir = resolve(root, 'tests');
const contractsDir = resolve(root, 'contracts');
const clarinetPath = resolve(root, 'Clarinet.toml');

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = backupDirOverride ? resolve(root, backupDirOverride) : resolve(root, `.backup_tests_${timestamp}`);

function log(...s){ console.log(...s); }

async function exists(path) {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function makeStub(contractName){
  return `;; Auto-generated Rendezvous sanity test for ${contractName}\n\n(begin\n  (print "Running generated sanity test for ${contractName}...")\n  (let ((expected 1) (result (+ 1 0)))\n    (asserts! (is-eq expected result) "Basic sanity check failed")\n  )\n  (ok true)\n)\n`;
}

async function parseContractsFromClarinet() {
  try {
    const txt = await readFile(clarinetPath, 'utf8');
    const re = /\[contracts\.([^\]\s]+)\]/g;
    const names = [];
    let m;
    while ((m = re.exec(txt)) !== null) names.push(m[1]);
    return [...new Set(names)];
  } catch (err) {
    log(`Warning: Clarinet.toml not readable; continuing without contract list.`);
    return [];
  }
}

async function backupExistingContractTests() {
  if (!await exists(contractsDir)) return;
  await mkdir(backupDir, { recursive: true });
  const items = await readdir(contractsDir);
  for (const f of items) {
    if (f.endsWith('.tests.clar')) {
      const src = join(contractsDir, f);
      const dst = join(backupDir, f);
      try {
        await copyFile(src, dst);
        log(`Backed up ${src} -> ${dst}`);
      } catch (e) {
        log('Backup failed for', src, e.message);
      }
    }
  }
}

async function copyTestsFromTestsDir() {
  if (!await exists(testsDir)) {
    log('No tests/ directory found — nothing to copy.');
    return [];
  }
  await mkdir(contractsDir, { recursive: true });

  const files = await readdir(testsDir);
  const moved = [];
  for (const f of files) {
    if (!f.endsWith('.tests.clar')) continue;
    const src = join(testsDir, f);
    const dst = join(contractsDir, f);
    try {
      await copyFile(src, dst);
      log(`Copied ${src} -> ${dst}`);
      moved.push({ src, dst });
      if (flagMove) {
        await rm(src);
        log(`Removed source ${src}`);
      }
    } catch (err) {
      log('Error copying', src, '->', dst, err.message);
    }
  }
  return moved;
}

async function createMissingStubs(contractNames) {
  if (!flagCreateStubs) return;
  await mkdir(contractsDir, { recursive: true });
  for (const name of contractNames) {
    const target = join(contractsDir, `${name}.tests.clar`);
    if (await exists(target)) continue;
    try {
      await writeFile(target, makeStub(name), 'utf8');
      log(`Created stub test for: ${name}`);
    } catch (err) {
      log('Failed creating stub for', name, err.message);
    }
  }
}

async function main(){
  log('--- move-and-create-tests starting ---');
  log(`Root: ${root}`);
  log(`Contracts dir: ${contractsDir}`);
  log(`Tests dir: ${testsDir}`);
  log(`Backup dir: ${backupDir}`);
  log(`Options -> move: ${flagMove}, create-stubs: ${flagCreateStubs}`);

  const contractNames = await parseContractsFromClarinet();
  if (contractNames.length) log('Contracts found in Clarinet.toml:', contractNames.join(', '));
  else log('No contracts parsed from Clarinet.toml.');

  await backupExistingContractTests();
  await copyTestsFromTestsDir();
  await createMissingStubs(contractNames);

  log('--- done. Inspect contracts/*.tests.clar and .backup_tests_* if present ---');
}

main().catch(err => {
  console.error('Fatal error', err);
  process.exit(1);
});

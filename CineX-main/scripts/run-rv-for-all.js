// scripts/run-rv-for-all.js
// Run: node scripts/run-rv-for-all.js
import { readFile } from 'fs/promises';
import { spawnSync } from 'child_process';
import { resolve } from 'path';

const root = process.cwd();
const clarinetPath = resolve(root, 'Clarinet.toml');

function parseContracts(txt) {
  const re = /\[contracts\.([^\]\s]+)\]/g;
  const names = [];
  let m;
  while ((m = re.exec(txt)) !== null) names.push(m[1]);
  return [...new Set(names)];
}

async function main() {
  try {
    const txt = await readFile(clarinetPath, 'utf8');
    const contracts = parseContracts(txt);
    if (!contracts.length) {
      console.log('No contracts found in Clarinet.toml. Exiting.');
      process.exit(0);
    }
    console.log('Contracts to test:', contracts.join(', '));
    for (const c of contracts) {
      console.log('\n========================================');
      console.log(`Running Rendezvous for contract: ${c}`);
      const res = spawnSync('npx', ['rv', '.', c, 'test', '--runs=1'], { stdio: 'inherit', shell: true });
      if (res.error) {
        console.error('Error running rv for', c, res.error);
      }
      if (res.status !== 0) {
        console.warn(`rv exited with status ${res.status} for contract ${c} (continuing)`);
      } else {
        console.log(`rv completed OK for ${c}`);
      }
    }
    console.log('\nAll done.');
  } catch (err) {
    console.error('Failed to read Clarinet.toml or run rendezvous:', err.message);
    process.exit(1);
  }
}

main();

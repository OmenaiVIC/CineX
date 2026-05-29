import { mnemonicToSeedSync } from 'bip39';
import { HDKey } from '@scure/bip32';
import { getAddressFromPrivateKey, TransactionVersion } from '@stacks/transactions';

const mnemonics = {
  wallet_1: 'sell invite acquire kitten bamboo drastic jelly vivid peace spawn twice guilt pave pen trash pretty park cube fragile unaware remain midnight betray rebuild',
  wallet_2: 'hold excess usual excess ring elephant install account glad dry fragile donkey gaze humble truck breeze nation gasp vacuum limb head keep delay hospital',
  wallet_3: 'cycle puppy glare enroll cost improve round trend wrist mushroom scorpion tower claim oppose clever elephant dinosaur eight problem before frozen dune wagon high',
};

const expected = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';

for (const [name, mnemonic] of Object.entries(mnemonics)) {
  const seed = mnemonicToSeedSync(mnemonic);
  const root = HDKey.fromMasterSeed(seed);
  for (let acct = 0; acct < 5; acct++) {
    const path = "m/44'/5757'/" + acct + "'/0/0";
    const child = root.derive(path);
    const pk = Buffer.from(child.privateKey).toString('hex');
    const addr = getAddressFromPrivateKey(pk, TransactionVersion.Testnet);
    console.log(name + ' acct=' + acct + ' -> ' + addr + (addr === expected ? ' <<<' : ''));
  }
}

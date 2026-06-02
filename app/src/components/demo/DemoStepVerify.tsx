import { useState } from 'react';
import { openContractCall } from '@stacks/connect';
import { standardPrincipalCV, stringAsciiCV, uintCV, bufferCV } from '@stacks/transactions';
import { useStacksConnect } from '../../hooks/useStacksConnect';
import TransactionModal, { useTxModal } from '../common/TransactionModal';

const DEPLOYER = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';

const VERTICALS = [
  { value: 'film', label: 'Film' },
  { value: 'music', label: 'Music' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'immersive-media', label: 'Immersive Media' },
  { value: 'other', label: 'Other' },
];

function hashString(s: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(s).slice(0, 32);
}

export default function DemoStepVerify() {
  const { connectWallet, connected, installed, address: walletAddress } = useStacksConnect();
  const tx = useTxModal();

  const [name, setName] = useState('');
  const [vertical, setVertical] = useState('film');
  const [txId, setTxId] = useState('');
  const [done, setDone] = useState(false);

  const handleRegister = async () => {
    if (!name.trim()) { tx.fail('Name is required'); return; }

    const addr = connected && walletAddress ? walletAddress : await connectWallet();
    if (!addr) { tx.fail('Connect your Stacks wallet first'); return; }

    tx.open('Registering', 'Sign the transaction in your wallet...');
    try {
      const identityHash = hashString(addr);
      await openContractCall({
        contractAddress: DEPLOYER,
        contractName: 'project-verification-module',
        functionName: 'register-creator',
        functionArgs: [
          standardPrincipalCV(addr),
          stringAsciiCV(name.trim().slice(0, 100)),
          stringAsciiCV(''),
          bufferCV(identityHash),
          stringAsciiCV(vertical),
          uintCV(1),
          uintCV(99999999),
        ],
        appDetails: { name: 'CineX', icon: window.location.origin + '/favicon.ico' },
        onFinish: (data) => {
          setTxId(data.txId);
          setDone(true);
          tx.succeed(data.txId, `https://explorer.hiro.so/txid/${data.txId}?chain=testnet`);
        },
        onCancel: () => { tx.fail('Transaction cancelled'); },
      });
    } catch (err) {
      tx.fail(err instanceof Error ? err.message : 'Registration failed');
    }
  };

  return (
    <div>
      <TransactionModal
        isOpen={tx.isOpen}
        state={tx.state}
        title={tx.title}
        description={tx.description}
        txId={tx.txId}
        chainUrl={tx.chainUrl}
        error={tx.error}
        onClose={tx.close}
        onRetry={handleRegister}
      />

      {done ? (
        <div style={{ background: 'rgba(74,222,128,0.08)', borderRadius: 12, padding: '1.5rem', border: '1px solid rgba(74,222,128,0.25)', textAlign: 'center' }}>
          <span style={{ fontSize: '2rem' }}>✓</span>
          <p style={{ color: 'var(--green)', fontWeight: 600, marginTop: 8 }}>Verified on-chain!</p>
          {txId && (
            <a
              href={`https://explorer.hiro.so/txid/${txId}?chain=testnet`}
              target="_blank"
              rel="noopener"
              style={{ color: 'var(--green)', fontSize: '.85rem', opacity: 0.7 }}
            >
              View transaction ↗
            </a>
          )}
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: '.85rem', color: 'var(--text-dim)', marginBottom: 4, display: 'block' }}>Display Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Victor Omenai"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: '.9rem', outline: 'none',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '.85rem', color: 'var(--text-dim)', marginBottom: 4, display: 'block' }}>Project Vertical</label>
              <select
                value={vertical}
                onChange={e => setVertical(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: '.9rem', outline: 'none', cursor: 'pointer',
                }}
              >
                {VERTICALS.map(v => (
                  <option key={v.value} value={v.value} style={{ background: '#0a0a0f' }}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleRegister}
            style={{
              marginTop: 16, width: '100%', padding: '12px 24px', borderRadius: 8,
              background: name.trim() ? 'var(--green)' : 'rgba(74,222,128,0.2)',
              color: name.trim() ? 'black' : 'rgba(74,222,128,0.4)',
              fontWeight: 600, fontSize: '.9rem', border: 'none', cursor: name.trim() ? 'pointer' : 'not-allowed',
            }}
            disabled={!name.trim()}
          >
            {connected ? 'Verify Me →' : 'Connect Wallet & Verify'}
          </button>

          {!installed && (
            <p style={{ fontSize: '.8rem', color: 'var(--text-dim)', marginTop: 8, textAlign: 'center' }}>
              Need the{' '}
              <a href="https://www.hiro.so/wallet" target="_blank" rel="noopener" style={{ color: 'var(--green)' }}>
                Hiro Wallet
              </a>{' '}
              browser extension to sign transactions.
            </p>
          )}
        </>
      )}
    </div>
  );
}

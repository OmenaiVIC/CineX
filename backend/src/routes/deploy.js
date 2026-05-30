import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import contractService from '../services/contractService.js';
import { requireAuth } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// POST /deploy/contract — deploy a smart contract from the contracts/ directory
router.post('/contract', requireAuth, async (req, res, next) => {
  try {
    const { contractName } = req.body;
    if (!contractName) return res.status(400).json({ error: 'contractName required' });

    const contractPath = path.resolve(__dirname, '..', '..', '..', 'contracts', `${contractName}.clar`);
    if (!fs.existsSync(contractPath)) {
      return res.status(404).json({ error: `Contract file not found: ${contractPath}` });
    }

    const codeBody = fs.readFileSync(contractPath, 'utf-8');
    if (!process.env.CREATOR_KEY) {
      return res.status(500).json({ error: 'CREATOR_KEY not set' });
    }

    const result = await contractService.deployContract(
      process.env.CREATOR_KEY,
      contractName,
      codeBody,
    );

    res.json({
      status: 'broadcast',
      ...result,
    });
  } catch (err) { next(err); }
});

export default router;

import { Router } from 'express';
import { getDb } from '../database.js';
import { sendContactEmail } from '../services/emailService.js';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const { name, email, category, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required' });
    }
    if (!email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const cat = ['creative', 'backer', 'investor', 'general'].includes(category) ? category : 'general';
    const now = Math.floor(Date.now() / 1000);

    const db = await getDb();
    await db.run(
      'INSERT INTO contact_messages (name, email, category, message, created_at) VALUES ($1, $2, $3, $4, $5)',
      [name, email, cat, message, now]
    );
    db.release();

    const emailRes = await sendContactEmail({ name, email, category: cat, message });

    res.json({
      success: true,
      emailSent: emailRes.sent,
      message: emailRes.sent
        ? 'Message sent successfully'
        : 'Message received (email delivery unavailable, we will review manually)',
    });
  } catch (err) { next(err); }
});

export default router;

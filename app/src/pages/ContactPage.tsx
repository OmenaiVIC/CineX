import { useState } from 'react';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import * as api from '../services/api';

const CATEGORIES = [
  { value: 'general', label: 'General Inquiry' },
  { value: 'creative', label: 'I\'m a Creative' },
  { value: 'backer', label: 'I want to Fund Projects' },
  { value: 'investor', label: 'I\'m an Investor' },
];

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !message.trim()) {
      setError('All fields are required');
      return;
    }
    if (!email.includes('@')) {
      setError('Enter a valid email address');
      return;
    }

    setLoading(true);
    const res = await api.post('/contact', { name, email, category, message });
    setLoading(false);

    if (res.success) {
      setSent(true);
    } else {
      setError(res.error || 'Failed to send message');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Contact Us</h1>
          <p className="text-sm text-gray-500 mt-2">
            Have a question, want to collaborate, or ready to invest? We'd love to hear from you.
          </p>
        </div>

        <Card variant="light" padding="default">
          {sent ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">✓</div>
              <h3 className="text-lg font-semibold text-white mb-2">Message Sent</h3>
              <p className="text-sm text-gray-400 mb-6">
                Thanks {name}! We'll get back to you at <strong className="text-gray-300">{email}</strong>.
              </p>
              <Button variant="outline" onClick={() => { setSent(false); setName(''); setEmail(''); setMessage(''); }}>
                Send Another
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Name</label>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-4 py-3 text-sm text-white bg-[#0a0a0f] border border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Message</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Tell us what's on your mind..."
                  rows={5}
                  className="w-full px-4 py-3 text-sm text-white bg-transparent border border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent placeholder-gray-400 resize-none"
                />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <Button variant="primary" className="w-full" disabled={loading}>
                {loading ? 'Sending...' : 'Send Message'}
              </Button>

              <p className="text-xs text-gray-600 text-center">
                Or email us directly at{' '}
                <a href="mailto:mediacinex@gmail.com" className="text-[#4ade80] hover:underline">mediacinex@gmail.com</a>
              </p>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}

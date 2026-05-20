import { useState } from 'react';
import type { UserProfile } from '../../../types';

interface EditProfileModalProps {
  profile: UserProfile;
  onSave: (updates: Partial<UserProfile>) => Promise<void>;
  onClose: () => void;
}

export default function EditProfileModal({ profile, onSave, onClose }: EditProfileModalProps) {
  const [username, setUsername] = useState(profile.username || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState(profile.portfolioUrl || '');
  const [twitter, setTwitter] = useState(profile.socialLinks?.twitter || '');
  const [instagram, setInstagram] = useState(profile.socialLinks?.instagram || '');
  const [website, setWebsite] = useState(profile.socialLinks?.website || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({
        username: username || undefined,
        bio: bio || undefined,
        portfolioUrl: portfolioUrl || undefined,
        socialLinks: {
          twitter: twitter || undefined,
          instagram: instagram || undefined,
          website: website || undefined,
        },
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-lg mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Edit Profile</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Display name"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Tell the community about yourself"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Portfolio URL</label>
            <input
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="https://your-portfolio.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Twitter</label>
              <input
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="@handle"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Instagram</label>
              <input
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="@handle"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Website</label>
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="https://example.com"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useState } from 'react';
import type { Profile } from '../../../types';

interface Props {
  profile: Profile;
  onClose: () => void;
  onSave: (changes: Partial<Profile>) => void;
}

export default function EditProfileModal({ profile, onClose, onSave }: Props) {
  const [displayName, setDisplayName] = useState(profile.displayName || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || '');
  const [twitter, setTwitter] = useState(profile.socialLinks?.twitter || '');
  const [website, setWebsite] = useState(profile.socialLinks?.website || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    onSave({
      displayName,
      bio,
      avatarUrl,
      socialLinks: {
        ...(twitter ? { twitter } : {}),
        ...(website ? { website } : {}),
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Edit Profile</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Display Name</label>
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-black border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-400/50" />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3}
              className="w-full bg-black border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-400/50 resize-none" />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Avatar URL</label>
            <input type="url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)}
              className="w-full bg-black border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-400/50" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Twitter</label>
              <input type="url" value={twitter} onChange={(e) => setTwitter(e.target.value)}
                className="w-full bg-black border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-400/50" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Website</label>
              <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)}
                className="w-full bg-black border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-400/50" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 bg-yellow-400 text-black font-semibold rounded-xl hover:bg-yellow-300 transition text-sm disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

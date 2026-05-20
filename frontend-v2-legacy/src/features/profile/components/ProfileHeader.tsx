import { useState } from 'react';
import type { Profile } from '../../../types';
import EditProfileModal from './EditProfileModal';

interface Props {
  profile: Profile;
  isOwnProfile: boolean;
  onUpdate: (changes: Partial<Profile>) => void;
}

function ReputationBadge({ score, count }: { score: number; count: number }) {
  const stars = Math.round(score);
  return (
    <div className="flex items-center gap-2 bg-black border border-gray-800 rounded-xl px-3 py-1.5">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <svg key={i} className={`w-4 h-4 ${i <= stars ? 'text-yellow-400' : 'text-gray-700'}`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-yellow-400 text-sm font-semibold">{score.toFixed(1)}</span>
      {count > 0 && <span className="text-gray-500 text-xs">({count})</span>}
    </div>
  );
}

export default function ProfileHeader({ profile, isOwnProfile, onUpdate }: Props) {
  const [showEdit, setShowEdit] = useState(false);

  return (
    <>
      <div className="bg-black border border-gray-800 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <svg className="w-10 h-10 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <h1 className="text-2xl font-bold text-white truncate">
              {profile.displayName || 'Unnamed'}
            </h1>
            {profile.reputationScore > 0 && (
              <ReputationBadge score={profile.reputationScore} count={profile.ratingCount} />
            )}
          </div>

          {profile.bio && <p className="text-gray-400 text-sm mt-1">{profile.bio}</p>}

          <div className="flex flex-wrap gap-3 mt-3">
            {Object.entries(profile.socialLinks || {}).map(([key, url]) => (
              <a key={key} href={url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-gray-500 hover:text-yellow-400 transition capitalize flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                {key}
              </a>
            ))}
          </div>

          <p className="text-gray-600 text-xs mt-2 font-mono">
            {profile.address}
          </p>
        </div>

        {isOwnProfile && (
          <button onClick={() => setShowEdit(true)}
            className="px-4 py-2 bg-gray-800 text-gray-300 hover:text-white rounded-xl hover:bg-gray-700 transition text-sm flex-shrink-0">
            Edit Profile
          </button>
        )}
      </div>

      {showEdit && (
        <EditProfileModal
          profile={profile}
          onClose={() => setShowEdit(false)}
          onSave={(changes) => { onUpdate(changes); setShowEdit(false); }}
        />
      )}
    </>
  );
}

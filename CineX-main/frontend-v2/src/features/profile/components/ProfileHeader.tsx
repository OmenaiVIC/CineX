import VerificationBadge from '../../../components/common/VerificationBadge';
import type { UserProfile } from '../../../types';

interface ProfileHeaderProps {
  profile: UserProfile;
  onEdit?: () => void;
}

export default function ProfileHeader({ profile, onEdit }: ProfileHeaderProps) {
  const truncateAddress = (addr: string) =>
    addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-indigo-900/50 border-2 border-indigo-700 flex items-center justify-center text-2xl font-bold text-indigo-400">
            {profile.username ? profile.username[0].toUpperCase() : truncateAddress(profile.address)[0]}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">
                {profile.username || truncateAddress(profile.address)}
              </h1>
              <VerificationBadge level={profile.verificationLevel} size="md" />
            </div>
            {profile.username && (
              <p className="text-sm text-gray-500 font-mono mt-0.5">{truncateAddress(profile.address)}</p>
            )}
            {profile.bio && <p className="text-sm text-gray-300 mt-2 max-w-xl">{profile.bio}</p>}
          </div>
        </div>
        {onEdit && (
          <button
            onClick={onEdit}
            className="px-4 py-2 text-sm rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors"
          >
            Edit Profile
          </button>
        )}
      </div>
      {profile.socialLinks && (
        <div className="flex gap-4 mt-4">
          {profile.socialLinks.twitter && (
            <a
              href={`https://twitter.com/${profile.socialLinks.twitter}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-400 hover:text-indigo-300"
            >
              @{profile.socialLinks.twitter}
            </a>
          )}
          {profile.socialLinks.instagram && (
            <a
              href={`https://instagram.com/${profile.socialLinks.instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-400 hover:text-indigo-300"
            >
              {profile.socialLinks.instagram}
            </a>
          )}
          {profile.socialLinks.website && (
            <a
              href={profile.socialLinks.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-400 hover:text-indigo-300"
            >
              Website
            </a>
          )}
        </div>
      )}
    </div>
  );
}

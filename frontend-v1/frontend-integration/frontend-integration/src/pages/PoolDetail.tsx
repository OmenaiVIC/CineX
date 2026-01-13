import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { CoEPPool, PoolMember, PoolRotation } from '../types';
import { createCoEPService } from '../services/coepService';
import { createVerificationService } from '../services/verificationService';
import { useAuth } from '../auth/StacksAuthContext';
import { 
  TransactionModal, 
  useTransactionModal, 
  type TransactionConfirmationData 
} from '../lib/TransactionModal';
// import { useTransactionNotifications, TransactionToast } from '../lib/TransactionStatusUI'; // Removed for prototype
import styles from '../styles/pages/PoolDetail.module.css';

// Icons for different sections and statuses
import { 
  FaArrowLeft,
  FaUsers,
  FaClock,
  FaGlobe,
  FaMapMarkerAlt,
  FaCheckCircle,
  FaExclamationCircle,
  FaCopy,
  FaExternalLinkAlt,
  FaCalendarAlt,
  FaCoins,
  FaTrophy,
  FaUserCheck,
  FaUserClock,
  FaFilm,
  FaVideo,
  FaBookOpen,
  FaMusic,
  FaTv,
  FaChartLine,
  FaHandshake
} from 'react-icons/fa';

// Helper functions
const getStatusClass = (status: CoEPPool['status']) => {
  switch (status) {
    case 'forming': return styles.statusForming;
    case 'active': return styles.statusActive;
    case 'completed': return styles.statusCompleted;
    case 'paused': return styles.statusPaused;
    default: return '';
  }
};

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',  
    day: 'numeric'
  });
};

const PoolDetail: React.FC = () => {
  const { poolId } = useParams<{ poolId: string }>();
  const navigate = useNavigate();
  const { userSession, userData } = useAuth();
  const coepService = createCoEPService(userSession);
  const verificationService = createVerificationService(userSession);

  // Helper to get current user's STX address
  const getCurrentAddress = () => {
    return userData?.profile?.stxAddress?.mainnet || userData?.profile?.stxAddress?.testnet;
  };

  // State management
  const [pool, setPool] = useState<CoEPPool | null>(null);
  const [members, setMembers] = useState<PoolMember[]>([]);
  const [rotations, setRotations] = useState<PoolRotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'timeline' | 'statistics'>('overview');
  const [creatorVerified, setCreatorVerified] = useState<boolean | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<any>(null);

  // Transaction modal
  const transactionModal = useTransactionModal();
  // const notifications = useTransactionNotifications(); // Removed for prototype

  // Fetch pool data
  useEffect(() => {
    const fetchPoolData = async () => {
      if (!poolId) {
        setError('Pool ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch pool details
        const poolResult = await coepService.getPoolDetails(poolId);
        if (!poolResult.success || !poolResult.data) {
          setError(poolResult.error || 'Failed to load pool details');
          return;
        }
        setPool(poolResult.data);

        // Fetch pool members
        const membersResult = await coepService.getPoolMembers(poolId);
        if (membersResult.success && membersResult.data) {
          setMembers(membersResult.data.items);
        }

        // Fetch rotation history
        const rotationsResult = await coepService.getPoolRotations(poolId);
        if (rotationsResult.success && rotationsResult.data) {
          setRotations(rotationsResult.data);
        }

      } catch (err) {
        setError('An unexpected error occurred while loading pool details');
      } finally {
        setLoading(false);
      }
    };

    fetchPoolData();
  }, [poolId]);

  // Check creator verification status after pool details are loaded
  useEffect(() => {
    if (pool && pool.creator) {
      (async () => {
        try {
          const profileResult = await verificationService.getFilmmakerProfile(pool.creator);
          if (profileResult.success && profileResult.data) {
            setCreatorVerified(true);
            setCreatorProfile(profileResult.data);
          } else {
            setCreatorVerified(false);
            setCreatorProfile(null);
          }
        } catch (e) {
          setCreatorVerified(false);
          setCreatorProfile(null);
        }
      })();
    }
  }, [pool]);

  // Helper functions
  const getCategoryIcon = (category: CoEPPool['category']) => {
    switch (category) {
      case 'feature': return <FaFilm />;
      case 'short-film': return <FaVideo />;
      case 'documentary': return <FaBookOpen />;
      case 'music-video': return <FaMusic />;
      case 'web-series': return <FaTv />;
      default: return <FaFilm />;
    }
  };

  const formatContribution = (amount: string) => {
    const stx = parseFloat(amount) / 1000000;
    return `${stx.toLocaleString()} STX`;
  };

  const formatGeographicFocus = (geo: CoEPPool['geographicFocus']) => {
    return geo.charAt(0).toUpperCase() + geo.slice(1);
  };

  const formatCategory = (category: CoEPPool['category']) => {
    return category.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const canJoinPool = () => {
    const currentAddress = getCurrentAddress();
    if (!pool || !currentAddress) return false;
    return pool.status === 'forming' && 
           pool.currentMembers < pool.maxMembers && 
           !members.some(member => member.address === currentAddress) &&
           creatorVerified === true; // Only allow joining if creator is verified
  };

  const isPoolMember = () => {
    const currentAddress = getCurrentAddress();
    if (!pool || !currentAddress) return false;
    return members.some(member => member.address === currentAddress);
  };

  // Handle join pool
  const handleJoinPool = async () => {
    const currentAddress = getCurrentAddress();
    if (!pool || !currentAddress) return;

    try {
      const joinData: TransactionConfirmationData = {
        type: 'pool-join',
        title: 'Join Co-EP Pool',
        description: `Join ${pool.name} pool with ${formatContribution(pool.contributionAmount)} contribution`,
        amount: formatContribution(pool.contributionAmount),
        estimatedFees: '0.003 STX',
        contractCall: {
          contractAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.coep-pool', // Default contract address
          contractName: 'coep-pool',
          functionName: 'join-pool',
          functionArgs: [
            { name: 'pool-id', type: 'uint', value: pool.id },
            { name: 'rotation-order', type: 'uint', value: (pool.currentMembers + 1).toString() }
          ]
        },
        metadata: {
          poolName: pool.name,
          cycleDuration: pool.cycleDuration,
          currentMembers: pool.currentMembers,
          maxMembers: pool.maxMembers
        },
        warnings: [
          'Joining a pool requires commitment to the full rotation cycle',
          'Early withdrawal may forfeit your contributions',
          'Pool success depends on all members participating'
        ]
      };

      transactionModal.openModal(joinData);
      
      // The actual join pool logic would be handled by the onConfirm callback
      // For now, we'll handle it here after the modal confirmation
      const result = await coepService.joinPool({
        poolId: pool.id,
        rotationOrder: pool.currentMembers + 1,
      });

      if (result.success) {
        alert('Pool joined successfully!');
        // Refresh pool data
        window.location.reload();
      } else {
        alert('Failed to join pool: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      alert('An error occurred while joining the pool');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={styles.poolDetail}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading pool details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !pool) {
    return (
      <div className={styles.poolDetail}>
        <div className={styles.error}>
          <FaExclamationCircle className={styles.errorIcon} />
          <h3>Failed to Load Pool</h3>
          <p>{error}</p>
          <div className={styles.errorActions}>
            <button onClick={() => window.location.reload()} className={styles.retryButton}>
              Try Again
            </button>
            <button onClick={() => navigate('/pools')} className={styles.backButton}>
              Back to Pools
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.poolDetail}>
      {/* Back Navigation */}
      <div className={styles.navigation}>
        <button onClick={() => navigate('/pools')} className={styles.backBtn}>
          <FaArrowLeft />
          Back to Pools
        </button>
      </div>

      {/* Modernized Pool Header with horizontal cards */}
      <div className={styles.poolHeader}>
        <div className={styles.headerMainModern}>
          <div className={styles.titleSectionModern}>
            <div className={styles.categoryBadge}>
              {getCategoryIcon(pool.category)}
              <span>{formatCategory(pool.category)}</span>
            </div>
            <h1 className={styles.poolTitle}>{pool.name}</h1>
            <div className={`${styles.statusBadge} ${getStatusClass(pool.status)}`}>
              {pool.status.charAt(0).toUpperCase() + pool.status.slice(1)}
            </div>
            <div style={{marginTop: 8}}>
              {creatorVerified === true && creatorProfile && (
                <span style={{color: 'green', fontWeight: 600}}>
                  <FaUserCheck style={{marginRight: 4}} /> Verified Creator
                </span>
              )}
              {creatorVerified === false && (
                <span style={{color: 'red', fontWeight: 600}}>
                  <FaExclamationCircle style={{marginRight: 4}} /> Creator Not Verified
                </span>
              )}
            </div>
          </div>
          <div className={styles.statsRowModern}>
            <div className={styles.statCardModern}>
              <FaUsers className={styles.statIconModern} />
              <div>
                <div className={styles.statValueModern}>{pool.currentMembers}/{pool.maxMembers}</div>
                <div className={styles.statLabelModern}>Members</div>
              </div>
            </div>
            <div className={styles.statCardModern}>
              <FaCoins className={styles.statIconModern} />
              <div>
                <div className={styles.statValueModern}>{formatContribution(pool.contributionAmount)}</div>
                <div className={styles.statLabelModern}>Per Rotation</div>
              </div>
            </div>
            <div className={styles.statCardModern}>
              <FaClock className={styles.statIconModern} />
              <div>
                <div className={styles.statValueModern}>{pool.currentRotation}/{pool.totalRotations}</div>
                <div className={styles.statLabelModern}>Rotation</div>
              </div>
            </div>
            <div className={styles.statCardModern}>
              {pool.geographicFocus === 'global' ? <FaGlobe className={styles.statIconModern} /> : <FaMapMarkerAlt className={styles.statIconModern} />}
              <div>
                <div className={styles.statValueModern}>{formatGeographicFocus(pool.geographicFocus)}</div>
                <div className={styles.statLabelModern}>Focus</div>
              </div>
            </div>
          </div>
          <div className={styles.headerActionsModern}>
            {canJoinPool() && (
              <button onClick={handleJoinPool} className={styles.joinButton}>
                <FaHandshake />
                Join Pool
              </button>
            )}
            {isPoolMember() && (
              <div className={styles.memberBadge}>
                <FaUserCheck />
                Pool Member
              </div>
            )}
            <button className={styles.shareButton}>
              <FaCopy />
              Share Pool
            </button>
          </div>
        </div>
      </div>

      {/* Pool Description */}
      <div className={styles.description}>
        <p>{pool.description}</p>
      </div>

      {/* Progress Bar */}
      <div className={styles.progressSection}>
        <div className={styles.progressLabel}>
          <span>Pool Progress</span>
          <span>{Math.round((pool.currentMembers / pool.maxMembers) * 100)}% Full</span>
        </div>
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill}
            style={{ width: `${(pool.currentMembers / pool.maxMembers) * 100}%` }}
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className={styles.tabNavigation}>
        <button 
          className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <FaFilm />
          Overview
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'members' ? styles.active : ''}`}
          onClick={() => setActiveTab('members')}
        >
          <FaUsers />
          Members ({members.length})
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'timeline' ? styles.active : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          <FaCalendarAlt />
          Timeline
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'statistics' ? styles.active : ''}`}
          onClick={() => setActiveTab('statistics')}
        >
          <FaChartLine />
          Statistics
        </button>
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {activeTab === 'overview' && (
          <OverviewTab pool={pool} />
        )}
        
        {activeTab === 'members' && (
          <MembersTab members={members} pool={pool} />
        )}
        
        {activeTab === 'timeline' && (
          <TimelineTab rotations={rotations} pool={pool} />
        )}
        
        {activeTab === 'statistics' && (
          <StatisticsTab pool={pool} members={members} rotations={rotations} />
        )}
      </div>

      {/* Transaction Modal */}
      {transactionModal.transactionData && (
        <TransactionModal 
          isOpen={transactionModal.isOpen}
          transactionData={transactionModal.transactionData}
          onConfirm={transactionModal.confirmTransaction}
          onCancel={transactionModal.closeModal}
        />
      )}
      
      {/* Transaction Notifications - Removed for prototype */}
    </div>
  );
};

// Tab Components
interface OverviewTabProps {
  pool: CoEPPool;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ pool }) => {
  return (
    <div className={styles.overviewTab}>
      <div className={styles.overviewGrid}>
        <div className={styles.infoCard}>
          <h3>Pool Information</h3>
          <div className={styles.infoList}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Creator</span>
              <span className={styles.infoValue}>{pool.creator.slice(0, 6)}...{pool.creator.slice(-4)}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Created</span>
              <span className={styles.infoValue}>{formatDate(pool.createdAt)}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Cycle Duration</span>
              <span className={styles.infoValue}>{pool.cycleDuration} blocks</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Total Rotations</span>
              <span className={styles.infoValue}>{pool.totalRotations}</span>
            </div>
            {pool.legalAgreementHash && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Legal Agreement</span>
                <span className={styles.infoValue}>
                  <FaExternalLinkAlt />
                  View Document
                </span>
              </div>
            )}
          </div>
        </div>

        <div className={styles.infoCard}>
          <h3>Contribution Details</h3>
          <div className={styles.contributionDetails}>
            <div className={styles.contributionAmount}>
              <span className={styles.amount}>{parseFloat(pool.contributionAmount) / 1000000}</span>
              <span className={styles.currency}>STX</span>
            </div>
            <p className={styles.contributionNote}>
              Each member contributes this amount per rotation cycle.
              Total pool value: <strong>{(parseFloat(pool.contributionAmount) * pool.maxMembers / 1000000).toLocaleString()} STX</strong>
            </p>
          </div>
        </div>

        <div className={styles.infoCard}>
          <h3>Pool Rules</h3>
          <ul className={styles.rulesList}>
            <li>All members must contribute on time for each rotation</li>
            <li>Beneficiary order is determined by join date and rotation schedule</li>
            <li>Early withdrawal may result in forfeiture of contributions</li>
            <li>Verified filmmakers receive priority benefits</li>
            <li>Pool funds are held in secure escrow during rotations</li>
          </ul>
        </div>

        <div className={styles.infoCard}>
          <h3>Current Status</h3>
          <div className={styles.statusInfo}>
            <div className={styles.statusIndicator}>
              <span className={`${styles.statusDot} ${getStatusClass(pool.status)}`}></span>
              <span>{pool.status.charAt(0).toUpperCase() + pool.status.slice(1)}</span>
            </div>
            {pool.status === 'forming' && (
              <p className={styles.statusDescription}>
                This pool is currently accepting new members. 
                {pool.maxMembers - pool.currentMembers} spots remaining.
              </p>
            )}
            {pool.status === 'active' && (
              <p className={styles.statusDescription}>
                Pool is active and running rotation {pool.currentRotation} of {pool.totalRotations}.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface MembersTabProps {
  members: PoolMember[];
  pool: CoEPPool;
}

const MembersTab: React.FC<MembersTabProps> = ({ members, pool }) => {
  const getVerificationIcon = (status: PoolMember['verificationStatus']) => {
    switch (status) {
      case '3-tier':
        return <FaTrophy className={styles.verificationGold} />;
      case '2-tier':
        return <FaCheckCircle className={styles.verificationSilver} />;
      case '1-tier':
        return <FaUserCheck className={styles.verificationBronze} />;
      default:
        return <FaUserClock className={styles.verificationPending} />;
    }
  };

  const formatJoinDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US');
  };

  return (
    <div className={styles.membersTab}>
      <div className={styles.membersHeader}>
        <h3>Pool Members ({members.length}/{pool.maxMembers})</h3>
        <div className={styles.memberStats}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>
              {members.filter(m => m.verificationStatus !== 'unverified').length}
            </span>
            <span className={styles.statLabel}>Verified</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>
              {members.filter(m => m.isActive).length}
            </span>
            <span className={styles.statLabel}>Active</span>
          </div>
        </div>
      </div>

      <div className={styles.membersGrid}>
        {members.map((member) => (
          <div key={member.address} className={styles.memberCard}>
            <div className={styles.memberHeader}>
              <div className={styles.memberInfo}>
                <div className={styles.memberAddress}>
                  {member.address.slice(0, 6)}...{member.address.slice(-4)}
                </div>
                <div className={styles.memberVerification}>
                  {getVerificationIcon(member.verificationStatus)}
                  <span className={styles.verificationLevel}>
                    {member.verificationStatus.charAt(0).toUpperCase()}
                    {member.verificationStatus.slice(1).replace('-', ' ')}
                  </span>
                </div>
              </div>
              <div className={styles.rotationOrder}>
                #{member.rotationOrder}
              </div>
            </div>

            <div className={styles.memberStats}>
              <div className={styles.memberStat}>
                <span className={styles.statLabel}>Joined</span>
                <span className={styles.statValue}>{formatJoinDate(member.joinedAt)}</span>
              </div>
              <div className={styles.memberStat}>
                <span className={styles.statLabel}>Contributions</span>
                <span className={styles.statValue}>{member.contributionsMade}</span>
              </div>
              <div className={styles.memberStat}>
                <span className={styles.statLabel}>Status</span>
                <span className={`${styles.statValue} ${member.isActive ? styles.active : styles.inactive}`}>
                  {member.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {member.hasBenefited && (
              <div className={styles.benefitBadge}>
                <FaTrophy />
                Benefited
              </div>
            )}
          </div>
        ))}

        {/* Empty slots */}
        {Array.from({ length: pool.maxMembers - members.length }, (_, i) => (
          <div key={`empty-${i}`} className={styles.emptySlot}>
            <FaUsers className={styles.emptyIcon} />
            <span>Open Slot</span>
          </div>
        ))}
      </div>
    </div>
  );
};

interface TimelineTabProps {
  rotations: PoolRotation[];
  pool: CoEPPool;
}

const TimelineTab: React.FC<TimelineTabProps> = ({ rotations, pool }) => {
  return (
    <div className={styles.timelineTab}>
      <h3>Rotation Timeline</h3>
      
      <div className={styles.timeline}>
        {rotations.map((rotation) => (
          <div key={rotation.rotationNumber} className={styles.timelineItem}>
            <div className={`${styles.timelineMarker} ${
              rotation.status === 'completed' ? styles.completed :
              rotation.status === 'active' ? styles.active :
              styles.upcoming
            }`}>
              {rotation.status === 'completed' ? <FaCheckCircle /> : 
               rotation.status === 'active' ? <FaClock /> :
               <FaCalendarAlt />}
            </div>
            
            <div className={styles.timelineContent}>
              <div className={styles.timelineHeader}>
                <h4>Rotation {rotation.rotationNumber}</h4>
                <span className={`${styles.rotationStatus} ${styles[rotation.status]}`}>
                  {rotation.status.charAt(0).toUpperCase() + rotation.status.slice(1)}
                </span>
              </div>
              
              <div className={styles.timelineDetails}>
                <div className={styles.beneficiaryInfo}>
                  <span className={styles.label}>Beneficiary:</span>
                  <span className={styles.value}>
                    {rotation.beneficiary.slice(0, 6)}...{rotation.beneficiary.slice(-4)}
                  </span>
                </div>
                
                <div className={styles.amountInfo}>
                  <span className={styles.label}>Amount:</span>
                  <span className={styles.value}>
                    {parseFloat(rotation.amount) / 1000000} STX
                  </span>
                </div>
                
                {rotation.status === 'completed' && (
                  <div className={styles.dateInfo}>
                    <span className={styles.label}>End Block:</span>
                    <span className={styles.value}>#{rotation.endBlock}</span>
                  </div>
                )}
                
                {rotation.status === 'active' && (
                  <div className={styles.activeRotation}>
                    <FaClock />
                    <span>Currently active rotation</span>
                  </div>
                )}
                
                {rotation.project?.title && (
                  <div className={styles.projectInfo}>
                    <span className={styles.label}>Project:</span>
                    <span className={styles.value}>{rotation.project.title}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {/* Upcoming rotations */}
        {Array.from({ 
          length: Math.max(0, pool.totalRotations - rotations.length) 
        }, (_, i) => (
          <div key={`upcoming-${i}`} className={styles.timelineItem}>
            <div className={`${styles.timelineMarker} ${styles.upcoming}`}>
              <FaCalendarAlt />
            </div>
            <div className={styles.timelineContent}>
              <div className={styles.timelineHeader}>
                <h4>Rotation {rotations.length + i + 1}</h4>
                <span className={`${styles.rotationStatus} ${styles.upcoming}`}>
                  Upcoming
                </span>
              </div>
              <div className={styles.timelineDetails}>
                <p className={styles.upcomingNote}>
                  This rotation will begin after the current cycle completes.
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface StatisticsTabProps {
  pool: CoEPPool;
  members: PoolMember[];
  rotations: PoolRotation[];
}

const StatisticsTab: React.FC<StatisticsTabProps> = ({ pool, members, rotations }) => {
  const completedRotations = rotations.filter(r => r.status === 'completed').length;
  const totalContributed = rotations.reduce((sum, r) => 
    r.status === 'completed' ? sum + parseFloat(r.amount) : sum, 0
  ) / 1000000;
  const avgContribution = members.length > 0 ? 
    members.reduce((sum, m) => sum + m.contributionsMade, 0) / members.length : 0;
  const verifiedMembers = members.filter(m => m.verificationStatus !== 'unverified').length;
  const verificationRate = members.length > 0 ? (verifiedMembers / members.length * 100) : 0;

  return (
    <div className={styles.statisticsTab}>
      <h3>Pool Statistics</h3>
      
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FaCoins />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{totalContributed.toLocaleString()}</div>
            <div className={styles.statLabel}>Total STX Distributed</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FaCheckCircle />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{completedRotations}</div>
            <div className={styles.statLabel}>Completed Rotations</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FaUserCheck />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{verificationRate.toFixed(1)}%</div>
            <div className={styles.statLabel}>Verification Rate</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FaChartLine />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{avgContribution.toFixed(1)}</div>
            <div className={styles.statLabel}>Avg Contributions</div>
          </div>
        </div>
      </div>

      <div className={styles.detailedStats}>
        <div className={styles.statSection}>
          <h4>Member Breakdown</h4>
          <div className={styles.memberBreakdown}>
            <div className={styles.breakdownItem}>
              <span className={styles.breakdownLabel}>3-Tier Verified</span>
              <span className={styles.breakdownValue}>
                {members.filter(m => m.verificationStatus === '3-tier').length}
              </span>
            </div>
            <div className={styles.breakdownItem}>
              <span className={styles.breakdownLabel}>2-Tier Verified</span>
              <span className={styles.breakdownValue}>
                {members.filter(m => m.verificationStatus === '2-tier').length}
              </span>
            </div>
            <div className={styles.breakdownItem}>
              <span className={styles.breakdownLabel}>1-Tier Verified</span>
              <span className={styles.breakdownValue}>
                {members.filter(m => m.verificationStatus === '1-tier').length}
              </span>
            </div>
            <div className={styles.breakdownItem}>
              <span className={styles.breakdownLabel}>Unverified</span>
              <span className={styles.breakdownValue}>
                {members.filter(m => m.verificationStatus === 'unverified').length}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.statSection}>
          <h4>Pool Performance</h4>
          <div className={styles.performanceMetrics}>
            <div className={styles.metricItem}>
              <span className={styles.metricLabel}>Success Rate</span>
              <span className={styles.metricValue}>
                {pool.totalRotations > 0 ? 
                  ((completedRotations / pool.totalRotations) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div className={styles.metricItem}>
              <span className={styles.metricLabel}>Fill Rate</span>
              <span className={styles.metricValue}>
                {((pool.currentMembers / pool.maxMembers) * 100).toFixed(1)}%
              </span>
            </div>
            <div className={styles.metricItem}>
              <span className={styles.metricLabel}>Active Members</span>
              <span className={styles.metricValue}>
                {members.filter(m => m.isActive).length}/{members.length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PoolDetail;

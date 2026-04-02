import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CoEPPool, PoolFilters, PaginationParams } from '../types';
import { createCoEPService } from '../services/coepService';
import { useAuth } from '../auth/StacksAuthContext';
import styles from '../styles/pages/CoEPPools.module.css';

// Icons for different categories and statuses
import { 
  FaChevronLeft, 
  FaChevronRight,
  FaUsers
} from 'react-icons/fa';


interface CoEPPoolsProps {}

const CoEPPools: React.FC<CoEPPoolsProps> = () => {

  // Auth context
  const { userSession } = useAuth();
  const coepService = createCoEPService(userSession);

  // State management
  const [pools, setPools] = useState<CoEPPool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<PoolFilters>({
    category: undefined,
    geographicFocus: undefined,
    status: undefined,
    hasSpace: undefined,
    search: undefined,
  });
  const [pageSize, setPageSize] = useState(12);

  // Fetch pools from service
  const fetchPools = async () => {
    try {
      setLoading(true);
      setError(null);
      const pagination: PaginationParams = {
        page: currentPage,
        limit: pageSize,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };
      const result = await coepService.getPools(filters, pagination);
      setPools(result.data?.items || []);
      setTotalPages(result.data?.totalPages || 1);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch pools');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPools();
    // eslint-disable-next-line
  }, [currentPage, pageSize, filters]);

  // Filtering logic
  const filteredPools = useMemo(() => {
    let filtered = pools;
    if (searchTerm) {
      filtered = filtered.filter(pool =>
        pool.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filters.category) {
      filtered = filtered.filter(pool => pool.category === filters.category);
    }
    if (filters.geographicFocus) {
      filtered = filtered.filter(pool => pool.geographicFocus === filters.geographicFocus);
    }
    if (filters.status) {
      filtered = filtered.filter(pool => pool.status === filters.status);
    }
    if (filters.hasSpace) {
      filtered = filtered.filter(pool => pool.currentMembers < pool.maxMembers);
    }
    return filtered;
  }, [pools, searchTerm, filters]);

  // Handlers
  const handleFilterChange = (key: keyof PoolFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value === 'all' ? undefined : value }));
    setCurrentPage(1);
  };
  const clearFilters = () => {
    setFilters({
      category: undefined,
      geographicFocus: undefined,
      status: undefined,
      hasSpace: undefined,
      search: undefined,
    });
    setSearchTerm('');
    setCurrentPage(1);
  };
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  // Main render
  return (
    <div className={styles.coepPools}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: 700, marginBottom: 24 }}>
        <h1 style={{ fontWeight: 800, fontSize: '2.2rem', color: '#181c32', margin: 0 }}>Co-EP Rotating Funding Pools</h1>
        <button className={styles.actionBtn} onClick={() => setShowFilters(f => !f)}>
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>
      </div>

      {showFilters && (
        <div className={styles.filtersPanel} style={{ maxWidth: 700, width: '100%', marginBottom: 24 }}>
          <div className={styles.filterGroup}>
            <label>Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={styles.filterInput}
              placeholder="Search by pool name..."
            />
          </div>
          <div className={styles.filterGroup}>
            <label>Category</label>
            <select
              value={filters.category || ''}
              onChange={e => handleFilterChange('category', e.target.value || undefined)}
              className={styles.filterSelect}
            >
              <option value="">All Categories</option>
              <option value="short-film">Short Film</option>
              <option value="feature">Feature</option>
              <option value="documentary">Documentary</option>
              <option value="music-video">Music Video</option>
              <option value="web-series">Web Series</option>
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label>Geographic Focus</label>
            <select
              value={filters.geographicFocus || ''}
              onChange={e => handleFilterChange('geographicFocus', e.target.value || undefined)}
              className={styles.filterSelect}
            >
              <option value="">All Regions</option>
              <option value="bollywood">Bollywood</option>
              <option value="hollywood">Hollywood</option>
              <option value="nollywood">Nollywood</option>
              <option value="global">Global</option>
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label>Pool Status</label>
            <select
              value={filters.status || ''}
              onChange={e => handleFilterChange('status', e.target.value || undefined)}
              className={styles.filterSelect}
            >
              <option value="">All Statuses</option>
              <option value="forming">Forming</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="paused">Paused</option>
            </select>
          </div>
          <button onClick={clearFilters} className={styles.clearFiltersButton} style={{ marginTop: 12 }}>
            Clear All
          </button>
        </div>
      )}

      {loading && (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading pools...</p>
        </div>
      )}

      {error && (
        <div className={styles.error}>
          <p>Error: {error}</p>
          <button onClick={fetchPools} className={styles.retryButton}>
            Try Again
          </button>
        </div>
      )}

      {!loading && !error && filteredPools.length === 0 && (
        <div className={styles.emptyState}>
          <FaUsers className={styles.emptyIcon} />
          <h3>No pools found</h3>
          <p>
            {searchTerm || Object.values(filters).some(f => f !== undefined)
              ? 'Try adjusting your search or filters to find more pools.'
              : 'No Co-EP pools are currently available. Be the first to create one!'}
          </p>
          {(searchTerm || Object.values(filters).some(f => f !== undefined)) && (
            <button onClick={clearFilters} className={styles.clearFiltersButton}>
              Clear Search & Filters
            </button>
          )}
        </div>
      )}

      {!loading && !error && filteredPools.length > 0 && (
        <>
          <div className={styles.poolsGrid}>
            {filteredPools.map((pool) => (
              <PoolCard key={pool.id} pool={pool} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <div className={styles.paginationInfo}>
                <span>Page {currentPage} of {totalPages}</span>
                <select
                  value={pageSize}
                  onChange={e => handlePageSizeChange(Number(e.target.value))}
                  className={styles.pageSizeSelect}
                >
                  <option value={12}>12 per page</option>
                  <option value={24}>24 per page</option>
                  <option value={48}>48 per page</option>
                </select>
              </div>
              <div className={styles.paginationControls}>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={styles.paginationButton}
                >
                  <FaChevronLeft /> Previous
                </button>
                <div className={styles.pageNumbers}>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`${styles.pageNumber} ${currentPage === pageNum ? styles.active : ''}`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={styles.paginationButton}
                >
                  Next <FaChevronRight />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <div className={styles.socialTrust}>
        <h2>Social Trust & Endorsements</h2>
        <p>Build your reputation by collaborating on projects and receiving endorsements from other filmmakers.</p>
        <ul>
          <li>Endorsements and mutual projects increase your pool reputation.</li>
          <li>Verified members are prioritized for funding rounds.</li>
        </ul>
      </div>
    </div>
  );
}

// Pool Card Component (clean, minimal, card-based)
interface PoolCardProps {
  pool: CoEPPool;
}

const PoolCard: React.FC<PoolCardProps> = ({ pool }) => {
  const navigate = useNavigate();

  // Format helpers
  const formatContribution = (amount: string) => {
    const stx = parseFloat(amount) / 1000000;
    return `${stx.toLocaleString()} STX`;
  };
  const formatGeographicFocus = (geo: CoEPPool['geographicFocus']) => geo.charAt(0).toUpperCase() + geo.slice(1);
  const formatCategory = (category: CoEPPool['category']) => category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  return (
    <div className={styles.poolCard}>
      <div className={styles.poolCardTitle}>{pool.name}</div>
      <div className={styles.poolCardDetails}>
        <div><span className="label">Category:</span> <span className="value">{formatCategory(pool.category)}</span></div>
        <div><span className="label">Status:</span> <span className="value">{pool.status.charAt(0).toUpperCase() + pool.status.slice(1)}</span></div>
        <div><span className="label">Members:</span> <span className="value">{pool.currentMembers}/{pool.maxMembers}</span></div>
        <div><span className="label">Rotation:</span> <span className="value">{pool.currentRotation}/{pool.totalRotations}</span></div>
        <div><span className="label">Focus:</span> <span className="value">{formatGeographicFocus(pool.geographicFocus)}</span></div>
        <div><span className="label">Contribution:</span> <span className="value">{formatContribution(pool.contributionAmount)} / rotation</span></div>
      </div>
      <div className={styles.poolCardActions}>
        <button
          className={styles.actionBtn}
          disabled={
            (pool.status === 'forming' && pool.currentMembers >= pool.maxMembers) ||
            (pool.status !== 'forming' && pool.status !== 'active' && pool.status !== 'completed')
          }
          onClick={() => navigate(`/pool-detail/${pool.id}`)}
        >
          {pool.status === 'forming' && pool.currentMembers < pool.maxMembers
            ? 'Join Pool'
            : pool.status === 'active'
            ? 'View Details'
            : pool.status === 'completed'
            ? 'View Results'
            : 'Pool Full'}
        </button>
        <button
          className={styles.actionBtn}
          onClick={() => navigate(`/pool-detail/${pool.id}`)}
        >
          Learn More
        </button>
      </div>
    </div>
  );
};





export default CoEPPools;

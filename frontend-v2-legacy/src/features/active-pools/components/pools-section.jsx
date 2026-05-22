import { createCampaignService } from '../../../services/campaignService';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@contexts/StacksAuthContext';
import ContributionModal from './contribution-modal';

function PoolsSection() {
  console.log('VITE_CAMPAIGN_CONTRACT_ADDRESS (pools-section.jsx):', import.meta.env.VITE_CAMPAIGN_CONTRACT_ADDRESS);
  const { isAuthenticated, userSession } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('all');

  // 12 dummy pools with realistic film project data
  const initialPools = [
    {
      id: 1,
      title: 'Ethereal Dreams: A Sci-Fi Epic',
      category: 'feature',
      image: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1200&h=800&fit=crop',
      fundingGoal: 250000,
      currentFunding: 187500,
      investors: 1245,
      daysLeft: 18,
      featured: true,
      description: 'An ambitious sci-fi feature film exploring the intersection of consciousness and technology.',
      tags: ['Sci-Fi', 'Feature', 'High Budget']
    },
    {
      id: 2,
      title: 'Midnight in Marrakech',
      category: 'feature',
      image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&h=800&fit=crop',
      fundingGoal: 180000,
      currentFunding: 156000,
      investors: 892,
      daysLeft: 12,
      featured: false,
      description: 'A romantic thriller set in Morocco with international cast and crew.',
      tags: ['Drama', 'Romance', 'International']
    },
    {
      id: 3,
      title: 'Beyond the Horizon',
      category: 'documentary',
      image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&h=800&fit=crop',
      fundingGoal: 85000,
      currentFunding: 72250,
      investors: 634,
      daysLeft: 24,
      featured: false,
      description: 'A documentary exploring climate change impacts on coastal communities worldwide.',
      tags: ['Documentary', 'Climate', 'Social Impact']
    },
    {
      id: 4,
      title: 'The Last Station',
      category: 'short',
      image: 'https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?w=1200&h=800&fit=crop',
      fundingGoal: 35000,
      currentFunding: 28350,
      investors: 412,
      daysLeft: 8,
      featured: false,
      description: 'A 15-minute experimental short film about human connection in a modern world.',
      tags: ['Short Film', 'Experimental', 'Indie']
    },
    {
      id: 5,
      title: 'Echoes of Tomorrow',
      category: 'feature',
      image: 'https://images.unsplash.com/photo-1499346030926-9a72daac6c63?w=1200&h=800&fit=crop',
      fundingGoal: 320000,
      currentFunding: 224000,
      investors: 1856,
      daysLeft: 31,
      featured: false,
      description: 'A cyberpunk noir thriller set in a dystopian near-future city.',
      tags: ['Thriller', 'Sci-Fi', 'Noir']
    },
    {
      id: 6,
      title: 'Roots Deep',
      category: 'documentary',
      image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&h=800&fit=crop',
      fundingGoal: 95000,
      currentFunding: 80750,
      investors: 723,
      daysLeft: 15,
      featured: false,
      description: 'Documentary about preserving indigenous cultural heritage in the Amazon.',
      tags: ['Documentary', 'Cultural', 'Indigenous']
    },
    {
      id: 7,
      title: 'City Pulse',
      category: 'short',
      image: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1200&h=800&fit=crop',
      fundingGoal: 42000,
      currentFunding: 31500,
      investors: 289,
      daysLeft: 20,
      featured: false,
      description: 'A visual poetry short about urban life and hidden beauty in everyday moments.',
      tags: ['Short Film', 'Poetry', 'Urban']
    },
    {
      id: 8,
      title: 'Whispers in the Dark',
      category: 'feature',
      image: 'https://images.unsplash.com/photo-1505852679233-d9fd70aff56d?w=1200&h=800&fit=crop',
      fundingGoal: 195000,
      currentFunding: 146250,
      investors: 1023,
      daysLeft: 27,
      featured: false,
      description: 'A psychological horror feature that challenges the boundaries of reality.',
      tags: ['Horror', 'Psychological', 'Feature']
    },
    {
      id: 9,
      title: 'Harmony Rising',
      category: 'documentary',
      image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200&h=800&fit=crop',
      fundingGoal: 110000,
      currentFunding: 99000,
      investors: 847,
      daysLeft: 10,
      featured: false,
      description: 'A music documentary following emerging artists from developing nations.',
      tags: ['Documentary', 'Music', 'Global']
    },
    {
      id: 10,
      title: 'The Forgotten Letters',
      category: 'short',
      image: 'https://images.unsplash.com/photo-1473186505569-9c61870c11f9?w=1200&h=800&fit=crop',
      fundingGoal: 28000,
      currentFunding: 21000,
      investors: 198,
      daysLeft: 16,
      featured: false,
      description: 'A touching short about rediscovering family history through old letters.',
      tags: ['Short Film', 'Drama', 'Family']
    },
    {
      id: 11,
      title: 'Neon Paradise',
      category: 'feature',
      image: 'https://images.unsplash.com/photo-1509395176047-4a66953fd231?w=1200&h=800&fit=crop',
      fundingGoal: 275000,
      currentFunding: 192500,
      investors: 1567,
      daysLeft: 22,
      featured: false,
      description: 'A stylish action-adventure set in a futuristic Southeast Asian metropolis.',
      tags: ['Action', 'Adventure', 'Feature']
    },
    {
      id: 12,
      title: 'Voices of the Unheard',
      category: 'documentary',
      image: 'https://images.unsplash.com/photo-1509099836639-18ba66a66b5f?w=1200&h=800&fit=crop',
      fundingGoal: 78000,
      currentFunding: 66300,
      investors: 601,
      daysLeft: 19,
      featured: false,
      description: 'A documentary giving platform to marginalized voices in modern society.',
      tags: ['Documentary', 'Social', 'Activism']
    }
  ];

  // Additional creative media pools
  initialPools.push(
    {
      id: 13,
      title: 'Into the Metascape',
      category: 'ar-vr',
      image: 'https://images.unsplash.com/photo-1523362628745-0c100150b8f0?w=500&h=300&fit=crop',
      fundingGoal: 120000,
      currentFunding: 45000,
      investors: 214,
      daysLeft: 28,
      featured: false,
      description: 'An immersive AR/VR experience blending narrative cinema with interactive environments.',
      tags: ['AR/VR', 'Immersive', 'Interactive']
    },
    {
      id: 14,
      title: 'Soundscapes of Tomorrow',
      category: 'music',
      image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=500&h=300&fit=crop',
      fundingGoal: 40000,
      currentFunding: 18000,
      investors: 342,
      daysLeft: 12,
      featured: false,
      description: 'An independent album and music video series produced with emerging artists.',
      tags: ['Music', 'Album', 'Indie']
    },
    {
      id: 15,
      title: 'Stories After Dark',
      category: 'podcast',
      image: 'https://images.unsplash.com/photo-1517816743773-6e0fd518b4a6?w=500&h=300&fit=crop',
      fundingGoal: 15000,
      currentFunding: 7200,
      investors: 128,
      daysLeft: 22,
      featured: false,
      description: 'A serialized audio documentary podcast exploring untold human stories.',
      tags: ['Podcast', 'Audio', 'Documentary']
    }
  );

  const [pools, setPools] = useState(initialPools);
  const [selectedPool, setSelectedPool] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const categories = [
    { id: 'all', label: 'All Pools' },
    { id: 'feature', label: 'Feature' },
    { id: 'documentary', label: 'Documentary' },
    { id: 'short', label: 'Short' },
    { id: 'ar-vr', label: 'AR/VR' },
    { id: 'music', label: 'Music' },
    { id: 'podcast', label: 'Podcast' },
  ];

  const getCategoryLabel = (id) => categories.find(c => c.id === id)?.label || id;
  
  const filteredPools = selectedCategory === 'all' 
    ? pools 
    : pools.filter(pool => pool.category === selectedCategory);

  const featuredPool = pools.find(p => p.featured);
  const displayPools = selectedCategory === 'all' 
    ? filteredPools.filter(p => !p.featured) 
    : filteredPools;

  // Progress bar percentage
  const getProgress = (current, goal) => (current / goal) * 100;

  // Format currency
  const formatCurrency = (amount) => `${(amount / 1000).toFixed(0)}k STX`;

  const PoolCard = ({ pool, featured = false }) => (
    <div className={`w-full ${featured ? 'lg:w-2/3' : 'md:w-1/2 lg:w-1/3'} p-4`}>
      <div className="h-full bg-gradient-radial-dark border border-gray-900/30 rounded-3xl overflow-hidden hover:border-green-500/40 transition duration-300">
        {/* Image */}
        <div className="mb-6 overflow-hidden h-48 md:h-64 lg:h-72">
          <img 
            className="w-full h-full object-cover transform hover:scale-105 transition duration-500" 
            src={pool.image} 
            alt={pool.title} 
          />
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          {/* Category Badge */}
          <div className="flex items-center mb-4">
            <span className="text-sm text-green-400 font-medium capitalize">{pool.category}</span>
            {featured && <span className="ml-2 px-2 py-1 bg-green-500 text-black text-xs font-bold rounded-full">Featured</span>}
          </div>

          {/* Title */}
          <Link to={`/active-pools/${pool.id}`} className={`block mb-3 text-white font-bold hover:text-green-400 transition duration-200 line-clamp-2 ${featured ? 'text-3xl' : 'text-xl'}`}>
            {pool.title}
          </Link>

          {/* Description */}
          <p className="mb-5 text-gray-300 text-sm line-clamp-2">
            {pool.description}
          </p>

          {/* Funding Progress */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-400">Funding Progress</span>
              <span className="text-sm text-green-400 font-semibold">{Math.round(getProgress(pool.currentFunding, pool.fundingGoal))}%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-green-400 to-green-500 h-full transition-all duration-500"
                style={{ width: `${getProgress(pool.currentFunding, pool.fundingGoal)}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center mt-2 text-xs text-gray-400">
              <span>{formatCurrency(pool.currentFunding)} raised</span>
              <span>Goal: {formatCurrency(pool.fundingGoal)}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex justify-between mb-5 text-xs text-gray-400 border-t border-gray-800 pt-4">
            <div className="text-center flex-1">
              <p className="text-green-400 font-bold text-lg">{pool.investors.toLocaleString()}</p>
               <p>Investors</p>
             </div>
             <div className="text-center flex-1 border-l border-gray-800">
               <p className="text-cyan-400 font-bold text-lg">{pool.daysLeft}</p>
              <p>Days Left</p>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-5">
            {pool.tags.map((tag, idx) => (
              <span key={idx} className="px-3 py-1 text-xs text-gray-300 bg-gray-800/50 border border-gray-700 rounded-full hover:border-green-500/30 transition">
                {tag}
              </span>
            ))}
          </div>

          {/* CTA Button */}
          <button onClick={() => { setSelectedPool(pool); setShowModal(true); }} disabled={!isAuthenticated} className={`w-full py-3 px-4 font-bold rounded-lg transition duration-300 ${isAuthenticated ? 'bg-green-500 hover:bg-green-400 text-black' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`}>
            {isAuthenticated ? 'Contribute' : 'Connect Wallet'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <section className="pt-20 lg:pt-24 pb-24">
      <div className="container px-4 mx-auto">
        {/* Header */}
        <header className="text-center mb-20">
          <h1 className="font-heading text-7xl lg:text-8xl text-white tracking-tighter mb-6">
            Active Pools
          </h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            Discover and join collaborative film financing pools on CineX. Support creative projects and earn rewards.
          </p>
        </header>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-4 mb-20">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-6 py-3 rounded-full font-medium transition duration-300 ${
                selectedCategory === category.id
                  ? 'bg-green-500 text-black'
                  : 'bg-gray-900/30 text-gray-300 border border-gray-700 hover:border-green-500'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>

        {/* Featured Pool */}
        {selectedCategory === 'all' && featuredPool && (
          <div className="mb-20">
            <h2 className="text-3xl text-white font-bold mb-8 text-center">Featured Pool</h2>
            <div className="flex flex-wrap -m-4 justify-center">
              <PoolCard pool={featuredPool} featured={true} />
            </div>
          </div>
        )}

        {/* Pool Grid */}
        <div>
          {selectedCategory !== 'all' && (
            <h2 className="text-2xl text-white font-bold mb-8">
              {getCategoryLabel(selectedCategory)}
            </h2>
          )}
          <div className="flex flex-wrap -m-4">
            {displayPools.map((pool) => (
              <PoolCard key={pool.id} pool={pool} featured={false} />
            ))}
          </div>
        </div>

        {/* No Results */}
        {displayPools.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg">No pools found in this category.</p>
          </div>
        )}
        {showModal && selectedPool && (
          <ContributionModal
            pool={selectedPool}
            onClose={() => { setSelectedPool(null); setShowModal(false); }}
            onContribute={async (amount) => {
              if (!userSession) {
                return { error: 'Wallet not connected' };
              }
              const campaignService = createCampaignService(userSession);
              const result = await campaignService.contributeToCampaign({
                campaignId: selectedPool.id.toString(),
                amount: amount.toString(),
                message: ''
              });
              if (result.success) {
                const updatedPool = { ...selectedPool, currentFunding: selectedPool.currentFunding + amount, investors: selectedPool.investors + 1 };
                setPools(prev => prev.map(p => p.id === selectedPool.id ? updatedPool : p));
                return { ...result.data, txId: result.transactionId, updated: updatedPool };
              } else {
                return { error: result.error };
              }
            }}
          />
        )}
      </div>
    </section>
  );
}

export default PoolsSection;

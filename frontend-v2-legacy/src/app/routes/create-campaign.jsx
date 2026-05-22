import React, { useState, useEffect } from 'react';
import { createCampaignService } from '../../services/campaignService';
import { useAuth } from '../../auth/StacksAuthContext';
import { useLocation } from 'react-router-dom';
import DashboardLayout from '@components/dashboard/DashboardLayout';
import CampaignTypeSelector from '@features/campaign/components/campaign-type-selector';
import PublicCampaignForm from '@features/campaign/components/public-campaign-form';
import PrivatePoolForm from '@features/campaign/components/private-pool-form';

export default function CreateCampaign() {
  const [step, setStep] = useState('select'); // select, form, review
  const [campaignType, setCampaignType] = useState(null);
  const [formData, setFormData] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const t = q.get('type');
    if (t === 'private' || t === 'private-pool') {
      setCampaignType('private-pool');
      setStep('form');
    } else if (t === 'public') {
      setCampaignType('public');
      setStep('form');
    }
  }, [location.search]);

  const handleSelectType = (type) => {
    setCampaignType(type);
    setStep('form');
  };

  const handleSubmitForm = (data) => {
    setFormData(data);
    setStep('review');
  };

  const handleCancel = () => {
    setStep('select');
    setCampaignType(null);
    setFormData(null);
  };

  const { userSession } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txId, setTxId] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleCreateCampaign = async () => {
    setError(null);
    setIsSubmitting(true);
    setTxId(null);
    setSuccess(false);
    try {
      if (!userSession) {
        setError('Please connect your wallet first');
        setIsSubmitting(false);
        return;
      }
      const campaignService = createCampaignService(userSession);
      // Allowed categories
      const allowedCategories = [
        'short-film', 'feature', 'documentary', 'music-video', 'web-series', 'animation', 'podcast', 'other'
      ];
      let category = formData.category || formData.filmGenre || 'feature';
      if (!allowedCategories.includes(category)) {
        category = 'feature';
      }
      const result = await campaignService.createCampaign({
        title: formData.title,
        description: formData.description,
        targetAmount: formData.targetAmount,
        category,
        deadline: formData.deadline ? new Date(formData.deadline).getTime() : Date.now() + (30 * 24 * 60 * 60 * 1000),
        duration: formData.fundingPeriod || formData.duration || 30,
        rewardTiers: formData.rewardTiers || 3,
        rewardDescription: formData.rewardDescription || 'Standard rewards for backers',
        mediaUrls: formData.mediaUrls || [],
        tags: formData.tags || [],
      });
      console.log('[create-campaign.jsx] Service result:', result);
      if (result.success) {
        setTxId(result.transactionId ?? null);
        setSuccess(true);
      } else {
        setError(result.error || 'Failed to create campaign');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('[create-campaign.jsx] Unexpected error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-white mb-2">Create Campaign</h1>
            <p className="text-gray-400">
              {step === 'select' && 'Choose how you want to fund your film project'}
              {step === 'form' && `Complete your ${campaignType === 'public' ? 'public campaign' : 'private pool'} details`}
              {step === 'review' && 'Review your campaign before launch'}
            </p>
          </div>

          {/* Step Indicator */}
          <div className="mb-12 flex items-center justify-center gap-2">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${step === 'select' || step === 'form' || step === 'review' ? 'bg-yellow-400 text-black' : 'bg-gray-700 text-gray-300'}`}>
              1
            </div>
            <div className={`h-1 w-12 ${step === 'form' || step === 'review' ? 'bg-yellow-400' : 'bg-gray-700'}`}></div>
            <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${step === 'form' || step === 'review' ? 'bg-yellow-400 text-black' : 'bg-gray-700 text-gray-300'}`}>
              2
            </div>
            <div className={`h-1 w-12 ${step === 'review' ? 'bg-yellow-400' : 'bg-gray-700'}`}></div>
            <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${step === 'review' ? 'bg-yellow-400 text-black' : 'bg-gray-700 text-gray-300'}`}>
              3
            </div>
          </div>

          {/* Content */}
          <div className="p-8 lg:p-12 bg-black border border-gray-800 rounded-2xl text-white">
            {step === 'select' && (
              <CampaignTypeSelector selectedType={campaignType} onSelectType={handleSelectType} />
            )}

            {step === 'form' && campaignType === 'public' && (
              <PublicCampaignForm onSubmit={handleSubmitForm} onCancel={handleCancel} />
            )}

            {step === 'form' && campaignType === 'private-pool' && (
              <PrivatePoolForm onSubmit={handleSubmitForm} onCancel={handleCancel} />
            )}

            {step === 'review' && formData && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-6">Review Your Campaign</h3>
                </div>

                {/* Campaign Type Badge */}
                <div>
                  <p className="text-gray-400 mb-2 text-sm">Campaign Type</p>
                  <div className="inline-block px-4 py-2 bg-yellow-400/20 border border-yellow-400 rounded-lg text-yellow-400 font-semibold">
                    {formData.type === 'public' ? '🌍 Public Campaign' : '🔒 Private Pool'}
                  </div>
                </div>

                {/* Title and Logline */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-gray-400 mb-2 text-sm">Title</p>
                    <p className="text-white text-lg font-semibold">{formData.title}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-2 text-sm">Logline</p>
                    <p className="text-white text-lg">{formData.logline}</p>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <p className="text-gray-400 mb-2 text-sm">Description</p>
                  <p className="text-white leading-relaxed">{formData.description}</p>
                </div>

                {/* Funding Details */}
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-gray-400 mb-2 text-sm">Target Amount</p>
                    <p className="text-white text-xl font-bold">{Number(formData.targetAmount).toLocaleString()} STX</p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-2 text-sm">Funding Period</p>
                    <p className="text-white text-xl font-bold">{formData.fundingPeriod} days</p>
                  </div>
                  {formData.type === 'private-pool' && (
                    <div>
                      <p className="text-gray-400 mb-2 text-sm">Min. Investment</p>
                      <p className="text-white text-xl font-bold">{Number(formData.minInvestment).toLocaleString()} STX</p>
                    </div>
                  )}
                </div>

                {/* Additional Details */}
                {formData.type === 'public' && formData.filmGenre && (
                  <div>
                    <p className="text-gray-400 mb-2 text-sm">Film Genre</p>
                    <p className="text-white">{formData.filmGenre}</p>
                  </div>
                )}

                {formData.type === 'private-pool' && formData.coProducerRoles && formData.coProducerRoles.length > 0 && (
                  <div>
                    <p className="text-gray-400 mb-2 text-sm">Co-Producer Roles</p>
                    <div className="flex flex-wrap gap-2">
                      {formData.coProducerRoles.map((role) => (
                        <span key={role} className="px-3 py-1 bg-gray-700 text-gray-200 rounded-full text-sm">
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {formData.type === 'private-pool' && formData.invitedInvestors && formData.invitedInvestors.length > 0 && (
                  <div>
                    <p className="text-gray-400 mb-3 text-sm">Invited Co-Producers ({formData.invitedInvestors.length})</p>
                    <div className="space-y-2">
                      {formData.invitedInvestors.map((email) => (
                        <div key={email} className="flex items-center gap-3 p-3 bg-gray-900/30 border border-gray-700 rounded-lg">
                          <svg className="w-5 h-5 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path>
                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path>
                          </svg>
                          <span className="text-gray-300">{email}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col gap-4 pt-6 border-t border-gray-700">
                  {error && (
                    <div className="text-red-500 font-semibold">{error}</div>
                  )}
                  {success && txId && (
                    <div className="text-green-500 font-semibold">
                      ✅ Campaign created! TxID: <span style={{fontFamily:'monospace'}}>{txId}</span><br />
                      <a href={`https://explorer.stacks.co/txid/${txId}?chain=devnet`} target="_blank" rel="noopener noreferrer">View on Stacks Explorer</a>
                    </div>
                  )}
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setStep('form')}
                      className="flex-1 px-6 py-3 border border-gray-700 text-gray-300 font-semibold rounded-lg hover:bg-gray-900/50 transition"
                      disabled={isSubmitting}
                    >
                      Back to Edit
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateCampaign}
                      className="flex-1 px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-bold rounded-lg transition"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Broadcasting...' : 'Launch Campaign'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}

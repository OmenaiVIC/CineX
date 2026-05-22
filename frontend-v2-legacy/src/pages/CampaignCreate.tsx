
import React, { useState } from 'react';
import { useAuth } from '../auth/StacksAuthContext';
import { createCampaignService } from '../services/campaignService';
// Removed modal import for campaign creation
import styles from '../styles/pages/PoolCreate.module.css'; // Reuse pool create styles

// Category types and labels
const categories = [
  'short-film',
  'feature',
  'documentary',
  'music-video',
  'web-series',
  'animation',
  'podcast',
  'other',
] as const;
type CategoryType = typeof categories[number];
const categoryLabels: Record<CategoryType, string> = {
  'short-film': 'Short Film',
  'feature': 'Feature Film',
  'documentary': 'Documentary',
  'music-video': 'Music Video',
  'web-series': 'Web Series',
  'animation': 'Animation',
  'podcast': 'Podcast',
  'other': 'Other',
};

// Calculate minimum deadline (7 days from now)
const minDeadline = new Date();
minDeadline.setDate(minDeadline.getDate() + 7);
const minDeadlineString = minDeadline.toISOString().split('T')[0];

const CampaignCreate: React.FC = () => {

    // ...existing code...
  const { userData, userSession } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetAmount: '',
    category: 'feature' as CategoryType,
    duration: '', // in days
    rewardTiers: '',
    rewardDescription: '',
    deadline: '',
    mediaUrls: [''],
    tags: [''],
  });
  const [txId, setTxId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMediaUrlChange = (index: number, value: string) => {
    const newMediaUrls = [...formData.mediaUrls];
    newMediaUrls[index] = value;
    setFormData(prev => ({ ...prev, mediaUrls: newMediaUrls }));
  };

  const addMediaUrl = () => {
    setFormData(prev => ({ ...prev, mediaUrls: [...prev.mediaUrls, ''] }));
  };

  const removeMediaUrl = (index: number) => {
    setFormData(prev => ({
      ...prev,
      mediaUrls: prev.mediaUrls.filter((_, i) => i !== index)
    }));
  };

  const handleTagChange = (index: number, value: string) => {
    const newTags = [...formData.tags];
    newTags[index] = value;
    setFormData(prev => ({ ...prev, tags: newTags }));
  };

  const addTag = () => {
    setFormData(prev => ({ ...prev, tags: [...prev.tags, ''] }));
  };

  const removeTag = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }));
  };


  // Directly call the service on submit, like frontend-v1
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userSession) {
      setError('Please connect your wallet first');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const campaignService = createCampaignService(userSession);
      const deadlineTimestamp = new Date(formData.deadline).getTime();
      const mediaUrls = formData.mediaUrls.filter(url => url.trim() !== '');
      const tags = formData.tags.filter(tag => tag.trim() !== '');
      console.log('[CampaignCreate] Submitting campaign:', formData);
      const result = await campaignService.createCampaign({
        title: formData.title,
        description: formData.description,
        targetAmount: formData.targetAmount,
        category: formData.category as any,
        deadline: deadlineTimestamp,
        duration: formData.duration ? Number(formData.duration) : undefined,
        rewardTiers: formData.rewardTiers ? Number(formData.rewardTiers) : undefined,
        rewardDescription: formData.rewardDescription,
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
        tags: tags.length > 0 ? tags : undefined,
      });
      console.log('[CampaignCreate] Service result:', result);
      if (result.success) {
        setTxId(result.transactionId ?? null);
        setSuccess(true);
        console.log('[CampaignCreate] Transaction ID:', result.transactionId);
      } else {
        setError(result.error || 'Failed to create campaign');
        console.error('[CampaignCreate] Error:', result.error);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('[CampaignCreate] Unexpected error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

    return (
      <div className={styles.poolCreate}>
        <header className={styles.campaignHero}>
          <h1 className={styles.campaignTitle}>🎬 Create Your Campaign</h1>
          <p className={styles.campaignSubtitle}>
            Launch a crowdfunding campaign for your creative project. <br />
            Set your funding goal and share your vision with the community.
          </p>
        </header>

        {success && (
          <div className={styles.successMessage}>
            ✅ Campaign created successfully! Check your wallet for transaction confirmation.<br />
            {txId && (
              <>
                <br />
                <span style={{ fontWeight: 'bold' }}>TxID:</span> <span style={{ fontFamily: 'monospace' }}>{txId}</span>
                <br />
                <a href={`https://explorer.stacks.co/txid/${txId}?chain=devnet`} target="_blank" rel="noopener noreferrer">View on Stacks Explorer</a>
                <button style={{ marginLeft: 8 }} type="button" onClick={() => {navigator.clipboard.writeText(txId!)}}>Copy TxID</button>
              </>
            )}
          </div>
        )}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formSection}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Campaign Duration (days) *
                <span className={styles.helperText}>How long should your campaign run? (minimum 1 day)</span>
              </label>
              <input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleInputChange}
                className={styles.input}
                required
                min="1"
                placeholder="e.g., 30"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Reward Tiers *
                <span className={styles.helperText}>How many reward tiers will you offer?</span>
              </label>
              <input
                type="number"
                name="rewardTiers"
                value={formData.rewardTiers}
                onChange={handleInputChange}
                className={styles.input}
                required
                min="1"
                placeholder="e.g., 3"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Reward Description *
                <span className={styles.helperText}>Describe the rewards for your backers (max 150 characters)</span>
              </label>
              <input
                type="text"
                name="rewardDescription"
                value={formData.rewardDescription}
                onChange={handleInputChange}
                className={styles.input}
                required
                maxLength={150}
                placeholder="e.g., Digital poster, special thanks, etc."
              />
            </div>
          </div>

          <h2 className={styles.sectionTitle}>Campaign Details</h2>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Campaign Title *
              <span className={styles.helperText}>Give your project a compelling name</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className={styles.input}
              required
              maxLength={100}
              placeholder="e.g., My Independent Film Project"
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Description *
              <span className={styles.helperText}>Tell your story (max 1000 characters)</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className={styles.textarea}
              required
              maxLength={1000}
              rows={6}
              placeholder="Describe your project, what makes it special, and how the funds will be used..."
            />
            <div className={styles.charCount}>
              {formData.description.length} / 1000 characters
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Category *
                <span className={styles.helperText}>Select your project type</span>
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className={styles.input}
                required
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{categoryLabels[cat]}</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Funding Goal (STX) *
                <span className={styles.helperText}>How much do you need?</span>
              </label>
              <input
                type="number"
                name="targetAmount"
                value={formData.targetAmount}
                onChange={handleInputChange}
                className={styles.input}
                required
                min="0.000001"
                step="0.000001"
                placeholder="e.g., 50000"
              />
            </div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Campaign Deadline *
              <span className={styles.helperText}>When should the campaign end? (minimum 7 days)</span>
            </label>
            <input
              type="date"
              name="deadline"
              value={formData.deadline}
              onChange={handleInputChange}
              className={styles.input}
              required
              min={minDeadlineString}
            />
          </div>

          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Media & Tags (Optional)</h2>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Media URLs
                <span className={styles.helperText}>Add images or video links for your campaign</span>
              </label>
              {formData.mediaUrls.map((url, index) => (
                <div key={index} className={styles.arrayInput}>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => handleMediaUrlChange(index, e.target.value)}
                    className={styles.input}
                    placeholder="https://example.com/image.jpg"
                  />
                  {formData.mediaUrls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMediaUrl(index)}
                      className={styles.removeButton}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addMediaUrl}
                className={styles.addButton}
              >
                + Add Media URL
              </button>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Tags
                <span className={styles.helperText}>Help people discover your project</span>
              </label>
              {formData.tags.map((tag, index) => (
                <div key={index} className={styles.arrayInput}>
                  <input
                    type="text"
                    value={tag}
                    onChange={(e) => handleTagChange(index, e.target.value)}
                    className={styles.input}
                    placeholder="e.g., indie, horror, drama"
                    maxLength={30}
                  />
                  {formData.tags.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTag(index)}
                      className={styles.removeButton}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addTag}
                className={styles.addButton}
              >
                + Add Tag
              </button>
            </div>
          </div>

          <div className={styles.formActions}>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting || !userData}
            >
              {isSubmitting ? 'Creating Campaign...' : '🚀 Create Campaign'}
            </button>
          </div>

          <div className={styles.infoBox}>
            <h3>💡 Tips for Success</h3>
            <ul>
              <li>Write a compelling description that explains your project and how funds will be used</li>
              <li>Add high-quality images or video links to showcase your vision</li>
              <li>Set a realistic funding goal based on your actual needs</li>
              <li>Choose a deadline that gives you enough time to promote (30-60 days recommended)</li>
              <li>Use relevant tags to help people discover your campaign</li>
            </ul>
          </div>
        </form>
        {/* TransactionModal removed for campaign creation */}
      </div>
    );
  };


export default CampaignCreate;

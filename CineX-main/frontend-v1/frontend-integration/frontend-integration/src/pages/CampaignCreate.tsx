import React, { useState } from 'react';
import { useAuth } from '../auth/StacksAuthContext';
import { createCrowdfundingService } from '../services/crowdfundingService';
import styles from '../styles/pages/PoolCreate.module.css'; // Reuse pool create styles

const CampaignCreate: React.FC = () => {
  const { userData, userSession } = useAuth();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetAmount: '',
    category: 'feature' as CategoryType,
    deadline: '',
    mediaUrls: [''],
    tags: [''],
  });
  
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userSession) {
      setError('Please connect your wallet first');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const crowdfundingService = createCrowdfundingService(userSession);
      
      // Convert deadline to timestamp
      const deadlineTimestamp = new Date(formData.deadline).getTime();
      
      // Filter out empty strings
      const mediaUrls = formData.mediaUrls.filter(url => url.trim() !== '');
      const tags = formData.tags.filter(tag => tag.trim() !== '');

      const result = await crowdfundingService.createCampaign({
        title: formData.title,
        description: formData.description,
        targetAmount: formData.targetAmount,
        category: formData.category as any, // Allow any category type
        deadline: deadlineTimestamp,
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
        tags: tags.length > 0 ? tags : undefined,
      });

      if (result.success) {
        setSuccess(true);
        console.log('Campaign created successfully:', result.data);
        
        // Reset form after 2 seconds
        setTimeout(() => {
          setFormData({
            title: '',
            description: '',
            targetAmount: '',
            category: 'feature' as CategoryType,
            deadline: '',
            mediaUrls: [''],
            tags: [''],
          });
          setSuccess(false);
        }, 3000);
      } else {
        setError(result.error || 'Failed to create campaign');
      }
    } catch (err) {
      console.error('Error creating campaign:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = [
    'short-film', 'feature', 'documentary', 'music-video', 
    'web-series', 'animation', 'podcast', 'other'
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
    'other': 'Other'
  };

  // Calculate minimum deadline (7 days from now)
  const minDeadline = new Date();
  minDeadline.setDate(minDeadline.getDate() + 7);
  const minDeadlineString = minDeadline.toISOString().split('T')[0];

  return (
    <div className={styles.poolCreate}>
      <header className={styles.campaignHero}>
        <h1 className={styles.campaignTitle}>🎬 Create Your Campaign</h1>
        <p className={styles.campaignSubtitle}>
          Launch a crowdfunding campaign for your creative project. 
          Set your funding goal and share your vision with the community.
        </p>
      </header>

      {!userData ? (
        <div className={styles.connectWallet}>
          <p className={styles.connectMessage}>
            Please connect your Stacks wallet to create a campaign.
          </p>
        </div>
      ) : (
        <form className={styles.form} onSubmit={handleSubmit}>
          {error && (
            <div className={styles.errorMessage}>
              ⚠️ {error}
            </div>
          )}
          
          {success && (
            <div className={styles.successMessage}>
              ✅ Campaign created successfully! Check your wallet for transaction confirmation.
            </div>
          )}

          <div className={styles.formSection}>
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
                  min="100"
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
      )}
    </div>
  );
};

export default CampaignCreate;

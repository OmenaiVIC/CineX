import React, { useState } from 'react';
import { CreateCampaignParams } from '../../types';
import { CATEGORIES, DEFAULT_MILESTONES } from '../../constants/categories';

interface CampaignCreationFormProps {
  onSubmit: (params: CreateCampaignParams) => void;
  onCancel: () => void;
  isDemo?: boolean;
}

interface MilestoneDraft {
  title: string;
  description: string;
  amount: string;
}

const INITIAL_MILESTONES: MilestoneDraft[] = [
  { title: 'Planning', description: 'Define scope, budget, and timeline.', amount: '' },
  { title: 'Development', description: 'Execute core creative work.', amount: '' },
  { title: 'Delivery', description: 'Finalize and release to backers.', amount: '' },
];

export function CampaignCreationForm({ onSubmit, onCancel, isDemo }: CampaignCreationFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('film');
  const [customCategory, setCustomCategory] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [milestones, setMilestones] = useState<MilestoneDraft[]>(INITIAL_MILESTONES);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'Give your project a name';
    if (!description.trim()) errs.description = 'Tell supporters what you are creating';
    if (!targetAmount || Number(targetAmount) <= 0) errs.targetAmount = 'Set a funding goal';
    if (!deadline) errs.deadline = 'Pick a deadline';
    if (milestones.filter((m) => m.title.trim()).length < 1) {
      errs.milestones = 'Add at least one milestone';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      targetAmount,
      deadline: new Date(deadline).getTime(),
      category: category as any,
      tags: [],
    });
  };

  const updateMilestone = (idx: number, field: keyof MilestoneDraft, value: string) => {
    setMilestones((prev) => prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m)));
  };

  const addMilestone = () => {
    setMilestones((prev) => [...prev, { title: '', description: '', amount: '' }]);
  };

  const removeMilestone = (idx: number) => {
    setMilestones((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <h2 style={styles.heading}>Create your campaign</h2>
      <p style={styles.subtext}>
        Describe your project and set milestones. Funds are held safely until you deliver.
      </p>

      {/* Title */}
      <label style={styles.label}>Project name</label>
      <input
        style={{ ...styles.input, ...(errors.title ? styles.inputError : {}) }}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="My amazing project"
        maxLength={100}
      />
      {errors.title && <span style={styles.errorText}>{errors.title}</span>}

      {/* Description */}
      <label style={styles.label}>What are you creating?</label>
      <textarea
        style={{ ...styles.textarea, ...(errors.description ? styles.inputError : {}) }}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Describe your vision, why it matters, and what supporters will help bring to life..."
        rows={4}
        maxLength={2000}
      />
      {errors.description && <span style={styles.errorText}>{errors.description}</span>}

      {/* Category */}
      <label style={styles.label}>Category</label>
      <select
        style={styles.select}
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        {CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </select>
      {category === 'other' && (
        <input
          style={styles.input}
          value={customCategory}
          onChange={(e) => setCustomCategory(e.target.value)}
          placeholder="Describe your category..."
          maxLength={60}
        />
      )}

      {/* Target Amount */}
      <label style={styles.label}>Funding goal (digital dollars)</label>
      <input
        style={{ ...styles.input, ...(errors.targetAmount ? styles.inputError : {}) }}
        type="number"
        value={targetAmount}
        onChange={(e) => setTargetAmount(e.target.value)}
        placeholder="10000"
        min="1"
      />
      {errors.targetAmount && <span style={styles.errorText}>{errors.targetAmount}</span>}

      {/* Deadline */}
      <label style={styles.label}>Campaign deadline</label>
      <input
        style={{ ...styles.input, ...(errors.deadline ? styles.inputError : {}) }}
        type="date"
        value={deadline}
        onChange={(e) => setDeadline(e.target.value)}
      />
      {errors.deadline && <span style={styles.errorText}>{errors.deadline}</span>}

      {/* Milestones */}
      <div style={styles.sectionHeader}>
        <label style={styles.label}>Milestones</label>
        <span style={styles.subtext}>What will you deliver and when?</span>
      </div>
      {errors.milestones && <span style={styles.errorText}>{errors.milestones}</span>}
      {milestones.map((m, idx) => (
        <div key={idx} style={styles.milestoneCard}>
          <div style={styles.milestoneHeader}>
            <span style={styles.milestoneNumber}>{idx + 1}</span>
            {milestones.length > 1 && (
              <button
                type="button"
                style={styles.removeBtn}
                onClick={() => removeMilestone(idx)}
              >
                ✕
              </button>
            )}
          </div>
          <input
            style={styles.input}
            value={m.title}
            onChange={(e) => updateMilestone(idx, 'title', e.target.value)}
            placeholder="Milestone name (e.g. Principal Photography)"
          />
          <input
            style={styles.input}
            value={m.description}
            onChange={(e) => updateMilestone(idx, 'description', e.target.value)}
            placeholder="Brief description"
          />
          <input
            style={styles.input}
            type="number"
            value={m.amount}
            onChange={(e) => updateMilestone(idx, 'amount', e.target.value)}
            placeholder="Amount to release"
            min="1"
          />
        </div>
      ))}
      <button type="button" style={styles.addMilestoneBtn} onClick={addMilestone}>
        + Add another milestone
      </button>

      {isDemo && (
        <div style={styles.demoNote}>
          Demo mode: campaign will be saved locally. No real funds are involved.
        </div>
      )}

      <div style={styles.btnRow}>
        <button type="button" style={styles.secondaryBtn} onClick={onCancel}>Cancel</button>
        <button type="submit" style={styles.primaryBtn}>Create Campaign</button>
      </div>
    </form>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    maxWidth: 520,
    margin: '0 auto',
    padding: 24,
    background: '#1a1a2e',
    borderRadius: 16,
  },
  heading: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 700,
    margin: 0,
  },
  subtext: {
    color: '#a0a0b8',
    fontSize: 14,
    margin: 0,
  },
  label: {
    color: '#d0d0e0',
    fontSize: 13,
    fontWeight: 600,
    marginTop: 4,
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    background: '#16162a',
    border: '1px solid #2a2a3e',
    borderRadius: 8,
    color: '#ffffff',
    fontSize: 14,
    boxSizing: 'border-box',
  },
  inputError: {
    borderColor: '#e94560',
  },
  textarea: {
    width: '100%',
    padding: '10px 14px',
    background: '#16162a',
    border: '1px solid #2a2a3e',
    borderRadius: 8,
    color: '#ffffff',
    fontSize: 14,
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '10px 14px',
    background: '#16162a',
    border: '1px solid #2a2a3e',
    borderRadius: 8,
    color: '#ffffff',
    fontSize: 14,
    boxSizing: 'border-box',
  },
  errorText: {
    color: '#e94560',
    fontSize: 12,
  },
  sectionHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    marginTop: 8,
  },
  milestoneCard: {
    background: '#16162a',
    border: '1px solid #2a2a3e',
    borderRadius: 10,
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  milestoneHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  milestoneNumber: {
    color: '#6c63ff',
    fontSize: 14,
    fontWeight: 700,
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    color: '#e94560',
    fontSize: 16,
    cursor: 'pointer',
    padding: '2px 6px',
  },
  addMilestoneBtn: {
    background: 'none',
    border: '1px dashed #2a2a3e',
    borderRadius: 8,
    padding: '10px 14px',
    color: '#6c63ff',
    fontSize: 14,
    cursor: 'pointer',
    fontWeight: 600,
  },
  demoNote: {
    background: 'rgba(108,99,255,0.08)',
    border: '1px solid rgba(108,99,255,0.2)',
    borderRadius: 8,
    padding: '10px 14px',
    color: '#a0a0b8',
    fontSize: 13,
  },
  btnRow: {
    display: 'flex',
    gap: 12,
    marginTop: 8,
  },
  primaryBtn: {
    flex: 1,
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #6c63ff, #e94560)',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 700,
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
  },
  secondaryBtn: {
    flex: 1,
    padding: '12px 24px',
    background: 'transparent',
    color: '#a0a0b8',
    fontSize: 15,
    fontWeight: 600,
    border: '1px solid #2a2a3e',
    borderRadius: 10,
    cursor: 'pointer',
  },
};

export default CampaignCreationForm;

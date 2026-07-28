import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CampaignCreationForm } from './CampaignCreationForm';
import React from 'react';

describe('CampaignCreationForm', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the form with heading and all fields', () => {
    render(<CampaignCreationForm {...defaultProps} />);
    expect(screen.getByText('Create your campaign')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('My amazing project')).toBeInTheDocument();
    expect(screen.getByText('What are you creating?')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument(); // category select
    expect(screen.getByPlaceholderText('10000')).toBeInTheDocument();
  });

  it('shows 3 initial milestones with correct placeholders', () => {
    render(<CampaignCreationForm {...defaultProps} />);
    const nameInputs = screen.getAllByPlaceholderText('Milestone name (e.g. Principal Photography)');
    const descInputs = screen.getAllByPlaceholderText('Brief description');
    const amountInputs = screen.getAllByPlaceholderText('Amount to release');
    expect(nameInputs).toHaveLength(3);
    expect(descInputs).toHaveLength(3);
    expect(amountInputs).toHaveLength(3);
  });

  it('allows adding a new milestone', () => {
    render(<CampaignCreationForm {...defaultProps} />);
    const addBtn = screen.getByText('+ Add another milestone');
    fireEvent.click(addBtn);
    const nameInputs = screen.getAllByPlaceholderText('Milestone name (e.g. Principal Photography)');
    expect(nameInputs).toHaveLength(4);
  });

  it('allows removing a milestone', () => {
    render(<CampaignCreationForm {...defaultProps} />);
    const removeButtons = screen.getAllByText('✕');
    expect(removeButtons).toHaveLength(3);
    fireEvent.click(removeButtons[0]);
    const nameInputs = screen.getAllByPlaceholderText('Milestone name (e.g. Principal Photography)');
    expect(nameInputs).toHaveLength(2);
  });

  it('can fill out the form and submit', () => {
    render(<CampaignCreationForm {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText('My amazing project'), {
      target: { value: 'My Short Film' },
    });
    fireEvent.change(screen.getByPlaceholderText('10000'), {
      target: { value: '5000' },
    });
    fireEvent.change(screen.getByText('What are you creating?').closest('div')?.querySelector('textarea')!, {
      target: { value: 'A compelling story' },
    });
    // Fill deadline field (required for validation — no htmlFor/id, query by type)
    const deadlineInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(deadlineInput, { target: { value: '2026-12-31' } });
    fireEvent.click(screen.getByText('Create Campaign'));
    expect(defaultProps.onSubmit).toHaveBeenCalled();
  });

  it('calls onCancel when Cancel is clicked', () => {
    render(<CampaignCreationForm {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('shows demo note when isDemo is true', () => {
    render(<CampaignCreationForm {...defaultProps} isDemo />);
    expect(screen.getByText(/Demo mode: campaign will be saved locally/)).toBeInTheDocument();
  });

  it('does not show demo note when isDemo is false', () => {
    render(<CampaignCreationForm {...defaultProps} />);
    expect(screen.queryByText(/Demo mode/)).not.toBeInTheDocument();
  });

  it('has category select with 7 options', () => {
    render(<CampaignCreationForm {...defaultProps} />);
    const select = screen.getByRole('combobox');
    const options = within(select).getAllByRole('option');
    expect(options).toHaveLength(7);
  });
});
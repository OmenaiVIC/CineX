import React, { useState } from 'react';

export default function PrivatePoolForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetAmount: '',
    fundingPeriod: 30,
    minInvestment: '',
    maxParticipants: '',
    coProducerRoles: [],
    selectedInvestors: [],
    logline: '',
  });

  const [errors, setErrors] = useState({});
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitedInvestors, setInvitedInvestors] = useState([]);

  const availableRoles = [
    'Executive Producer',
    'Co-Producer',
    'Associate Producer',
    'Production Manager',
  ];

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.targetAmount || Number(formData.targetAmount) <= 0) newErrors.targetAmount = 'Valid target amount is required';
    if (!formData.minInvestment || Number(formData.minInvestment) <= 0) newErrors.minInvestment = 'Valid minimum investment is required';
    if (!formData.logline.trim()) newErrors.logline = 'Logline is required';
    if (invitedInvestors.length === 0) newErrors.investors = 'At least one investor must be invited';
    return newErrors;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleRoleToggle = (role) => {
    setFormData(prev => ({
      ...prev,
      coProducerRoles: prev.coProducerRoles.includes(role)
        ? prev.coProducerRoles.filter(r => r !== role)
        : [...prev.coProducerRoles, role]
    }));
  };

  const addInvestor = () => {
    if (inviteEmail && !invitedInvestors.includes(inviteEmail)) {
      setInvitedInvestors([...invitedInvestors, inviteEmail]);
      setInviteEmail('');
      if (errors.investors) {
        setErrors(prev => ({ ...prev, investors: null }));
      }
    }
  };

  const removeInvestor = (email) => {
    setInvitedInvestors(invitedInvestors.filter(e => e !== email));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onSubmit({
      type: 'private-pool',
      ...formData,
      invitedInvestors,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Pool Title */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Pool Title *
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          placeholder="Enter pool name (e.g., 'Indie Film Co-Producer Pool')"
          className={`w-full px-4 py-3 bg-gray-900/30 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 ${
            errors.title ? 'border-red-500' : 'border-gray-700'
          }`}
        />
        {errors.title && <p className="text-red-400 text-sm mt-1">{errors.title}</p>}
      </div>

      {/* Logline */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Logline *
        </label>
        <input
          type="text"
          name="logline"
          value={formData.logline}
          onChange={handleInputChange}
          placeholder="One-line description of your film"
          maxLength="150"
          className={`w-full px-4 py-3 bg-gray-900/30 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 ${
            errors.logline ? 'border-red-500' : 'border-gray-700'
          }`}
        />
        {errors.logline && <p className="text-red-400 text-sm mt-1">{errors.logline}</p>}
        <p className="text-gray-400 text-xs mt-1">{formData.logline.length}/150</p>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Pool Description *
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          placeholder="Describe your film project, vision, and what you're looking for in co-producers..."
          rows="6"
          className={`w-full px-4 py-3 bg-gray-900/30 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none ${
            errors.description ? 'border-red-500' : 'border-gray-700'
          }`}
        />
        {errors.description && <p className="text-red-400 text-sm mt-1">{errors.description}</p>}
      </div>

      {/* Co-Producer Roles */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-4">
          Available Co-Producer Roles
        </label>
        <div className="grid md:grid-cols-2 gap-3">
          {availableRoles.map((role) => (
            <label key={role} className="flex items-center p-3 bg-gray-900/30 border border-gray-700 rounded-lg cursor-pointer hover:border-gray-600">
              <input
                type="checkbox"
                checked={formData.coProducerRoles.includes(role)}
                onChange={() => handleRoleToggle(role)}
                className="w-4 h-4 text-yellow-400 bg-gray-900 border-gray-600 rounded focus:ring-yellow-400"
              />
              <span className="ml-3 text-gray-300">{role}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Funding Details */}
      <div className="grid md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Target Amount (STX) *
          </label>
          <input
            type="number"
            name="targetAmount"
            value={formData.targetAmount}
            onChange={handleInputChange}
            placeholder="e.g., 500000"
            min="1"
            className={`w-full px-4 py-3 bg-gray-900/30 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 ${
              errors.targetAmount ? 'border-red-500' : 'border-gray-700'
            }`}
          />
          {errors.targetAmount && <p className="text-red-400 text-sm mt-1">{errors.targetAmount}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Minimum Investment (STX) *
          </label>
          <input
            type="number"
            name="minInvestment"
            value={formData.minInvestment}
            onChange={handleInputChange}
            placeholder="e.g., 50000"
            min="1"
            className={`w-full px-4 py-3 bg-gray-900/30 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 ${
              errors.minInvestment ? 'border-red-500' : 'border-gray-700'
            }`}
          />
          {errors.minInvestment && <p className="text-red-400 text-sm mt-1">{errors.minInvestment}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Max Participants
          </label>
          <input
            type="number"
            name="maxParticipants"
            value={formData.maxParticipants}
            onChange={handleInputChange}
            placeholder="e.g., 10"
            min="1"
            className="w-full px-4 py-3 bg-gray-900/30 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>
      </div>

      {/* Invite Investors */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Invite Co-Producers & Investors *
        </label>
        {errors.investors && <p className="text-red-400 text-sm mb-3">{errors.investors}</p>}
        
        <div className="flex gap-3 mb-4">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="Enter email address"
            className="flex-1 px-4 py-3 bg-gray-900/30 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
          <button
            type="button"
            onClick={addInvestor}
            className="px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-lg transition"
          >
            Add
          </button>
        </div>

        {invitedInvestors.length > 0 && (
          <div className="space-y-2">
            {invitedInvestors.map((email) => (
              <div key={email} className="flex items-center justify-between p-3 bg-gray-900/30 border border-gray-700 rounded-lg">
                <span className="text-gray-300">{email}</span>
                <button
                  type="button"
                  onClick={() => removeInvestor(email)}
                  className="text-red-400 hover:text-red-300"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex gap-4 pt-6 border-t border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-6 py-3 border border-gray-700 text-gray-300 font-semibold rounded-lg hover:bg-gray-900/50 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-bold rounded-lg transition"
        >
          Create Private Pool
        </button>
      </div>
    </form>
  );
}

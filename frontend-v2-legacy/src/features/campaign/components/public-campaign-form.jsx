import React, { useState } from 'react';

export default function PublicCampaignForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetAmount: '',
    fundingPeriod: 30,
    category: 'drama',
    filmGenre: '',
    posterImage: null,
    logline: '',
  });

  const [errors, setErrors] = useState({});
  const [posterPreview, setPosterPreview] = useState(null);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.targetAmount || Number(formData.targetAmount) <= 0) newErrors.targetAmount = 'Valid target amount is required';
    if (!formData.logline.trim()) newErrors.logline = 'Logline is required';
    return newErrors;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, posterImage: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setPosterPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onSubmit({ type: 'public', ...formData });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Film Title */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Film Title *
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          placeholder="Enter your film title"
          className={`w-full px-4 py-3 bg-gray-900/30 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 ${
            errors.title ? 'border-red-500' : 'border-gray-700'
          }`}
        />
        {errors.title && <p className="text-red-400 text-sm mt-1">{errors.title}</p>}
      </div>

      {/* Logline */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Logline (One-liner) *
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

      {/* Film Genre */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Film Genre
        </label>
        <input
          type="text"
          name="filmGenre"
          value={formData.filmGenre}
          onChange={handleInputChange}
          placeholder="e.g., Drama, Comedy, Documentary"
          className="w-full px-4 py-3 bg-gray-900/30 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Full Description *
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          placeholder="Tell investors about your film project..."
          rows="6"
          className={`w-full px-4 py-3 bg-gray-900/30 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none ${
            errors.description ? 'border-red-500' : 'border-gray-700'
          }`}
        />
        {errors.description && <p className="text-red-400 text-sm mt-1">{errors.description}</p>}
      </div>

      {/* Poster Image */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Poster Image
        </label>
        <div className="flex gap-6">
          <div className="flex-1">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full px-4 py-3 bg-gray-900/30 border border-gray-700 rounded-lg text-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <p className="text-gray-500 text-xs mt-2">Recommended: 500x750px</p>
          </div>
          {posterPreview && (
            <div className="w-32">
              <img src={posterPreview} alt="Preview" className="w-full rounded-lg border border-gray-700" />
            </div>
          )}
        </div>
      </div>

      {/* Target Amount */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Target Funding Amount (STX) *
          </label>
          <input
            type="number"
            name="targetAmount"
            value={formData.targetAmount}
            onChange={handleInputChange}
            placeholder="e.g., 100000"
            min="1"
            className={`w-full px-4 py-3 bg-gray-900/30 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 ${
              errors.targetAmount ? 'border-red-500' : 'border-gray-700'
            }`}
          />
          {errors.targetAmount && <p className="text-red-400 text-sm mt-1">{errors.targetAmount}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Funding Period (Days)
          </label>
          <input
            type="number"
            name="fundingPeriod"
            value={formData.fundingPeriod}
            onChange={handleInputChange}
            min="7"
            max="365"
            className="w-full px-4 py-3 bg-gray-900/30 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>
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
          Create Public Campaign
        </button>
      </div>
    </form>
  );
}

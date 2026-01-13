import React from 'react';

export default function CampaignTypeSelector({ selectedType, onSelectType }) {
  const campaignTypes = [
    {
      id: 'public',
      name: 'Public Campaign',
      description: 'Open to all investors. Raise funds from the general public with full transparency.',
      icon: '🌍',
      features: ['Open to all investors', 'Public visibility', 'Community funding', 'Transparent progress tracking']
    },
    {
      id: 'private-pool',
      name: 'Private Pool',
      description: 'Invite-only funding from selected investors and co-executive producers.',
      icon: '🔒',
      features: ['Select investors', 'Private visibility', 'Co-producer opportunities', 'Controlled access']
    },
  ];

  return (
    <div className="w-full">
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-white mb-2">Choose Campaign Type</h3>
        <p className="text-gray-400">Select how you want to fund your film project</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {campaignTypes.map((type) => (
          <div
            key={type.id}
            onClick={() => onSelectType(type.id)}
            className={`relative p-8 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
              selectedType === type.id
                ? 'border-yellow-400 bg-yellow-400/10'
                : 'border-gray-700 bg-gray-900/30 hover:border-gray-600'
            }`}
          >
            {/* Selection indicator */}
            {selectedType === type.id && (
              <div className="absolute top-4 right-4">
                <svg className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}

            {/* Icon and title */}
            <div className="mb-4">
              <span className="text-4xl mb-3 block">{type.icon}</span>
              <h4 className="text-xl font-bold text-white">{type.name}</h4>
            </div>

            {/* Description */}
            <p className="text-gray-300 mb-6 text-sm leading-relaxed">{type.description}</p>

            {/* Features */}
            <div className="space-y-2">
              {type.features.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2 text-gray-400 text-sm">
                  <svg className="w-4 h-4 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

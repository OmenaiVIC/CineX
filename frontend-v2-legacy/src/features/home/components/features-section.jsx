import React from 'react';
import featuresData from '../data/features.json';
import { Link } from 'react-router-dom';

function FeatureBullet({ title, description }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-1 flex-none w-3 h-3 rounded-full bg-yellow-400 shadow-lg" aria-hidden="true" />
      <div>
        <h4 className="text-gray-900 font-semibold tracking-tight text-sm">{title}</h4>
        <p className="text-gray-600 text-sm mt-1">{description}</p>
      </div>
    </li>
  );
}

export default function FeaturesSection() {
  const sections = featuresData.sections || [];

  return (
    <section className="py-20 bg-white">
      <div className="container px-4 mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">Why Choose CineX?</h2>
          <p className="text-xl text-gray-600">Empowering filmmakers and investors through decentralized blockchain technology</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {sections.map((sec) => (
            <div
              key={sec.key}
              className="relative bg-gradient-to-br from-yellow-50 to-white p-8 rounded-2xl border border-yellow-200 shadow-md hover:shadow-xl hover:border-yellow-400 transition-all duration-300 group md:aspect-square flex flex-col justify-between overflow-hidden"
            >
              {/* Accent decoration */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400 opacity-5 rounded-full -mr-16 -mt-16 group-hover:opacity-10 transition-opacity duration-300"></div>
              
              <div className="relative z-10">
                <h3 className="text-2xl font-bold text-yellow-600 mb-6">{sec.title}</h3>
                <ul className="space-y-4 mb-8">
                  {sec.items.map((it, i) => (
                    <FeatureBullet key={i} title={it.title} description={it.description} />
                  ))}
                </ul>
              </div>
              <div className="relative z-10">
                <Link
                  to={sec.cta?.href || '#'}
                  className="inline-block px-6 py-3 rounded-full bg-yellow-400 text-black hover:bg-yellow-500 hover:shadow-lg shadow-md transition-all duration-200 font-bold text-sm tracking-tight"
                >
                  {sec.cta?.label}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

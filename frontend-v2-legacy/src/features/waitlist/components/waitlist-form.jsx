import { useState } from 'react';

function WaitlistForm() {
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    userType: 'investor', // 'investor' or 'filmmaker'
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In production, you would send this to your backend
      console.log('Waitlist submission:', formData);
      
      setSubmitted(true);
      setFormData({ email: '', fullName: '', userType: 'investor' });
      
      // Reset success message after 5 seconds
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err) {
      setError('Failed to join waitlist. Please try again.');
      console.error('Submission error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="pt-20 lg:pt-24 pb-24">
      <div className="container px-4 mx-auto">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-16 text-center">
            <span className="inline-block mb-4 text-sm text-yellow-400 font-medium tracking-tighter">
              Early Access
            </span>
            <h1 className="font-heading mb-8 text-7xl lg:text-8xl text-white tracking-tighter">
              Join the Waitlist
            </h1>
            <p className="text-gray-300 text-lg">
              Be the first to access CineX when we launch. Get exclusive updates and early-bird benefits.
            </p>
          </div>

          {/* Google Form Button */}
          <div className="mt-12 text-center">
            <p className="text-gray-400 mb-4">Join Waitlist Here</p>
            <a
              href="https://forms.gle/VPsAYm3PUmyGTnGq7"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-semibold rounded-lg transition duration-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open Google Form
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export default WaitlistForm;

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@contexts/StacksAuthContext';

export default function DashboardRouter() {
  const { isAuthenticated, isLoading, userType } = useAuth();

  if (isLoading) return <div className="p-12 text-center">Loading...</div>;

  if (!isAuthenticated) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Please connect your wallet</h2>
        <p className="text-gray-600">You need to sign in to access your dashboard.</p>
      </div>
    );
  }

  // Simple router-style links to role-specific dashboards
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Your Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-xl">
        <Link to="/dashboard/public" className="p-6 bg-white rounded-lg shadow hover:shadow-md border">Public Dashboard</Link>
        <Link to="/dashboard/filmmaker" className="p-6 bg-white rounded-lg shadow hover:shadow-md border">Filmmaker Dashboard</Link>
        <Link to="/dashboard/endorser" className="p-6 bg-white rounded-lg shadow hover:shadow-md border">Endorser Dashboard</Link>
      </div>
    </div>
  );
}

import CoEPPools from './pages/CoEPPools';
import EndorsementSystem from './pages/EndorsementSystem';
import AdminControls from './pages/AdminControls';
// import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import Home from './pages/Home';
import Waitlist from './pages/Waitlist';
import PoolDetail from './pages/PoolDetail';
import PoolCreate from './pages/PoolCreate';
import CampaignCreate from './pages/CampaignCreate';
import { TransactionDemo } from './lib/TransactionDemo';
import { EnhancedTransactionDemo } from './lib/EnhancedTransactionDemo';
import './App.css';

function App() {
  return (
    <div className="app-container">
      <Header />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/waitlist" element={<Waitlist />} />
          <Route path="/campaign-create" element={<CampaignCreate />} />
          <Route path="/pool-detail/:poolId" element={<PoolDetail />} />
          <Route path="/pool-create" element={<PoolCreate />} />
          <Route path="/coep-pools" element={<CoEPPools />} />
          {/* Developer testing routes - not shown in navigation */}
          <Route path="/dev/transaction-demo" element={<TransactionDemo />} />
          <Route path="/dev/modal-demo" element={<EnhancedTransactionDemo />} />
          <Route path="/endorsement" element={<EndorsementSystem />} />
          <Route path="/admin" element={<AdminControls />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;

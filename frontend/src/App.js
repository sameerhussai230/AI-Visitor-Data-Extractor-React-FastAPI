// frontend/src/App.js
import React, { useState } from 'react';
import './App.css'; // Main styles
import UploadTab from './UploadTab'; // Import the upload tab component
import VisualizeTab from './VisualizeTab'; // Import the visualize tab component

function App() {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' or 'visualize'

  const renderTabContent = () => {
    switch (activeTab) {
      case 'upload':
        return <UploadTab />;
      case 'visualize':
        return <VisualizeTab />;
      default:
        return <UploadTab />; // Default to upload tab
    }
  };

  return (
    <div className="App">
      {/* Header */}
      <header className="app-header">
        <h1 className="app-title">Visitor Data Management</h1>
        {/* Add any other header elements here if needed */}
      </header>

      {/* Tab Navigation */}
      <nav className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          Upload & Extract
        </button>
        <button
          className={`tab-button ${activeTab === 'visualize' ? 'active' : ''}`}
          onClick={() => setActiveTab('visualize')}
        >
          Visualize Data
        </button>
      </nav>

      {/* Tab Content Area */}
      <main className="tab-content">
        {renderTabContent()}
      </main>

      {/* Footer (Optional) */}
      {/* <footer className="app-footer"> Your Footer Content </footer> */}
    </div>
  );
}

export default App;
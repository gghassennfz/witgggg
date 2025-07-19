import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import '../styles/design-system.css';
import './Settings.css';

import AccountSettings from '../Components/settings/AccountSettings';
import NotificationSettings from '../Components/settings/NotificationSettings';
import PreferencesSettings from '../Components/settings/PreferencesSettings';
import DataSettings from '../Components/settings/DataSettings';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('account');

  const renderContent = () => {
    switch (activeTab) {
      case 'account':
        return <AccountSettings />;
      case 'notifications':
        return <NotificationSettings />;
      case 'preferences':
        return <PreferencesSettings />;
      case 'data':
        return <DataSettings />;
      default:
        return <AccountSettings />;
    }
  };

  const settingsTabs = [
    {
      id: 'account',
      label: 'Account',
      icon: '👤',
      description: 'Manage your profile and account settings'
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: '🔔',
      description: 'Configure notification preferences'
    },
    {
      id: 'preferences',
      label: 'Preferences',
      icon: '⚙️',
      description: 'Customize your app experience'
    },
    {
      id: 'data',
      label: 'Data & Privacy',
      icon: '🔒',
      description: 'Manage your data and privacy settings'
    }
  ];

  return (
    <div className="settings-page">
      <Helmet>
        <title>Settings - WitG</title>
      </Helmet>
      
      <div className="page-hero">
        <div className="hero-content">
          <h1 className="page-title">
            <span className="title-icon">⚙️</span>
            Settings
          </h1>
          <p className="page-subtitle">
            Customize your WitG experience and manage your account
          </p>
        </div>
      </div>
      
      <div className="settings-container">
        <aside className="settings-sidebar">
          <div className="sidebar-header">
            <h3 className="sidebar-title">Configuration</h3>
          </div>
          
          <nav className="settings-nav">
            {settingsTabs.map((tab) => (
              <button
                key={tab.id}
                className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <div className="nav-icon">{tab.icon}</div>
                <div className="nav-content">
                  <span className="nav-label">{tab.label}</span>
                  <span className="nav-description">{tab.description}</span>
                </div>
                <div className="nav-indicator"></div>
              </button>
            ))}
          </nav>
          
          <div className="sidebar-footer">
            <div className="version-info">
              <span className="version-label">Version</span>
              <span className="version-number">2.0.1</span>
            </div>
          </div>
        </aside>
        
        <main className="settings-content">
          <div className="content-header">
            <div className="content-title">
              <span className="content-icon">
                {settingsTabs.find(tab => tab.id === activeTab)?.icon}
              </span>
              <h2>{settingsTabs.find(tab => tab.id === activeTab)?.label}</h2>
            </div>
            <div className="content-description">
              {settingsTabs.find(tab => tab.id === activeTab)?.description}
            </div>
          </div>
          
          <div className="content-body">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Settings;
import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
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

  return (
    <div className="settings-page">
      <Helmet>
        <title>Settings - WitG</title>
      </Helmet>
      <div className="settings-container">
        <aside className="settings-sidebar">
          <h2>Settings</h2>
          <nav>
            <ul>
              <li
                className={activeTab === 'account' ? 'active' : ''}
                onClick={() => setActiveTab('account')}
              >
                Account
              </li>
              <li
                className={activeTab === 'notifications' ? 'active' : ''}
                onClick={() => setActiveTab('notifications')}
              >
                Notifications
              </li>
              <li
                className={activeTab === 'preferences' ? 'active' : ''}
                onClick={() => setActiveTab('preferences')}
              >
                Preferences
              </li>
              <li
                className={activeTab === 'data' ? 'active' : ''}
                onClick={() => setActiveTab('data')}
              >
                Data & Logs
              </li>
            </ul>
          </nav>
        </aside>
        <main className="settings-content">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Settings;
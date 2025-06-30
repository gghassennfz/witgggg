import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import './PreferencesSettings.css';

const PreferencesSettings = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div>
      <h3>App Preferences</h3>
      <div className="preference-item">
        <span>Dark Mode</span>
        <label className="switch">
          <input
            type="checkbox"
            onChange={toggleTheme}
            checked={theme === 'dark'}
          />
          <span className="slider round"></span>
        </label>
      </div>
      {/* Other preferences will be added here */}
    </div>
  );
};

export default PreferencesSettings;

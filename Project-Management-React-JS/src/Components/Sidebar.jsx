import React from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';
import LogOut from './LogOut';

const Sidebar = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="sidebar-logo">WitG</h1>
      </div>
      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          <i className="uil uil-estate"></i>
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/myworkspace" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          <i className="uil uil-folder"></i>
          <span>My Workspace</span>
        </NavLink>
        <NavLink to="/groups" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          <i className="uil uil-users-alt"></i>
          <span>My Groups</span>
        </NavLink>
        <NavLink to="/mates" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          <i className="uil uil-user-plus"></i>
          <span>Mates</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          <i className="uil uil-setting"></i>
          <span>Settings</span>
        </NavLink>
      </nav>
      <div className="sidebar-footer">
        <LogOut />
      </div>
    </aside>
  );
};

export default Sidebar;

import { NavLink } from "react-router-dom"
import "../styles/design-system.css"
import "./Sidebar.css"
import LogOut from "./LogOut"

const Sidebar = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="brand-icon">🚀</div>
          <h1 className="sidebar-logo">WitG</h1>
        </div>
        <div className="sidebar-version">v2.0</div>
      </div>
      
      <nav className="sidebar-nav">
        <div className="nav-section">
          <div className="nav-section-title">Main</div>
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
            <div className="nav-icon">
              <i className="uil uil-estate"></i>
            </div>
            <span className="nav-text">Dashboard</span>
            <div className="nav-indicator"></div>
          </NavLink>
          
          <NavLink to="/myworkspace" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
            <div className="nav-icon">
              <i className="uil uil-folder"></i>
            </div>
            <span className="nav-text">My Workspace</span>
            <div className="nav-indicator"></div>
          </NavLink>
        </div>
        
        <div className="nav-section">
          <div className="nav-section-title">Collaboration</div>
          <NavLink to="/groups" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
            <div className="nav-icon">
              <i className="uil uil-users-alt"></i>
            </div>
            <span className="nav-text">My Groups</span>
            <div className="nav-badge">3</div>
            <div className="nav-indicator"></div>
          </NavLink>
          
          <NavLink to="/mates" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
            <div className="nav-icon">
              <i className="uil uil-user-plus"></i>
            </div>
            <span className="nav-text">Mates</span>
            <div className="nav-indicator"></div>
          </NavLink>
        </div>
        
        <div className="nav-section">
          <div className="nav-section-title">Account</div>
          <NavLink to="/settings" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
            <div className="nav-icon">
              <i className="uil uil-setting"></i>
            </div>
            <span className="nav-text">Settings</span>
            <div className="nav-indicator"></div>
          </NavLink>
        </div>
      </nav>
      
      <div className="sidebar-footer">
        <div className="sidebar-stats">
          <div className="stat-item">
            <span className="stat-label">Projects</span>
            <span className="stat-value">12</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Tasks</span>
            <span className="stat-value">48</span>
          </div>
        </div>
        <LogOut />
      </div>
    </aside>
  )
}

export default Sidebar

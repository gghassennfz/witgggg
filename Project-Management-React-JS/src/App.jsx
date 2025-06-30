import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "./context/ThemeContext";
import { ProtectedRoute, LoginRedirect } from "./Utils/ProtectedRoute";
import Login from "./Pages/Login";
import Signup from "./Pages/Signup";

import MainLayout from "./Components/MainLayout";
import Dashboard from "./Pages/Dashboard";
import Settings from "./Pages/Settings";
import Groups from "./Pages/Groups";
import Group from "./Pages/Group";
import Mates from "./Pages/Mates";
import CreateGroup from "./Pages/CreateGroup";
import PersonalWorkspace from "./Pages/PersonalWorkspace";

function App() {
  return (
    <HelmetProvider>
      <ThemeProvider>
        <Router>
          <Routes>
            {/* Protected Routes - For Logged-in Users */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<MainLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="groups" element={<Groups />} />
                <Route path="group/create" element={<CreateGroup />} />
                <Route path="group/:groupId" element={<Group />} />
                <Route path="mates" element={<Mates />} />
                <Route path="settings" element={<Settings />} />
                <Route path="workspace" element={<PersonalWorkspace />} />
              </Route>
            </Route>

            {/* Public/Auth Routes - For Logged-out Users */}
            <Route element={<LoginRedirect />}>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
            </Route>

            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
          <ToastContainer />
        </Router>
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;
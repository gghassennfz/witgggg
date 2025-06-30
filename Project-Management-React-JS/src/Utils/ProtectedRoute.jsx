import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const AuthChecker = ({ protect, redirectPath }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Error fetching session:", error.message);
          setIsAuthenticated(false); // On error, assume not authenticated
          return;
        }
        
        setIsAuthenticated(!!session);
      } catch (e) {
        console.error("Unexpected error in checkSession:", e);
        setIsAuthenticated(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setIsAuthenticated(!!session);
      }
    );

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  if (isAuthenticated === null) {
    return <div>Loading...</div>; // Show loading indicator while checking auth
  }

  if (protect) {
    return isAuthenticated ? <Outlet /> : <Navigate to={redirectPath} replace />;
  } else {
    return isAuthenticated ? <Navigate to={redirectPath} replace /> : <Outlet />;
  }
};

export const ProtectedRoute = () => <AuthChecker protect={true} redirectPath="/login" />;
export const LoginRedirect = () => <AuthChecker protect={false} redirectPath="/dashboard" />;

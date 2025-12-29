import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const withAuth = (WrappedComponent) => {
  const AuthComponent = (props) => {
    const navigate = useNavigate();
    const { user, loading } = useAuth();

    useEffect(() => {
      // Only redirect if loading is complete AND user is null
      // This prevents premature redirects during authentication
      if (!loading && !user) {
        navigate("/auth");
      }
    }, [user, loading, navigate]);

    // Show loading state while authentication is being checked
    if (loading) {
      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          fontSize: '18px',
          color: '#666'
        }}>
          Loading...
        </div>
      );
    }

    // Only render component if user exists, otherwise return null (redirect will happen)
    return user ? <WrappedComponent {...props} /> : null;
  };

  return AuthComponent;
};

export default withAuth;

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const withAuth = (WrappedComponent) => {
  const AuthComponent = (props) => {
    const navigate = useNavigate();
    const { user, loading } = useAuth();

    useEffect(() => {
      if (!loading && !user) {
        navigate("/auth");
      }
    }, [user, loading, navigate]);

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

    return user ? <WrappedComponent {...props} /> : null;
  };

  return AuthComponent;
};

export default withAuth;

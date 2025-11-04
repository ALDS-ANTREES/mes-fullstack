import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useState, useEffect } from "react";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Home from "./pages/Home";
import checkAuthApi from "./apis/member/checkAuthApi";

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await checkAuthApi();
        setIsAuthenticated(response.isAuthenticated);
      } catch (error) {
        console.error("Error checking authentication status:", error);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={isAuthenticated ? <Home /> : <Navigate to="/sign-in" />}
        />
        <Route
          path="/sign-in"
          element={<SignIn onSignInSuccess={() => setIsAuthenticated(true)} />}
        />
        <Route path="/sign-up" element={<SignUp />} />
      </Routes>
    </Router>
  );
};

export default App;

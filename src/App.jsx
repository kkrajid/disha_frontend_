// App.js
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import ProfileSetup from "./components/ProfileSetup";
import Dashboard from "./components/Dashboard";
import Home from "./components/Home";
import PublicRoute from "./components/PublicRoute";
import ProtectedRoute from "./components/ProtectedRoute";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes - Only accessible when not authenticated */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Home />} />
        </Route>

        {/* Protected Routes - Only accessible when authenticated */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile-setup" element={<ProfileSetup />} />
        </Route>
        <Route path="*" element={"not found "} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
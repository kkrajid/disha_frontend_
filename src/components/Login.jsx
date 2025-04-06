import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { login } from "../api/authapi";
import logo from "../assets/logo.png";
import googleIcon from "../assets/google-icon.png";

const Login = () => {
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(""); // Error can now be a string or object
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(""); // Reset error state

    try {
      await login(phoneNumber, password);
      navigate("/profile-setup", { replace: true });
    } catch (err) {
      // Handle different error formats from the backend
      if (typeof err === "object" && err.error) {
        setError(err.error); // Generic error message
      } else if (err.non_field_errors) {
        setError(err.non_field_errors.join(" ")); // For DRF non-field errors (e.g., "Unable to log in with provided credentials.")
      } else if (err.phone_number || err.password) {
        // Combine field-specific errors
        const fieldErrors = [];
        if (err.phone_number) fieldErrors.push(`Phone Number: ${err.phone_number.join(" ")}`);
        if (err.password) fieldErrors.push(`Password: ${err.password.join(" ")}`);
        setError(fieldErrors.join(" | "));
      } else {
        setError("Invalid phone number or password"); // Fallback
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => navigate(-1);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white px-4">
      <div className="w-full max-w-[400px] p-4 relative">
        <button onClick={handleBack} className="absolute top-2 left-2 text-black rounded-full p-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <div className="flex flex-col items-center mt-8 mb-4">
          <img src={logo} alt="DISHA Logo" className="w-[100px] md:w-[120px]" />
        </div>

        <h1 className="text-2xl font-bold text-center mb-6">
          Welcome Back! Glad to see you Again!
        </h1>

        {error && (
          <div className="text-red-500 text-center mb-4 text-sm bg-red-100 p-2 rounded">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleLogin}>
          <div className="bg-gray-50 rounded-lg p-2">
            <input
              type="tel"
              placeholder="Phone Number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full bg-transparent border-b border-blue-200 py-2 focus:outline-none text-base placeholder:text-gray-400"
              required
            />
          </div>

          <div className="bg-gray-50 rounded-lg p-2 relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent border-b border-blue-200 py-2 focus:outline-none pr-10 text-base placeholder:text-gray-400"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-gray-500"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
              className="text-sm text-[#3AADE1] font-medium"
            >
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-[#3AADE1] text-white font-medium text-base disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="flex items-center my-4">
          <div className="flex-1 border-t border-gray-300"></div>
          <span className="px-3 text-sm text-gray-500">or Login with</span>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>

        <button className="w-full py-2 px-4 border border-gray-300 rounded-lg flex items-center justify-center space-x-2">
          <img src={googleIcon} alt="Google" className="w-5 h-5" />
          <span className="text-gray-700 text-base">Google</span>
        </button>

        <p className="text-center mt-6 text-sm text-gray-600">
          Don't have an account?{" "}
          <button onClick={() => navigate("/register")} className="text-[#3AADE1] font-medium">
            Register
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
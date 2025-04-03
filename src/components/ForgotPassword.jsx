import { useState } from "react";
import { useNavigate } from "react-router-dom";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Implement your forgot password logic here
    // For now, just displaying a message
    setMessage("If your account exists, you'll receive a password reset link");
    setLoading(false);
  };

  const handleBack = () => navigate("/login");

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white px-4">
      <div className="w-full max-w-[400px] p-4 relative">
        <button onClick={handleBack} className="absolute top-2 left-2 text-black rounded-full p-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <h1 className="text-2xl font-bold text-center mb-6 mt-10">Forgot Password</h1>

        {message && <div className="text-green-500 text-center mb-4 text-sm">{message}</div>}

        <form className="space-y-4" onSubmit={handleSubmit}>
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-[#3AADE1] text-white font-medium text-base disabled:opacity-50"
          >
            {loading ? "Sending..." : "Reset Password"}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-600">
          Remember your password?{" "}
          <button onClick={() => navigate("/login")} className="text-[#3AADE1] font-medium">
            Login
          </button>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
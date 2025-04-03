import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";

const Home = () => {
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate("/login");
  };

  const handleRegister = () => {
    navigate("/register");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white px-4 sm:px-6">
      <div className="w-full max-w-md px-4 py-6 flex flex-col items-center">
        <div className="mb-12 sm:mb-16 mt-4 sm:mt-0">
          <img 
            src={logo} 
            alt="DISHA Logo" 
            className="w-[120px] sm:w-[180px]" 
          />
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-4 sm:mb-6">
          Welcome to DISHA
        </h1>
        
        <p className="text-center text-gray-600 mb-8 sm:mb-12 text-base sm:text-lg">
          Your personal guide for exploring opportunities
        </p>

        <div className="w-full space-y-4 sm:space-y-6">
          <button
            onClick={handleLogin}
            className="w-full py-3 sm:py-4 rounded-full bg-[#3AADE1] text-white text-lg sm:text-xl font-medium transition-transform hover:scale-105"
          >
            Login
          </button>

          <button
            onClick={handleRegister}
            className="w-full py-3 sm:py-4 rounded-full border-2 border-[#3AADE1] text-[#3AADE1] bg-white text-lg sm:text-xl font-medium transition-transform hover:scale-105"
          >
            Register
          </button>
        </div>

        <div className="mt-12 sm:mt-16 text-center">
          <p className="text-sm sm:text-base text-gray-500">
            By continuing, you agree to our
          </p>
          <p className="text-sm sm:text-base text-gray-500">
            <a href="/terms" className="text-[#3AADE1]">Terms of Service</a> & <a href="/privacy" className="text-[#3AADE1]">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;


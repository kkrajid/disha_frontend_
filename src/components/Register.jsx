import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { register } from "../api/authapi";
import logo from "../assets/logo.png";
import googleIcon from "../assets/google-icon.png";

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    phone_number: "",
    email: "",
    password: "",
    confirmPassword: "",
    first_name: "",
    last_name: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState(""); // Can be a string or object
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(""); // Reset error state

    // Client-side password match check
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const { confirmPassword, ...registerData } = formData;
      await register(registerData);
      navigate("/login", { replace: true });
    } catch (err) {
      // Handle different error formats from the backend
      if (typeof err === "object" && err.error) {
        setError(err.error); // Generic error message
      } else if (err.non_field_errors) {
        setError(err.non_field_errors.join(" ")); // Non-field errors
      } else {
        // Combine field-specific errors
        const fieldErrors = [];
        if (err.phone_number) fieldErrors.push(`Phone Number: ${err.phone_number.join(" ")}`);
        if (err.email) fieldErrors.push(`Email: ${err.email.join(" ")}`);
        if (err.password) fieldErrors.push(`Password: ${err.password.join(" ")}`);
        if (err.first_name) fieldErrors.push(`First Name: ${err.first_name.join(" ")}`);
        if (err.last_name) fieldErrors.push(`Last Name: ${err.last_name.join(" ")}`);
        setError(fieldErrors.length > 0 ? fieldErrors.join(" | ") : "Registration failed");
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
          Hello! Register to get started
        </h1>

        {error && (
          <div className="text-red-500 text-center mb-4 text-sm bg-red-100 p-2 rounded">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleRegister}>
          {[
            { type: "tel", placeholder: "Phone Number", name: "phone_number" },
            { type: "email", placeholder: "Email", name: "email" },
            { type: "text", placeholder: "First Name", name: "first_name" },
            { type: "text", placeholder: "Last Name", name: "last_name" },
          ].map((field) => (
            <div key={field.name} className="bg-gray-50 rounded-lg p-2">
              <input
                type={field.type}
                placeholder={field.placeholder}
                value={formData[field.name]}
                onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                className="w-full bg-transparent border-b border-blue-200 py-2 focus:outline-none text-base placeholder:text-gray-400"
                required
              />
            </div>
          ))}

          {[
            { type: showPassword ? "text" : "password", placeholder: "Password", name: "password", show: showPassword, setShow: setShowPassword },
            { type: showConfirmPassword ? "text" : "password", placeholder: "Confirm Password", name: "confirmPassword", show: showConfirmPassword, setShow: setShowConfirmPassword },
          ].map((field) => (
            <div key={field.name} className="bg-gray-50 rounded-lg p-2 relative">
              <input
                type={field.type}
                placeholder={field.placeholder}
                value={formData[field.name]}
                onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                className="w-full bg-transparent border-b border-blue-200 py-2 focus:outline-none pr-10 text-base placeholder:text-gray-400"
                required
              />
              <button
                type="button"
                onClick={() => field.setShow(!field.show)}
                className="absolute right-3 top-3 text-gray-500"
              >
                {field.show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-[#3AADE1] text-white font-medium text-base disabled:opacity-50"
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        <div className="flex items-center my-4">
          <div className="flex-1 border-t border-gray-300"></div>
          <span className="px-3 text-sm text-gray-500">or Register with</span>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>

        <button className="w-full py-2 px-4 border border-gray-300 rounded-lg flex items-center justify-center space-x-2 mb-6">
          <img src={googleIcon} alt="Google" className="w-5 h-5" />
          <span className="text-gray-700 text-base">Google</span>
        </button>

        <p className="text-center text-sm text-gray-600">
          Already have an account?{" "}
          <button onClick={() => navigate("/login")} className="text-[#3AADE1] font-medium">
            Log in
          </button>
        </p>
      </div>
    </div>
  );
};

export default Register;
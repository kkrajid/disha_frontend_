import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import logo from "../assets/logo.png";
import * as pdfjs from "pdfjs-dist";
import mammoth from "mammoth";
import { updateProfile, getProfile, logout } from "../api/authapi";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const industries = [
  "Arts & Design",
  "Education",
  "Engineering",
  "Finance",
  "Healthcare",
  "Hospitality",
  "Marketing",
  "Technology",
];

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "YOUR_DEFAULT_API_KEY";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const ProfileSetup = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [qualification, setQualification] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [address, setAddress] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [selectedIndustries, setSelectedIndustries] = useState([]);
  const [skills, setSkills] = useState([]);
  const [customIndustry, setCustomIndustry] = useState("");
  const [newSkill, setNewSkill] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [parsingStatus, setParsingStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profileData = await getProfile();
        const { user, profile } = profileData;
        setName(`${user.first_name} ${user.last_name}`);
        setMobileNumber(user.phone_number);
        setQualification(profile.qualification || "");
        setDateOfBirth(profile.date_of_birth || "");
        setAddress(profile.address || "");
        setSkills(profile.skills || []);
        setSelectedIndustries(profile.industries || []);
      } catch (err) {
        setError(err.error || "Failed to load profile");
      }
    };
    fetchProfile();
  }, []);

  const handleIndustryToggle = (industry) => {
    setSelectedIndustries((prev) =>
      prev.includes(industry)
        ? prev.filter((item) => item !== industry)
        : [...prev, industry]
    );
  };

  const handleAddSkill = (skill) => {
    if (skill.trim() && !skills.includes(skill.trim())) {
      setSkills((prev) => [...prev, skill.trim()]);
    }
  };

  const extractTextFromResume = async (file) => {
    try {
      setIsUploading(true);
      setParsingStatus("Extracting text from resume...");

      if (file.type === "application/pdf") {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument(new Uint8Array(arrayBuffer));
        const pdf = await loadingTask.promise;
        let text = "";

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const items = textContent.items;
          text += items.map((item) => item.str || "").join(" ");
        }

        return text;
      } else if (
        file.type === "application/msword" ||
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
      }

      return await file.text();
    } catch (error) {
      console.error("Error extracting text:", error);
      return "";
    } finally {
      setIsUploading(false);
    }
  };

  const processResumeWithGemini = async (resumeText) => {
    setParsingStatus("Processing with AI...");

    try {
      const prompt = `
        Extract structured information from this resume text. Please format your response as JSON with the following fields:
        - name: The person's full name
        - qualification: Their highest educational qualification with relevant details
        - mobileNumber: Their phone number
        - skills: An array of their professional skills
        - industries: An array of industries they've worked in or are qualified for (limit to 3 most relevant)
        
        Resume text:
        ${resumeText}
        
        Return ONLY the JSON object with these fields and nothing else. For any field where information cannot be confidently extracted, use an empty string or empty array as appropriate.
      `;

      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      if (!response.ok) {
        throw new Error(`Error from Gemini API: ${response.status}`);
      }

      const data = await response.json();
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const jsonMatch =
        responseText.match(/```json\s*([\s\S]*?)\s*```/) ||
        responseText.match(/\{[\s\S]*\}/);
      
      let parsedData;
      if (jsonMatch && jsonMatch[1]) {
        parsedData = JSON.parse(jsonMatch[1]);
      } else {
        parsedData = JSON.parse(responseText);
      }

      return {
        name: parsedData.name || "",
        qualification: parsedData.qualification || "",
        mobileNumber: parsedData.mobileNumber || "",
        skills: Array.isArray(parsedData.skills) ? parsedData.skills : [],
        industries: Array.isArray(parsedData.industries) ? parsedData.industries : [],
      };
    } catch (error) {
      console.error("Error processing with Gemini:", error);
      return fallbackParseResumeText(resumeText);
    }
  };

  const fallbackParseResumeText = (text) => {
    setParsingStatus("Using traditional parsing as fallback...");
    
    const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
    const nameMatch = text.match(/([A-Z][a-z]+(?: [A-Z][a-z]+)+)/);
    const mobileMatch = text.match(
      /(?:[\+]?\d{1,3}[-\s]?)?\(?\d{3}\)?[-\s]?\d{3}[-\s]?\d{4}/
    );
    
    const educationKeywords = [
      "education",
      "qualification",
      "degree",
      "university",
      "college",
    ];
    let qualificationSection = "";

    for (let i = 0; i < lines.length; i++) {
      if (educationKeywords.some((keyword) => lines[i].toLowerCase().includes(keyword))) {
        qualificationSection = lines.slice(i, i + 5).join(" ");
        break;
      }
    }

    const skillsKeywords = ["skills", "technologies", "competencies"];
    let extractedSkills = [];

    for (let i = 0; i < lines.length; i++) {
      if (skillsKeywords.some((keyword) => lines[i].toLowerCase().includes(keyword))) {
        const skillsSection = lines.slice(i, i + 15).join(" ");
        extractedSkills = skillsSection.split(/[,•·\n]/)
          .map((s) => s.trim())
          .filter((s) => s.length > 2);
        break;
      }
    }

    const industryKeywords = {
      Technology: ["software", "developer", "programming"],
      Engineering: ["engineer", "mechanical", "electrical"],
      Finance: ["finance", "accounting", "bank"],
      Healthcare: ["health", "medical", "doctor"],
    };

    const detectedIndustries = [];
    for (const [industry, keywords] of Object.entries(industryKeywords)) {
      if (keywords.some((keyword) => text.toLowerCase().includes(keyword))) {
        detectedIndustries.push(industry);
      }
    }

    return {
      name: nameMatch?.[0] || "",
      qualification: qualificationSection,
      mobileNumber: mobileMatch?.[0] || "",
      skills: extractedSkills,
      industries: detectedIndustries.slice(0, 3),
    };
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const text = await extractTextFromResume(file);
      if (text) {
        const parsed = await processResumeWithGemini(text);
        setName(parsed.name || name);
        setQualification(parsed.qualification || qualification);
        setMobileNumber(parsed.mobileNumber || mobileNumber);
        setSkills(parsed.skills.length > 0 ? parsed.skills : skills);
        setSelectedIndustries(parsed.industries.length > 0 ? parsed.industries : selectedIndustries);
        setParsingStatus("Resume successfully processed!");
        setTimeout(() => setParsingStatus(""), 3000);
      }
    } catch (error) {
      console.error("Error processing resume:", error);
      setParsingStatus("Error processing resume. Please try again.");
      setTimeout(() => setParsingStatus(""), 5000);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name || !qualification || !dateOfBirth || !address || !mobileNumber) {
      setError("Please fill all required fields");
      return;
    }

    try {
      const profileData = {
        qualification,
        date_of_birth: dateOfBirth,
        address,
        skills,
        industries: selectedIndustries,
      };

      await updateProfile(profileData);
      navigate("/dashboard");
    } catch (err) {
      setError(err.error || "Failed to save profile");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 px-4 sm:px-6">
      <header className="fixed top-0 left-0 right-0 bg-white py-4 px-4 sm:px-6 flex justify-between items-center z-10 shadow-sm">
        <button onClick={() => navigate(-1)} className="flex items-center">
          <img src={logo} alt="DISHA Logo" className="h-8 sm:h-10 w-auto" />
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-800 hidden sm:block">
            {name || "User"}
          </span>
          <Link
            to="/profile-setup"
            className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center overflow-hidden shadow-sm"
          >
            <div className="w-full h-full flex items-center justify-center text-white font-bold">
              {name?.charAt(0) || "U"}
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-600 hover:text-gray-800 font-medium hidden sm:block"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="flex-1 pt-16 sm:pt-20 pb-16">
        <div className="w-full max-w-3xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden mb-6 h-48 sm:h-56 shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-800" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <div className="relative h-full flex flex-col justify-end p-6 text-white">
              <h2 className="text-xl sm:text-2xl font-bold mb-2">
                {name ? `Complete your profile, ${name.split(' ')[0]}` : "Complete your profile"}
              </h2>
              <p className="text-sm sm:text-base opacity-90">
                Help us personalize your experience by providing your details
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 rounded-xl p-4 text-red-600 text-center mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Upload Resume (Optional)
              </h2>
              <div className="space-y-4">
                <label className="block">
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg
                          className="w-8 h-8 mb-4 text-gray-500"
                          aria-hidden="true"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 20 16"
                        >
                          <path
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                          />
                        </svg>
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">
                          PDF, DOC, DOCX (MAX. 5MB)
                        </p>
                      </div>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        onChange={handleResumeUpload}
                        className="hidden"
                        disabled={isUploading}
                      />
                    </label>
                  </div>
                </label>

                {isUploading && (
                  <div className="flex items-center text-sm text-gray-600">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-500"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    {parsingStatus}
                  </div>
                )}

                {!isUploading && parsingStatus && (
                  <div className="text-sm text-green-600">{parsingStatus}</div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Personal Information
              </h2>
              <div className="space-y-4">
                <div className="relative">
                  <label className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-500">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-transparent border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    disabled
                  />
                </div>

                <div className="relative">
                  <label className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-500">
                    Highest Qualification
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. B.Tech in Computer Science"
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    className="w-full bg-transparent border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="relative">
                  <label className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-500">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full bg-transparent border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="relative">
                  <label className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-500">
                    Complete Address
                  </label>
                  <input
                    type="text"
                    placeholder="Street, City, State, Pincode"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-transparent border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="relative">
                  <label className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-500">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    className="w-full bg-transparent border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    disabled
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Industry Preferences
              </h2>
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedIndustries.map((industry) => (
                  <div
                    key={industry}
                    className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center gap-2 text-sm"
                  >
                    <span>{industry}</span>
                    <button
                      type="button"
                      onClick={() => handleIndustryToggle(industry)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {industries.map((industry) => (
                  <button
                    key={industry}
                    type="button"
                    onClick={() => handleIndustryToggle(industry)}
                    className={`p-3 rounded-xl text-sm font-medium ${
                      selectedIndustries.includes(industry)
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                    }`}
                  >
                    {industry}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <label className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-500">
                    Custom Industry
                  </label>
                  <input
                    type="text"
                    placeholder="Add an industry not listed"
                    value={customIndustry}
                    onChange={(e) => setCustomIndustry(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && customIndustry.trim()) {
                        e.preventDefault();
                        handleIndustryToggle(customIndustry.trim());
                        setCustomIndustry("");
                      }
                    }}
                    className="w-full bg-transparent border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (customIndustry.trim()) {
                      handleIndustryToggle(customIndustry.trim());
                      setCustomIndustry("");
                    }
                  }}
                  className="self-end py-3 px-4 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Skills
              </h2>
              <div className="flex flex-wrap gap-2 mb-4">
                {skills.map((skill, index) => (
                  <div
                    key={`${skill}-${index}`}
                    className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center gap-2 text-sm"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => setSkills(skills.filter((_, i) => i !== index))}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <label className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-500">
                    Add Skill
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. JavaScript, Photoshop, Digital Marketing"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newSkill.trim()) {
                        e.preventDefault();
                        handleAddSkill(newSkill.trim());
                        setNewSkill("");
                      }
                    }}
                    className="w-full bg-transparent border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (newSkill.trim()) {
                      handleAddSkill(newSkill.trim());
                      setNewSkill("");
                    }
                  }}
                  className="self-end py-3 px-4 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                type="submit"
                className="w-full max-w-md py-3.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium text-sm hover:shadow-md transition-all duration-200 active:scale-95"
              >
                Save Profile
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default ProfileSetup;
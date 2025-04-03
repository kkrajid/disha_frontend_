import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import * as pdfjs from "pdfjs-dist";
import mammoth from "mammoth";
import { updateProfile, getProfile } from "../api/authapi";
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

// Replace with your actual key
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

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <header className="fixed top-0 left-0 right-0 bg-white py-3 px-4 sm:px-6 flex justify-between items-center z-10 shadow-md">
        <div className="flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="bg-gray-700 text-white rounded-full p-2 sm:p-3 mr-3 sm:mr-4"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <img src={logo} alt="DISHA Logo" className="h-8 sm:h-10 w-auto" />
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-sm sm:text-base font-medium text-gray-800">{name || "User"}</span>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#4CA1E2] flex items-center justify-center text-white">
            {name.charAt(0) || "U"}
          </div>
        </div>
      </header>

      <main className="flex-1 pt-16 sm:pt-20 pb-6">
        <div className="w-full max-w-lg mx-auto">
          {error && <div className="text-red-500 text-center mb-4">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-lg border border-gray-100 mb-6">
              <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-[#3AADE1]">
                Upload Resume
              </h2>
              <label className="block">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleResumeUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#3AADE1] file:text-white hover:file:bg-[#2C8EB6]"
                  disabled={isUploading}
                />
              </label>
              {isUploading && (
                <div className="mt-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-[#3AADE1]" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {parsingStatus}
                  </div>
                </div>
              )}
              {!isUploading && parsingStatus && (
                <div className="mt-2 text-sm text-green-600">{parsingStatus}</div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-lg border border-gray-100 mb-6">
              <h2 className="text-xl sm:text-2xl font-semibold text-center mb-4 sm:mb-6 text-[#3AADE1]">
                Fill Up Your Profile
              </h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-gray-50 rounded-lg p-3 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#3AADE1]"
                  required
                  disabled
                />
                <input
                  type="text"
                  placeholder="Highest Qualification"
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                  className="w-full bg-gray-50 rounded-lg p-3 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#3AADE1]"
                  required
                />
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full bg-gray-50 rounded-lg p-3 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#3AADE1]"
                  required
                />
                <input
                  type="text"
                  placeholder="Complete Address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-gray-50 rounded-lg p-3 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#3AADE1]"
                  required
                />
                <input
                  type="tel"
                  placeholder="Mobile Number"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full bg-gray-50 rounded-lg p-3 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#3AADE1]"
                  required
                  disabled
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-lg border border-gray-100 mb-6">
              <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-[#3AADE1]">
                Industry Preferences
              </h2>
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedIndustries.map((industry) => (
                  <div key={industry} className="bg-[#3AADE1] text-white px-3 py-1 rounded-full flex items-center gap-2">
                    <span>{industry}</span>
                    <button type="button" onClick={() => handleIndustryToggle(industry)}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
                {industries.map((industry) => (
                  <button
                    key={industry}
                    type="button"
                    onClick={() => handleIndustryToggle(industry)}
                    className={`p-3 rounded-lg text-sm font-medium ${
                      selectedIndustries.includes(industry)
                        ? "bg-[#2C8EB6] text-white"
                        : "bg-[#3AADE1]/20 text-[#3AADE1] hover:bg-[#3AADE1]/30"
                    }`}
                  >
                    {industry}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add custom industry"
                  value={customIndustry}
                  onChange={(e) => setCustomIndustry(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && customIndustry.trim()) {
                      e.preventDefault();
                      handleIndustryToggle(customIndustry.trim());
                      setCustomIndustry("");
                    }
                  }}
                  className="flex-1 bg-gray-50 rounded-lg p-3 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#3AADE1]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customIndustry.trim()) {
                      handleIndustryToggle(customIndustry.trim());
                      setCustomIndustry("");
                    }
                  }}
                  className="bg-[#3AADE1] text-white px-4 py-2 rounded-lg"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-lg border border-gray-100 mb-6">
              <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-[#3AADE1]">
                Skills
              </h2>
              <div className="flex flex-wrap gap-2 mb-4">
                {skills.map((skill, index) => (
                  <div key={`${skill}-${index}`} className="bg-[#3AADE1] text-white px-3 py-1 rounded-full flex items-center gap-2">
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => setSkills(skills.filter((_, i) => i !== index))}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add skill"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newSkill.trim()) {
                      e.preventDefault();
                      handleAddSkill(newSkill.trim());
                      setNewSkill("");
                    }
                  }}
                  className="flex-1 bg-gray-50 rounded-lg p-3 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#3AADE1]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newSkill.trim()) {
                      handleAddSkill(newSkill.trim());
                      setNewSkill("");
                    }
                  }}
                  className="bg-[#3AADE1] text-white px-4 py-2 rounded-lg"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="flex justify-center pb-6">
              <button
                type="submit"
                className="w-full max-w-xs py-3 sm:py-4 rounded-lg bg-[#3AADE1] text-white text-lg sm:text-xl font-semibold"
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
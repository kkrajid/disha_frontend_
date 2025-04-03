import { useState, useEffect } from "react";
import { getProfile } from "../api/authapi";
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "YOUR_DEFAULT_API_KEY";



const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export const useDynamicContent = () => {
  const [userProfile, setUserProfile] = useState(null);
  const [dynamicData, setDynamicData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profileData = await getProfile();
        const { user, profile } = profileData;
        setUserProfile({
          name: `${user.first_name} ${user.last_name}`,
          qualification: profile.qualification || "",
          dateOfBirth: profile.date_of_birth || "",
          address: profile.address || "",
          mobileNumber: user.phone_number,
          skills: profile.skills || [],
          industries: profile.industries || [],
        });
      } catch (err) {
        setError(err.error || "Failed to load profile");
      }
    };
    fetchProfile();
  }, []);

  const generateContent = async (prompt) => {
    setIsLoading(true);
    setError(null);

    try {
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
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error("No content generated");
      }

      return text;
    } catch (err) {
      setError(err.message || "Failed to generate content");
      console.error("Error generating content:", err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const createPrompt = (tab) => {
    if (!userProfile) return "";

    const { name, qualification, skills, industries } = userProfile;
    const skillsStr = skills.join(", ");
    const industriesStr = industries.join(", ");

    switch (tab) {
      case "courses":
        return `Based on this profile:
        - Name: ${name}
        - Qualification: ${qualification}
        - Skills: ${skillsStr}
        - Industries: ${industriesStr}
        
        Generate 3 relevant courses that would be beneficial for career growth. 
        Return ONLY a JSON array with objects containing these fields: 
        title, duration, provider, fee (in INR), url (a real course website from platforms like Coursera, Udemy, or edX), buttonText (set as "Enroll Now").
        Use a conversion rate of 1 USD = 83 INR if needed.
        Don't include any explanations before or after the JSON.`;

      case "jobs":
        return `Based on this profile:
        - Name: ${name}
        - Qualification: ${qualification}
        - Skills: ${skillsStr}
        - Industries: ${industriesStr}
        
        Generate 3 relevant job opportunities that match this profile.
        Return ONLY a JSON array with objects containing these fields: 
        title, experience, provider, salary (in INR), location, url (a real job posting website like LinkedIn, Indeed, or Naukri), buttonText (set as "Apply Now").
        Use a conversion rate of 1 USD = 83 INR if needed.
        Don't include any explanations before or after the JSON.`;

      case "examHelper":
        return `Based on this profile:
        - Name: ${name}
        - Qualification: ${qualification}
        - Skills: ${skillsStr}
        - Industries: ${industriesStr}
        
        Generate 3 relevant exam preparation resources or certifications that would enhance this person's career.
        Return ONLY a JSON array with objects containing these fields: 
        title, year, university, pages, url (a real resource website like official certification sites or Khan Academy), buttonText (set as "Access Now").
        Don't include any explanations before or after the JSON.`;

      case "mockInterview":
        return `Based on this profile:
        - Name: ${name}
        - Qualification: ${qualification}
        - Skills: ${skillsStr}
        - Industries: ${industriesStr}
        
        Generate 3 mock interview scenarios relevant to the skills and industries.
        Return ONLY a JSON array with objects containing these fields: 
        title, difficulty, duration, topics, url (a real AI interview practice website like Interviewing.io, Pramp, or LeetCode), buttonText (set as "Start Practice").
        Don't include any explanations before or after the JSON.`;

      case "sampleQuestions":
        return `Based on this profile:
        - Name: ${name}
        - Qualification: ${qualification}
        - Skills: ${skillsStr}
        - Industries: ${industriesStr}
        
        Generate 3 sample interview questions with answers relevant to the skills and industries.
        Return ONLY a JSON array with objects containing these fields: 
        question, answer, category.
        Don't include any explanations before or after the JSON.`;

      case "trends":
        return `Based on this profile:
        - Industries: ${industriesStr}
        
        Generate 3 current industry trends that are relevant to these industries.
        Return ONLY a JSON array with objects containing a single field: 
        text (containing the trend description).
        Don't include any explanations before or after the JSON.`;

      case "salary":
        return `Based on this profile:
        - Skills: ${skillsStr}
        - Industries: ${industriesStr}
        
        Generate 3 salary comparisons for positions relevant to these skills and industries.
        Return ONLY a JSON array with objects containing these fields: 
        title, salary (in INR, including salary range).
        Use a conversion rate of 1 USD = 83 INR if needed.
        Don't include any explanations before or after the JSON.`;

      default:
        return "";
    }
  };

  const parseGeneratedContent = (content, tab) => {
    if (!content) return [];

    try {
      const jsonMatch =
        content.match(/```json\s*([\s\S]*?)\s*```/) ||
        content.match(/\[\s*\{[\s\S]*\}\s*\]/);

      if (!jsonMatch) {
        console.error("No JSON found in content:", content);
        return [];
      }

      const jsonContent = jsonMatch[0].startsWith("[") ? jsonMatch[0] : jsonMatch[1];
      const parsed = JSON.parse(jsonContent);

      return parsed;
    } catch (err) {
      console.error("Error parsing generated content:", err);
      return [];
    }
  };

  const loadTabData = async (tab) => {
    if (!userProfile || !tab || dynamicData[tab]?.length) return;

    if (tab === "progress") {
      const progressData = [
        { text: `Profile completed on ${new Date().toLocaleDateString()}` },
        { text: `Added ${userProfile.skills.length} skills to your profile` },
        { text: `Selected ${userProfile.industries.length} industries of interest` },
      ];
      setDynamicData((prev) => ({ ...prev, [tab]: progressData }));
      return;
    }

    const prompt = createPrompt(tab);
    if (!prompt) return;

    const generatedContent = await generateContent(prompt);
    const parsedData = parseGeneratedContent(generatedContent, tab);

    if (parsedData.length > 0) {
      setDynamicData((prev) => ({ ...prev, [tab]: parsedData }));
    }
  };

  return {
    userProfile,
    dynamicData,
    isLoading,
    error,
    loadTabData,
  };
};
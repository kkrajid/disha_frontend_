import { useState, useEffect, useCallback } from "react";
import { getProfile } from "../api/authapi";

// Configuration constants
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "YOUR_DEFAULT_API_KEY";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const CURRENCY_CONVERSION_RATE = 83; // 1 USD = 83 INR

export const useDynamicContent = () => {
  // State variables
  const [userProfile, setUserProfile] = useState(null);
  const [dynamicData, setDynamicData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState({});

  // Fetch user profile on component mount
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
          email: user.email,
          skills: profile.skills || [],
          industries: profile.industries || [],
          experience: profile.experience || [],
          education: profile.education || []
        });
      } catch (err) {
        setError(err.error || "Failed to load profile");
        console.error("Error fetching profile:", err);
      }
    };
    
    fetchProfile();
  }, []);

  // API call to generate content using Gemini
  const generateContent = useCallback(async (prompt) => {
    setIsLoading(true);
    setError(null);

    try {
      // Add retry logic
      const maxRetries = 2;
      let retries = 0;
      let response = null;
      
      while (retries <= maxRetries) {
        try {
          response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.2,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
              }
            }),
          });
          
          if (response.ok) break;
          
          // If rate limited (429) or server error (5xx), retry
          if (response.status === 429 || response.status >= 500) {
            retries++;
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
            continue;
          }
          
          // For other errors, don't retry
          throw new Error(`API request failed with status ${response.status}`);
        } catch (e) {
          if (retries >= maxRetries) throw e;
          retries++;
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
        }
      }

      if (!response || !response.ok) {
        throw new Error(`API request failed with status ${response?.status || 'unknown'}`);
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
  }, []);

  // Create prompt for different tabs
  const createPrompt = useCallback((tab) => {
    if (!userProfile) return "";

    const { name, qualification, skills, industries, experience, education } = userProfile;
    const skillsStr = skills.join(", ");
    const industriesStr = industries.join(", ");
    const experienceStr = experience ? (Array.isArray(experience) ? experience.join(", ") : experience) : "";
    const educationStr = education ? (Array.isArray(education) ? education.join(", ") : education) : "";

    // Common profile information used across all prompts
    const profileInfo = `
      - Name: ${name}
      - Qualification: ${qualification}
      - Skills: ${skillsStr}
      - Industries: ${industriesStr}
      ${experienceStr ? `- Experience: ${experienceStr}` : ''}
      ${educationStr ? `- Education: ${educationStr}` : ''}
    `;

    // Tab-specific prompts
    switch (tab) {
      case "courses":
        return `Based on this profile:
          ${profileInfo}
          
          Generate 6 relevant courses that would be beneficial for career growth. 
          Return ONLY a JSON array with objects containing these fields: 
          title, duration, provider, fee (in INR), url (a real course website from platforms like Coursera, Udemy, or edX), buttonText (set as "Enroll Now").
          Use a conversion rate of 1 USD = ${CURRENCY_CONVERSION_RATE} INR if needed.
          Don't include any explanations before or after the JSON.`;

      case "jobs":
        return `Based on this profile:
          ${profileInfo}
          
          Generate 6 relevant job opportunities that match this profile.
          Return ONLY a JSON array with objects containing these fields: 
          title, experience, provider, salary (in INR), location, url (a real job posting website like LinkedIn, Indeed, or Naukri), buttonText (set as "Apply Now").
          Use a conversion rate of 1 USD = ${CURRENCY_CONVERSION_RATE} INR if needed.
          Don't include any explanations before or after the JSON.`;

      case "examHelper":
        return `Based on this profile:
          ${profileInfo}
          
          Generate 4 relevant exam preparation resources or certifications that would enhance this person's career.
          Return ONLY a JSON array with objects containing these fields: 
          title, description, conductingBody, eligibility (include age limits, educational qualifications required), 
          applicationProcess (how to apply), examDate (or frequency if recurring), 
          fee (in INR), syllabus (key topics covered), url (official website), 
          buttonText (set as "Learn More").
          Use a conversion rate of 1 USD = ${CURRENCY_CONVERSION_RATE} INR if needed.
          Don't include any explanations before or after the JSON.`;

      case "mockInterview":
        return `Based on this profile:
          ${profileInfo}
          
          Generate 6 mock interview scenarios relevant to the skills and industries.
          Return ONLY a JSON array with objects containing these fields: 
          title, difficulty, duration, topics, url (a real AI interview practice website like Interviewing.io, Pramp, or LeetCode), buttonText (set as "Start Practice").
          Don't include any explanations before or after the JSON.`;

      case "sampleQuestions":
        // Reference exam data if available
        const examReferences = dynamicData.examHelper 
          ? `Focus on these exams: ${dynamicData.examHelper.map(e => e.title).join(", ")}.`
          : "";
          
        return `Based on this profile:
          ${profileInfo}
          ${examReferences}
          
          Generate 5 sample exam questions with answers that would help prepare for certification exams related to the user's skills and industries.
          Each question should follow a professional exam format with multiple choice options where applicable.
          Group questions by subject area (like Programming, Database, Networking, etc).
          
          Return ONLY a JSON array with objects containing these fields: 
          subject (the topic area), question, options (array of possible answers if multiple choice), 
          correctAnswer, explanation (brief explanation of why this is correct).
          
          The questions should test both conceptual knowledge and practical application.
          Include a mix of easy, medium and difficult questions.
          Don't include any explanations before or after the JSON.`;

      case "progress":
        return `Based on this profile:
          ${profileInfo}
          
          Generate 6 progress indicators showing the user's potential career journey.
          Return ONLY a JSON array with objects containing these fields: 
          milestone (a brief title), description (details about this career milestone),
          timeframe (estimated time to achieve this milestone).
          Don't include any explanations before or after the JSON.`;

      case "trends":
        return `Based on this profile:
          ${profileInfo}
          
          Generate 6 current industry trends that are relevant to these industries and skills.
          Return ONLY a JSON array with objects containing these fields: 
          title (trend name), description (brief explanation of the trend),
          impact (how this might affect the user's career prospects),
          action (what the user should do to capitalize on this trend).
          Don't include any explanations before or after the JSON.`;

      case "salary":
        return `Based on this profile:
          ${profileInfo}
          
          Generate 6 salary comparisons for positions relevant to these skills and industries.
          Return ONLY a JSON array with objects containing these fields: 
          title (job title), averageSalary (in INR, national average),
          entrySalary (in INR, for entry level), seniorSalary (in INR, for senior level),
          growthOutlook (brief description of salary growth potential).
          Use a conversion rate of 1 USD = ${CURRENCY_CONVERSION_RATE} INR if needed.
          Don't include any explanations before or after the JSON.`;

      case "studyMaterial":
        return `Based on this profile:
          ${profileInfo}
          
          Generate 6 recommended study materials that would help with exam preparation 
          and skill development relevant to the user's profile.
          Return ONLY a JSON array with objects containing these fields: 
          title, type (Book/Online Course/Video Series/Documentation), 
          author, description, difficulty (Beginner/Intermediate/Advanced), 
          url (for accessing the material), cost (in INR), timeToComplete (estimated hours).
          Use a conversion rate of 1 USD = ${CURRENCY_CONVERSION_RATE} INR if needed.
          Don't include any explanations before or after the JSON.`;

      default:
        return "";
    }
  }, [userProfile, dynamicData]);

  // Parse generated content into usable data
  const parseGeneratedContent = useCallback((content, tab) => {
    if (!content) return [];

    try {
      // First try to extract JSON from markdown code block
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      // If no code block, try to find raw JSON array
      const arrayMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (arrayMatch) {
        return JSON.parse(arrayMatch[0]);
      }

      // If neither works, try parsing the entire content as JSON
      try {
        return JSON.parse(content);
      } catch (e) {
        // Last resort: Try to sanitize the content by removing non-JSON characters
        const sanitized = content.replace(/^[^[]*/, '').replace(/[^\]]*$/, '');
        return JSON.parse(sanitized);
      }
    } catch (err) {
      console.error("Error parsing generated content:", err);
      setError("Failed to parse generated content. Please try again.");
      return [];
    }
  }, []);

  // Check if data needs to be refreshed (older than 24 hours)
  const needsRefresh = useCallback((tab) => {
    const lastUpdate = lastUpdated[tab];
    if (!lastUpdate) return true;
    
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    return new Date(lastUpdate) < twentyFourHoursAgo;
  }, [lastUpdated]);

  // Load data for a specific tab
  const loadTabData = useCallback(async (tab) => {
    if (!userProfile || !tab) return;

    // Return cached data if available and fresh
    if (dynamicData[tab]?.length && !needsRefresh(tab)) {
      return;
    }

    setIsLoading(true);

    try {
      // Handle progress tab separately with local data
      if (tab === "progress") {
        const progressData = [
          { 
            milestone: "Profile Completion", 
            description: `Profile completed on ${new Date().toLocaleDateString()}`,
            timeframe: "Immediate" 
          },
          { 
            milestone: "Skill Development", 
            description: `Added ${userProfile.skills.length} skills to your profile`,
            timeframe: "Ongoing" 
          },
          { 
            milestone: "Industry Focus", 
            description: `Selected ${userProfile.industries.length} industries of interest`,
            timeframe: "Current" 
          },
        ];
        
        setDynamicData(prev => ({ ...prev, [tab]: progressData }));
        setLastUpdated(prev => ({ ...prev, [tab]: new Date().toISOString() }));
        return;
      }

      const prompt = createPrompt(tab);
      if (!prompt) return;

      const generatedContent = await generateContent(prompt);
      if (!generatedContent) return;

      const parsedData = parseGeneratedContent(generatedContent, tab);
      if (parsedData && parsedData.length > 0) {
        setDynamicData(prev => ({ ...prev, [tab]: parsedData }));
        setLastUpdated(prev => ({ ...prev, [tab]: new Date().toISOString() }));
      } else {
        throw new Error("Failed to parse content or empty response received");
      }
    } catch (err) {
      setError(`Error loading ${tab} data: ${err.message}`);
      console.error(`Error loading ${tab} data:`, err);
    } finally {
      setIsLoading(false);
    }
  }, [userProfile, dynamicData, createPrompt, generateContent, parseGeneratedContent, needsRefresh]);

  // Force refresh data for a specific tab
  const refreshTabData = useCallback(async (tab) => {
    // Clear existing data for the tab
    setDynamicData(prev => ({ ...prev, [tab]: [] }));
    // Load fresh data
    await loadTabData(tab);
  }, [loadTabData]);

  // Utility function to calculate data freshness as a string
  const getDataFreshness = useCallback((tab) => {
    const lastUpdate = lastUpdated[tab];
    if (!lastUpdate) return "Never updated";
    
    const updateDate = new Date(lastUpdate);
    const now = new Date();
    const diffMs = now - updateDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);
    
    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHrs > 0) return `${diffHrs} hour${diffHrs > 1 ? 's' : ''} ago`;
    if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    return "Just now";
  }, [lastUpdated]);

  return {
    userProfile,
    dynamicData,
    isLoading,
    error,
    loadTabData,
    refreshTabData,
    getDataFreshness,
    lastUpdated
  };
};
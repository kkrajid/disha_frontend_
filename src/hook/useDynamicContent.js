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

  // Get current date dynamically
  const getCurrentDate = () => new Date(); // Today: April 06, 2025
  const currentDate = getCurrentDate();
  const CURRENT_YEAR = currentDate.getFullYear(); // 2025
  const CURRENT_MONTH = currentDate.getMonth(); // 3 (April, 0-based)
  const CURRENT_DAY = currentDate.getDate(); // 6

  // Fetch and filter user profile for today's data, then this month's
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profileData = await getProfile();
        const { user, profile } = profileData;

        // Helper function to filter by date (today first, then month)
        const filterByDate = (items, yearField) => {
          if (!Array.isArray(items)) return items || [];
          return items.filter(item => {
            const date = new Date(item[yearField] || item);
            const yearMatch = date.getFullYear() === CURRENT_YEAR;
            const monthMatch = date.getMonth() === CURRENT_MONTH;
            const dayMatch = date.getDate() === CURRENT_DAY;
            return yearMatch && (dayMatch || monthMatch); // Today or this month
          }).sort((a, b) => { // Prioritize today
            const aDate = new Date(a[yearField] || a);
            const bDate = new Date(b[yearField] || b);
            const aIsToday = aDate.getDate() === CURRENT_DAY;
            const bIsToday = bDate.getDate() === CURRENT_DAY;
            return (bIsToday ? 1 : 0) - (aIsToday ? 1 : 0); // Today first
          });
        };

        setUserProfile({
          name: `${user.first_name} ${user.last_name}`,
          qualification: profile.qualification || "",
          dateOfBirth: profile.date_of_birth || "",
          address: profile.address || "",
          mobileNumber: user.phone_number,
          email: user.email,
          skills: profile.skills || [],
          industries: profile.industries || [],
          experience: filterByDate(profile.experience || [], "start_date"), // Assuming start_date
          education: filterByDate(profile.education || [], "end_date") // Assuming end_date
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
      const maxRetries = 2;
      let retries = 0;
      let response = null;

      while (retries <= maxRetries) {
        try {
          response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.2,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
              },
            }),
          });

          if (response.ok) break;

          if (response.status === 429 || response.status >= 500) {
            retries++;
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
            continue;
          }

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

      if (!text) throw new Error("No content generated");

      return text;
    } catch (err) {
      setError(err.message || "Failed to generate content");
      console.error("Error generating content:", err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create prompt for different tabs, prioritizing today then this month
  const createPrompt = useCallback((tab) => {
    if (!userProfile) return "";

    const { name, qualification, skills, industries, experience, education } = userProfile;
    const skillsStr = skills.join(", ");
    const industriesStr = industries.join(", ");
    const experienceStr = experience ? (Array.isArray(experience) ? experience.join(", ") : experience) : "";
    const educationStr = education ? (Array.isArray(education) ? education.join(", ") : education) : "";

    const profileInfo = `
      - Name: ${name}
      - Qualification: ${qualification}
      - Skills: ${skillsStr}
      - Industries: ${industriesStr}
      ${experienceStr ? `- Experience: ${experienceStr}` : ''}
      ${educationStr ? `- Education: ${educationStr}` : ''}
    `;

    const todayStr = currentDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }); // "April 6, 2025"
    const monthStr = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" }); // "April 2025"
    const dateRestriction = `Prioritize data relevant to today (${todayStr}). If insufficient data is available, include data from this month (${monthStr}). Exclude anything outside this month.`;

    switch (tab) {
      case "courses":
        return `Based on this profile:
          ${profileInfo}
          ${dateRestriction}
          
          Generate 6 relevant courses available today or this month for career growth. 
          Return ONLY a JSON array with objects containing: title, duration, provider, fee (in INR), url (real course website like Coursera, Udemy, or edX), buttonText ("Enroll Now").
          Use a conversion rate of 1 USD = ${CURRENCY_CONVERSION_RATE} INR.`;

      case "jobs":
        return `Based on this profile:
          ${profileInfo}
          ${dateRestriction}
          
          Generate 6 relevant job opportunities posted or active today or this month.
          Return ONLY a JSON array with objects containing: title, experience, provider, salary (in INR), location, url (real job site like LinkedIn, Indeed, or Naukri), buttonText ("Apply Now").
          Use a conversion rate of 1 USD = ${CURRENCY_CONVERSION_RATE} INR.`;

      case "examHelper":
        return `Based on this profile:
          ${profileInfo}
          ${dateRestriction}
          
          Generate 4 relevant exam preparation resources or certifications scheduled for today or this month.
          Return ONLY a JSON array with objects containing: title, description, conductingBody, eligibility, applicationProcess, examDate (today or in ${monthStr}), fee (in INR), syllabus, url (official website), buttonText ("Learn More").
          Use a conversion rate of 1 USD = ${CURRENCY_CONVERSION_RATE} INR.`;

      case "mockInterview":
        return `Based on this profile:
          ${profileInfo}
          ${dateRestriction}
          
          Generate 6 mock interview scenarios relevant to today or this month’s skills and industries.
          Return ONLY a JSON array with objects containing: title, difficulty, duration, topics, url (real AI interview site like Interviewing.io, Pramp, or LeetCode), buttonText ("Start Practice").`;

      case "sampleQuestions":
        const examReferences = dynamicData.examHelper 
          ? `Focus on these exams: ${dynamicData.examHelper.map(e => e.title).join(", ")}.`
          : "";
          
        return `Based on this profile:
          ${profileInfo}
          ${examReferences}
          ${dateRestriction}
          
          Generate 5 sample exam questions with answers for certifications relevant to today or this month.
          Return ONLY a JSON array with objects containing: subject, question, options (if multiple choice), correctAnswer, explanation.
          Group by subject area (e.g., Programming, Database).`;

      case "progress":
        return `Based on this profile:
          ${profileInfo}
          ${dateRestriction}
          
          Generate 6 progress indicators for the user's career journey today or this month.
          Return ONLY a JSON array with objects containing: milestone, description, timeframe (today or within ${monthStr}).`;

      case "trends":
        return `Based on this profile:
          ${profileInfo}
          ${dateRestriction}
          
          Generate 6 industry trends relevant to today or this month for these industries and skills.
          Return ONLY a JSON array with objects containing: title, description, impact, action.`;

      case "salary":
        return `Based on this profile:
          ${profileInfo}
          ${dateRestriction}
          
          Generate 6 salary comparisons for positions active today or this month.
          Return ONLY a JSON array with objects containing: title, averageSalary (in INR), entrySalary (in INR), seniorSalary (in INR), growthOutlook.
          Use a conversion rate of 1 USD = ${CURRENCY_CONVERSION_RATE} INR.`;

      case "studyMaterial":
        return `Based on this profile:
          ${profileInfo}
          ${dateRestriction}
          
          Generate 6 recommended study materials available today or this month for exam preparation and skill development.
          Return ONLY a JSON array with objects containing: title, type, author, description, difficulty, url, cost (in INR), timeToComplete.
          Use a conversion rate of 1 USD = ${CURRENCY_CONVERSION_RATE} INR.`;

      default:
        return "";
    }
  }, [userProfile, dynamicData]);

  // Parse generated content (unchanged)
  const parseGeneratedContent = useCallback((content, tab) => {
    if (!content) return [];

    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) return JSON.parse(jsonMatch[1]);

      const arrayMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (arrayMatch) return JSON.parse(arrayMatch[0]);

      try {
        return JSON.parse(content);
      } catch (e) {
        const sanitized = content.replace(/^[^[]*/, '').replace(/[^\]]*$/, '');
        return JSON.parse(sanitized);
      }
    } catch (err) {
      console.error("Error parsing generated content:", err);
      setError("Failed to parse generated content. Please try again.");
      return [];
    }
  }, []);

  // Check if data needs refresh (today or this month)
  const needsRefresh = useCallback((tab) => {
    const lastUpdate = lastUpdated[tab];
    if (!lastUpdate) return true;

    const updateDate = new Date(lastUpdate);
    const yearMatch = updateDate.getFullYear() === CURRENT_YEAR;
    const monthMatch = updateDate.getMonth() === CURRENT_MONTH;
    const dayMatch = updateDate.getDate() === CURRENT_DAY;
    return !(yearMatch && (dayMatch || monthMatch)); // Refresh if not today or this month
  }, [lastUpdated]);

  // Load data for a specific tab
  const loadTabData = useCallback(async (tab) => {
    if (!userProfile || !tab) return;

    if (dynamicData[tab]?.length && !needsRefresh(tab)) {
      return;
    }

    setIsLoading(true);

    try {
      if (tab === "progress") {
        const todayStr = currentDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
        const monthStr = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        const progressData = [
          { 
            milestone: `Profile Update ${todayStr}`, 
            description: `Profile updated on ${todayStr}`,
            timeframe: "Today" 
          },
          { 
            milestone: "Skill Focus", 
            description: `Targeted ${userProfile.skills.length} skills today`,
            timeframe: "Today" 
          },
          { 
            milestone: "Industry Engagement", 
            description: `Engaged with ${userProfile.industries.length} industries in ${monthStr}`,
            timeframe: `Mid ${monthStr}` 
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

  // Force refresh data for a specific tab (unchanged)
  const refreshTabData = useCallback(async (tab) => {
    setDynamicData(prev => ({ ...prev, [tab]: [] }));
    await loadTabData(tab);
  }, [loadTabData]);

  // Utility function to calculate data freshness (unchanged)
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
    lastUpdated,
  };
};
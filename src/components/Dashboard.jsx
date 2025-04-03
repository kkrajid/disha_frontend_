import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png"; // Ensure this path is correct
import { useDynamicContent } from "../hook/useDynamicContent";
import { logout } from "../api/authapi"; // Adjust the import path based on your project structure

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("");
  const [showGrid, setShowGrid] = useState(true);
  const [linkError, setLinkError] = useState(null);
  const { userProfile, dynamicData, isLoading, error, loadTabData } = useDynamicContent();

  useEffect(() => {
    if (activeTab) {
      loadTabData(activeTab);
    }
  }, [activeTab, loadTabData]);

  const validateUrl = async (url) => {
    const urlPattern = /^(https?:\/\/[^\s/$.?#].[^\s]*)$/i;
    if (!urlPattern.test(url)) return false;

    try {
      const response = await fetch(url, { method: "HEAD", mode: "no-cors" });
      return true;
    } catch (err) {
      console.error(`URL validation failed for ${url}:`, err);
      return false;
    }
  };

  const handleLinkClick = async (url, title) => {
    setLinkError(null);
    const isValid = await validateUrl(url);
    if (isValid) {
      window.open(url, "_blank");
    } else {
      setLinkError(
        `The link for "${title}" appears to be invalid or unreachable. Try searching for it instead.`
      );
      window.open(`https://www.google.com/search?q=${encodeURIComponent(title)}`, "_blank");
    }
  };

  const generateCV = async () => {
    if (!userProfile) {
      alert("User profile is incomplete. Please update your profile.");
      return;
    }

    const { name, qualification, address, mobileNumber, skills, industries } = userProfile;

    if (!name || !qualification || !address || !mobileNumber) {
      alert("Missing required profile fields (name, qualification, address, phone).");
      return;
    }

    const latexContent = `
\\documentclass[10pt, letterpaper]{article}
\\usepackage[top=2cm,bottom=2cm,left=2cm,right=2cm,footskip=1.0cm]{geometry}
\\usepackage{titlesec}
\\usepackage[dvipsnames]{xcolor}
\\definecolor{primaryColor}{RGB}{0, 79, 144}
\\usepackage{enumitem}
\\usepackage{hyperref}
\\usepackage{lastpage}
\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
\\titleformat{\\section}{\\bfseries\\large}{}{0pt}{}[\\vspace{1pt}\\titlerule]
\\titlespacing{\\section}{-1pt}{0.3cm}{0.2cm}
\\begin{document}
\\begin{center}
    \\textbf{\\fontsize{24pt}{24pt}\\selectfont ${name.toUpperCase()}} \\\\
    \\vspace{0.3cm}
    \\normalsize
    ${address} \\quad | \\quad
    \\href{mailto:example@email.com}{example@email.com} \\quad | \\quad
    \\href{tel:${mobileNumber}}{${mobileNumber}}
\\end{center}
\\vspace{0.3cm}
\\section{Education}
\\textbf{${qualification}} \\\\
\\textit{Recent} \\\\
\\vspace{0.1cm}
\\begin{itemize}
    \\item Relevant education based on profile.
\\end{itemize}
\\section{Experience}
\\textbf{Job Seeker} \\\\
\\textit{${industries.join(", ")}} \\\\
\\textit{Recent} \\\\
\\vspace{0.1cm}
\\begin{itemize}
    \\item Actively seeking opportunities in preferred industries.
\\end{itemize}
\\section{Technologies}
\\textbf{Skills:} ${skills.join(", ")} \\\\
\\textbf{Industries:} ${industries.join(", ")}
\\end{document}
    `;

    try {
      const response = await fetch(
        "https://latexonline.cc/compile?text=" + encodeURIComponent(latexContent),
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LaTeX compilation failed: ${response.status} - ${errorText}`);
      }

      const pdfBlob = await response.blob();
      const pdfUrl = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = `${name}_resume.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(pdfUrl);
    } catch (err) {
      console.error("PDF generation failed:", err);
      const overleafUrl = `https://www.overleaf.com/docs?snip=${encodeURIComponent(latexContent)}`;
      window.open(overleafUrl, "_blank");
      alert(`PDF generation failed. Redirecting to Overleaf to compile manually.`);
    }
  };

  const handleLogout = () => {
    logout(); // Call the logout function from auth.js
    navigate("/login"); // Redirect to login page after logout
  };

  const renderContent = () => {
    const renderCard = (item, buttonText) => {
      const handleMockInterviewClick = () => {
        if (activeTab === "mockInterview") {
          window.open("https://www.interviewing.io/", "_blank");
        } else if (item.url) {
          handleLinkClick(item.url, item.title);
        }
      };

      return (
        <div className="bg-gray-50 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
          {Object.entries(item).map(([key, value]) =>
            key !== "buttonText" && key !== "url" ? (
              <p key={key} className="text-sm sm:text-base text-gray-700 mb-2">
                <span className="font-medium capitalize">{key}: </span>
                {value}
              </p>
            ) : null
          )}
          <button
            onClick={handleMockInterviewClick}
            className="w-full mt-3 py-2 bg-[#3AADE1] text-white rounded-full font-medium text-sm sm:text-base"
          >
            {buttonText || item.buttonText || "View Details"}
          </button>
        </div>
      );
    };

    const renderSampleQuestionCard = (item) => (
      <div className="bg-gray-50 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
        <p className="text-sm sm:text-base text-gray-700 mb-2">
          <span className="font-medium">Question: </span>{item.question}
        </p>
        <p className="text-sm sm:text-base text-gray-700 mb-2">
          <span className="font-medium">Answer: </span>{item.answer}
        </p>
        <p className="text-sm sm:text-base text-gray-700 mb-2">
          <span className="font-medium">Category: </span>{item.category}
        </p>
      </div>
    );

    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#3AADE1]"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 rounded-xl p-4 text-red-600 text-center">{error}</div>
      );
    }

    return (
      <>
        {linkError && (
          <div className="bg-yellow-50 rounded-xl p-4 text-yellow-800 text-center mb-4">
            {linkError}
          </div>
        )}
        {(() => {
          switch (activeTab) {
            case "courses":
              return (
                <div className="space-y-4">
                  {(dynamicData.courses || []).map((course, index) =>
                    renderCard(course, "Enroll Now")
                  )}
                </div>
              );
            case "jobs":
              return (
                <div className="space-y-4">
                  {(dynamicData.jobs || []).map((job, index) =>
                    renderCard(job, "Apply Now")
                  )}
                </div>
              );
            case "examHelper":
              return (
                <div className="space-y-4">
                  {(dynamicData.examHelper || []).map((exam, index) =>
                    renderCard(exam, "Access Now")
                  )}
                </div>
              );
            case "mockInterview":
              return (
                <div className="space-y-4">
                  {(dynamicData.mockInterview || []).map((interview, index) =>
                    renderCard(interview, "Start Practice")
                  )}
                </div>
              );
            case "sampleQuestions":
              return (
                <div className="space-y-4">
                  {(dynamicData.sampleQuestions || []).map((question, index) =>
                    renderSampleQuestionCard(question)
                  )}
                </div>
              );
            case "progress":
              return (
                <div className="space-y-4">
                  {(dynamicData.progress || []).map((item, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200"
                    >
                      <p className="text-sm sm:text-base text-gray-700">{item.text}</p>
                    </div>
                  ))}
                </div>
              );
            case "trends":
              return (
                <div className="space-y-4">
                  {(dynamicData.trends || []).map((trend, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200"
                    >
                      <p className="text-sm sm:text-base text-gray-700">{trend.text}</p>
                    </div>
                  ))}
                </div>
              );
            case "salary":
              return (
                <div className="space-y-4">
                  {(dynamicData.salary || []).map((item, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200"
                    >
                      <p className="text-sm sm:text-base text-gray-700 mb-2">
                        <span className="font-medium">Position: </span>{item.title}
                      </p>
                      <p className="text-sm sm:text-base text-gray-700 mb-2">
                        <span className="font-medium">Salary Range: </span>{item.salary}
                      </p>
                    </div>
                  ))}
                </div>
              );
            case "resumeGenerator":
              return (
                <div className="bg-gray-50 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
                  <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6">CV Generator</h2>
                  <div className="space-y-4">
                    {["Name", "Qualification", "Address", "Phone"].map((field) => (
                      <input
                        key={field}
                        type={field === "Phone" ? "tel" : "text"}
                        placeholder={field}
                        value={
                          userProfile && field === "Name"
                            ? userProfile.name
                            : userProfile && field === "Qualification"
                            ? userProfile.qualification
                            : userProfile && field === "Address"
                            ? userProfile.address
                            : userProfile && field === "Phone"
                            ? userProfile.mobileNumber
                            : ""
                        }
                        className="w-full bg-transparent border-b border-blue-200 py-2 focus:outline-none text-base text-gray-700"
                        disabled
                      />
                    ))}
                    <button
                      onClick={generateCV}
                      className="w-full py-3 bg-[#3AADE1] text-white rounded-full font-medium text-base sm:text-lg"
                    >
                      Generate CV
                    </button>
                  </div>
                </div>
              );
            default:
              return navigate("/profile-setup");
          }
        })()}
      </>
    );
  };

  const menuItems = [
    { id: 1, title: "Courses For You", tab: "courses" },
    { id: 2, title: "Jobs for You", tab: "jobs" },
    { id: 3, title: "Exam Helper", tab: "examHelper" },
    { id: 4, title: "Mock Interview", tab: "mockInterview" },
    { id: 5, title: "Sample Questions", tab: "sampleQuestions" },
    { id: 6, title: "My Progress", tab: "progress" },
    { id: 7, title: "Industry Trends", tab: "trends" },
    { id: 8, title: "Salary Compare", tab: "salary" },
    { id: 9, title: "Resume Generator", tab: "resumeGenerator" },
    { id: 10, title: "Profile summary", tab: "Profilesummary" },
  ];

  const handleGridItemClick = (tab) => {
    setActiveTab(tab);
    setShowGrid(false);
  };

  const handleBack = () => {
    setShowGrid(true);
    setActiveTab("");
    setLinkError(null);
  };

  const navIcons = {
    courses:
      "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
    jobs:
      "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
    examHelper:
      "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    trends: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
    resumeGenerator:
      "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  };

  const navigationItems = [
    { tab: "courses", icon: navIcons.courses, label: "Learn" },
    { tab: "jobs", icon: navIcons.jobs, label: "Jobs" },
    { tab: "examHelper", icon: navIcons.examHelper, label: "Exams" },
    { tab: "trends", icon: navIcons.trends, label: "Trends" },
    { tab: "resumeGenerator", icon: navIcons.resumeGenerator, label: "Resume" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-white px-4 sm:px-6">
      <header className="fixed top-0 left-0 right-0 bg-white py-3 px-4 sm:px-6 flex justify-between items-center z-10 shadow-sm border-b border-gray-200">
        <button onClick={() => setShowGrid(true)} className="flex items-center">
          <img src={logo} alt="DISHA Logo" className="h-8 sm:h-10 w-auto" />
        </button>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-sm sm:text-base font-medium text-gray-800">
            {userProfile?.name || "User"}
          </span>
          <Link
            to="/profile-setup"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#4CA1E2] flex items-center justify-center overflow-hidden border-2 border-white"
          >
            <div className="w-full h-full bg-[#4CA1E2] flex items-center justify-center text-white font-bold">
              {userProfile?.name?.charAt(0) || "U"}
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="text-sm sm:text-base text-gray-600 hover:text-gray-800 font-medium"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="flex-1 pt-16 sm:pt-20 pb-16">
        <div className="w-full max-w-md mx-auto">
          {showGrid ? (
            <>
              <div className="relative rounded-xl overflow-hidden mt-4 mb-6 h-64 shadow-lg">
                <div className="w-full h-full bg-gradient-to-r from-blue-400 to-blue-600 absolute inset-0" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/30" />
                <div className="relative h-full flex flex-col justify-end p-4 text-white">
                  <h2 className="text-lg sm:text-xl font-bold mb-1 drop-shadow-md">
                    {userProfile
                      ? `Welcome back, ${userProfile.name}`
                      : "Welcome to DISHA"}
                  </h2>
                  <p className="text-sm sm:text-base opacity-90 drop-shadow-md">
                    {userProfile?.industries.length
                      ? `Discover opportunities in ${userProfile.industries.join(", ")}`
                      : "Discover new opportunities"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleGridItemClick(item.tab)}
                    className="flex items-center justify-center p-4 h-20 rounded-xl bg-[#3AADE1] shadow-sm hover:shadow-md transition-shadow duration-200 active:scale-95"
                    aria-label={`Go to ${item.title}`}
                  >
                    <span className="text-sm sm:text-base font-medium text-white text-center">
                      {item.title}
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="absolute top-16 sm:top-20 left-4 sm:left-6">
                <button
                  onClick={handleBack}
                  className="bg-gray-700 text-white rounded-full p-2 sm:p-3 hover:bg-gray-800 transition-colors"
                  aria-label="Go back to dashboard grid"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
              </div>

              <div className="pt-12 sm:pt-16">{renderContent()}</div>
            </>
          )}
        </div>
      </main>

      {!showGrid && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-2 px-4 sm:px-6 z-10 shadow-sm">
          <div className="max-w-md mx-auto grid grid-cols-5 gap-1 sm:gap-3">
            {navigationItems.map((item) => (
              <button
                key={item.tab}
                onClick={() => setActiveTab(item.tab)}
                className={`flex flex-col items-center justify-center p-1 sm:p-5 ${
                  activeTab === item.tab ? "text-[#3AADE1]" : "text-gray-500"
                }`}
                aria-label={`Go to ${item.label} section`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 sm:h-6 sm:w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={item.icon}
                  />
                </svg>
                <span className="text-xs sm:text-sm">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
};

export default Dashboard;
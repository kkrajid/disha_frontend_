import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import { useDynamicContent } from "../hook/useDynamicContent";
import { logout } from "../api/authapi";

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("");
  const [showGrid, setShowGrid] = useState(true);
  const [linkError, setLinkError] = useState(null);
  const [showOverleafModal, setShowOverleafModal] = useState(false);
  const [latexContent, setLatexContent] = useState("");
  
  const {
    userProfile,
    dynamicData,
    isLoading,
    error,
    loadTabData,
    refreshTabData,
    getDataFreshness,
    lastUpdated
  } = useDynamicContent();

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

    const latex = `
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

    setLatexContent(latex);

    try {
      const response = await fetch(
        "https://latexonline.cc/compile?text=" + encodeURIComponent(latex),
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
      setShowOverleafModal(true);
    }
  };

  const handleOverleafRedirect = () => {
    const overleafUrl = `https://www.overleaf.com/docs?snip=${encodeURIComponent(latexContent)}`;
    window.open(overleafUrl, "_blank");
    setShowOverleafModal(false);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
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
        <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-300">
          {Object.entries(item).map(([key, value]) =>
            key !== "buttonText" && key !== "url" ? (
              <p key={key} className="text-sm text-gray-700 mb-3 last:mb-0">
                <span className="font-semibold text-gray-900 capitalize">{key}: </span>
                {Array.isArray(value) ? value.join(", ") : value}
              </p>
            ) : null
          )}
          <button
            onClick={handleMockInterviewClick}
            className="w-full mt-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium text-sm hover:shadow-md transition-all duration-200 active:scale-95"
          >
            {buttonText || item.buttonText || "View Details"}
          </button>
        </div>
      );
    };

    const renderSampleQuestionCard = (item) => (
      <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-300">
        <p className="text-sm text-gray-700 mb-3">
          <span className="font-semibold text-gray-900">Subject: </span>
          <span className="text-blue-600 font-medium">{item.subject}</span>
        </p>
        <p className="text-sm text-gray-700 mb-3">
          <span className="font-semibold text-gray-900">Question: </span>{item.question}
        </p>
        {item.options && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-gray-500 mb-1">Options:</p>
            <ul className="list-disc list-inside text-sm text-gray-700">
              {item.options.map((opt, i) => (
                <li key={i}>{opt}</li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-sm text-gray-700 mb-3">
          <span className="font-semibold text-gray-900">Correct Answer: </span>{item.correctAnswer}
        </p>
        {item.explanation && (
          <p className="text-sm text-gray-700">
            <span className="font-semibold text-gray-900">Explanation: </span>{item.explanation}
          </p>
        )}
      </div>
    );

    const renderProgressItem = (item) => (
      <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100">
        <h3 className="font-bold text-gray-900 mb-2">{item.milestone}</h3>
        <p className="text-sm text-gray-700 mb-3">{item.description}</p>
        <p className="text-xs text-gray-500">
          <span className="font-semibold">Timeframe:</span> {item.timeframe}
        </p>
      </div>
    );

    const renderTrendItem = (item) => (
      <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100">
        <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
        <p className="text-sm text-gray-700 mb-3">{item.description}</p>
        <div className="mb-3">
          <p className="text-xs font-semibold text-gray-500">Impact:</p>
          <p className="text-sm text-gray-700">{item.impact}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500">Recommended Action:</p>
          <p className="text-sm text-gray-700">{item.action}</p>
        </div>
      </div>
    );

    const renderSalaryItem = (item) => (
      <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100">
        <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <p className="text-xs font-semibold text-gray-500">Entry Level</p>
            <p className="text-sm text-gray-700">₹{item.entrySalary}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500">Senior Level</p>
            <p className="text-sm text-gray-700">₹{item.seniorSalary}</p>
          </div>
        </div>
        <p className="text-sm text-gray-700 mb-3">
          <span className="font-semibold">Average:</span> ₹{item.averageSalary}
        </p>
        <p className="text-xs text-gray-500">
          <span className="font-semibold">Growth Outlook:</span> {item.growthOutlook}
        </p>
      </div>
    );

    const renderStudyMaterialItem = (item) => (
      <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100">
        <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
            {item.type}
          </span>
          <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
            {item.difficulty}
          </span>
        </div>
        <p className="text-sm text-gray-700 mb-3">{item.description}</p>
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <p className="text-xs font-semibold text-gray-500">Author</p>
            <p className="text-sm text-gray-700">{item.author}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500">Cost</p>
            <p className="text-sm text-gray-700">₹{item.cost}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500">Time to Complete</p>
            <p className="text-sm text-gray-700">{item.timeToComplete} hours</p>
          </div>
        </div>
        <button
          onClick={() => handleLinkClick(item.url, item.title)}
          className="w-full mt-2 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium text-sm hover:shadow-md transition-all duration-200 active:scale-95"
        >
          {item.buttonText || "Access Material"}
        </button>
      </div>
    );

    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 rounded-xl p-4 text-red-600 text-center text-sm">
          {error}
          <button
            onClick={() => refreshTabData(activeTab)}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      );
    }

    return (
      <>
        {linkError && (
          <div className="bg-yellow-50 rounded-xl p-4 text-yellow-800 text-center mb-4 text-sm">
            {linkError}
          </div>
        )}

        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold text-gray-900 capitalize">
            {activeTab.replace(/([A-Z])/g, ' $1').trim()}
          </h1>
          {lastUpdated[activeTab] && (
            <span className="text-xs text-gray-500">
              Updated: {getDataFreshness(activeTab)}
            </span>
          )}
        </div>

        {(() => {
          switch (activeTab) {
            case "courses":
              return (
                <div className="grid gap-4">
                  {(dynamicData.courses || []).map((course, index) => (
                    <div key={index} className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-300">
                      <h3 className="font-bold text-lg text-gray-900 mb-2">{course.title}</h3>
                      <p className="text-sm text-gray-700 mb-3">{course.description}</p>
                      
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <p className="text-xs font-semibold text-gray-500">Provider</p>
                          <p className="text-sm text-gray-700">{course.provider}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500">Duration</p>
                          <p className="text-sm text-gray-700">{course.duration}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500">Fee</p>
                          <p className="text-sm text-gray-700">₹{course.fee}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500">Level</p>
                          <p className="text-sm text-gray-700">{course.level || 'Beginner to Advanced'}</p>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-gray-500">Skills Covered</p>
                        <p className="text-sm text-gray-700">{course.skillsCovered || course.skills || 'Relevant to your profile'}</p>
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-gray-500">Certificate</p>
                        <p className="text-sm text-gray-700">{course.certificate ? 'Yes' : 'No'}</p>
                      </div>
                      
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-gray-500">Language</p>
                        <p className="text-sm text-gray-700">{course.language || 'English'}</p>
                      </div>
                      
                      <button
                        onClick={() => handleLinkClick(course.url, course.title)}
                        className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium text-sm hover:shadow-md transition-all duration-200 active:scale-95"
                      >
                        {course.buttonText || "Enroll Now"}
                      </button>
                    </div>
                  ))}
                </div>
              );
            case "jobs":
              return (
                <div className="grid gap-4">
                  {(dynamicData.jobs || []).map((job, index) => (
                    <div key={index} className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-300">
                      <h3 className="font-bold text-lg text-gray-900 mb-2">{job.title}</h3>
                      <p className="text-sm text-gray-700 mb-3">{job.description}</p>
                      
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <p className="text-xs font-semibold text-gray-500">Company</p>
                          <p className="text-sm text-gray-700">{job.company || job.provider}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500">Location</p>
                          <p className="text-sm text-gray-700">{job.location}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500">Experience</p>
                          <p className="text-sm text-gray-700">{job.experience}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500">Salary</p>
                          <p className="text-sm text-gray-700">₹{job.salary}</p>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-gray-500">Job Type</p>
                        <p className="text-sm text-gray-700">{job.jobType || 'Full-time'}</p>
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-gray-500">Posted</p>
                        <p className="text-sm text-gray-700">{job.postedDate || 'Recently'}</p>
                      </div>
                      
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-gray-500">Skills Required</p>
                        <p className="text-sm text-gray-700">{job.skillsRequired || job.skills || 'Matching your profile'}</p>
                      </div>
                      
                      <button
                        onClick={() => handleLinkClick(job.url, job.title)}
                        className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium text-sm hover:shadow-md transition-all duration-200 active:scale-95"
                      >
                        {job.buttonText || "Apply Now"}
                      </button>
                    </div>
                  ))}
                </div>
              );
            case "examHelper":
              return (
                <div className="grid gap-4">
                  {(dynamicData.examHelper || []).map((exam, index) => (
                    <div key={index} className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-300">
                      <h3 className="font-bold text-lg text-gray-900 mb-2">{exam.title}</h3>
                      <p className="text-sm text-gray-700 mb-3">{exam.description}</p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        <div>
                          <p className="text-xs font-semibold text-gray-500">Conducted By</p>
                          <p className="text-sm text-gray-700">{exam.conductingBody}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500">Exam Date</p>
                          <p className="text-sm text-gray-700">{exam.examDate || exam.frequency}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500">Application Fee</p>
                          <p className="text-sm text-gray-700">₹{exam.fee}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500">Age Limit</p>
                          <p className="text-sm text-gray-700">
                            {exam.eligibility?.ageLimit || 'No age limit'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-gray-500">Eligibility</p>
                        <p className="text-sm text-gray-700">{exam.eligibility?.details || exam.eligibility}</p>
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-gray-500">How to Apply</p>
                        <p className="text-sm text-gray-700">{exam.applicationProcess}</p>
                      </div>
                      
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-gray-500">Syllabus</p>
                        <p className="text-sm text-gray-700">{exam.syllabus}</p>
                      </div>
                      
                      <button
                        onClick={() => handleLinkClick(exam.url, exam.title)}
                        className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium text-sm hover:shadow-md transition-all duration-200 active:scale-95"
                      >
                        {exam.buttonText || "Learn More"}
                      </button>
                    </div>
                  ))}
                </div>
              );
            case "mockInterview":
              return (
                <div className="grid gap-4">
                  {(dynamicData.mockInterview || []).map((interview, index) =>
                    renderCard(interview, "Start Practice")
                  )}
                </div>
              );
            case "sampleQuestions":
              return (
                <div className="grid gap-4">
                  {(dynamicData.sampleQuestions || []).map((question, index) =>
                    renderSampleQuestionCard(question)
                  )}
                </div>
              );
            case "progress":
              return (
                <div className="grid gap-4">
                  {(dynamicData.progress || []).map((item, index) =>
                    renderProgressItem(item)
                  )}
                </div>
              );
            case "trends":
              return (
                <div className="grid gap-4">
                  {(dynamicData.trends || []).map((trend, index) =>
                    renderTrendItem(trend)
                  )}
                </div>
              );
            case "salary":
              return (
                <div className="grid gap-4">
                  {(dynamicData.salary || []).map((item, index) =>
                    renderSalaryItem(item)
                  )}
                </div>
              );
            case "studyMaterial":
              return (
                <div className="grid gap-4">
                  {(dynamicData.studyMaterial || []).map((item, index) =>
                    renderStudyMaterialItem(item)
                  )}
                </div>
              );
            case "resumeGenerator":
              return (
                <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
                  <h2 className="text-xl font-bold mb-6 text-gray-900">CV Generator</h2>
                  <div className="space-y-4">
                    {["Name", "Qualification", "Address", "Phone"].map((field) => (
                      <div key={field} className="relative">
                        <label className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-500">
                          {field}
                        </label>
                        <input
                          type={field === "Phone" ? "tel" : "text"}
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
                          className="w-full bg-transparent border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          disabled
                        />
                      </div>
                    ))}
                    <button
                      onClick={generateCV}
                      className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium text-sm hover:shadow-md transition-all duration-200 active:scale-95"
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
    { id: 1, title: "Courses", tab: "courses", icon: "🎓" },
    { id: 2, title: "Jobs", tab: "jobs", icon: "💼" },
    { id: 3, title: "Exam Helper", tab: "examHelper", icon: "📝" },
    { id: 4, title: "Mock Interview", tab: "mockInterview", icon: "🎤" },
    { id: 5, title: "Sample Qs", tab: "sampleQuestions", icon: "❓" },
    { id: 6, title: "My Progress", tab: "progress", icon: "📊" },
    { id: 7, title: "Trends", tab: "trends", icon: "📈" },
    { id: 8, title: "Salary", tab: "salary", icon: "💰" },
    { id: 9, title: "Study Material", tab: "studyMaterial", icon: "📚" },
    { id: 10, title: "Resume", tab: "resumeGenerator", icon: "📄" },
    { id: 11, title: "Profile", tab: "Profilesummary", icon: "👤" },
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

  const navigationItems = [
    { tab: "courses", icon: "🎓", label: "Learn" },
    { tab: "jobs", icon: "💼", label: "Jobs" },
    { tab: "examHelper", icon: "📝", label: "Exams" },
    { tab: "trends", icon: "📈", label: "Trends" },
    { tab: "resumeGenerator", icon: "📄", label: "Resume" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 px-4 sm:px-6">
      {/* Overleaf Guidance Modal */}
      {showOverleafModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-6 max-w-md w-full">
          <h3 className="text-xl font-bold text-gray-900 mb-4">CV Generation Help</h3>
          <p className="text-gray-700 mb-4">
            We'll redirect you to Overleaf (a free LaTeX editor) where you can:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm text-gray-700 mb-4">
            <li>Wait for the document to load</li>
            <li>Click the "Recompile" button</li>
            <li>Download the PDF</li>
            <li>Close the Overleaf tab</li>
          </ul>
          <p className="text-sm text-gray-600 mb-4">
            If you have an Overleaf account, please log in. Otherwise, you'll need to register for a free account.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowOverleafModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleOverleafRedirect}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go to Overleaf
            </button>
          </div>
        </div>
      </div>
      )}

      <header className="fixed top-0 left-0 right-0 bg-white py-4 px-4 sm:px-6 flex justify-between items-center z-10 shadow-sm">
        <button onClick={() => setShowGrid(true)} className="flex items-center">
          <img src={logo} alt="DISHA Logo" className="h-8 sm:h-10 w-auto" />
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-800 hidden sm:block">
            {userProfile?.name || "User"}
          </span>
          <Link
            to="/profile-setup"
            className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center overflow-hidden shadow-sm"
          >
            <div className="w-full h-full flex items-center justify-center text-white font-bold">
              {userProfile?.name?.charAt(0) || "U"}
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
          {showGrid ? (
            <>
              <div className="relative rounded-2xl overflow-hidden mb-6 h-48 sm:h-56 shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-800" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="relative h-full flex flex-col justify-end p-6 text-white">
                  <h2 className="text-xl sm:text-2xl font-bold mb-2">
                    {userProfile
                      ? `Welcome back, ${userProfile.name}`
                      : "Welcome to DISHA"}
                  </h2>
                  <p className="text-sm sm:text-base opacity-90">
                    {userProfile?.industries.length
                      ? `Discover opportunities in ${userProfile.industries.join(", ")}`
                      : "Discover new opportunities"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleGridItemClick(item.tab)}
                    className="flex flex-col items-center justify-center p-4 h-28 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200 active:scale-95"
                    aria-label={`Go to ${item.title}`}
                  >
                    <span className="text-2xl mb-2">{item.icon}</span>
                    <span className="text-xs sm:text-sm font-medium text-gray-800 text-center">
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
                  className="bg-white text-gray-700 rounded-full p-2 shadow-md hover:bg-gray-50 transition-colors"
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

              <div className="pt-12 sm:pt-16">
                {renderContent()}
              </div>
            </>
          )}
        </div>
      </main>

      {!showGrid && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-2 px-4 sm:px-6 z-10 shadow-lg">
          <div className="max-w-md mx-auto grid grid-cols-5 gap-1 sm:gap-3">
            {navigationItems.map((item) => (
              <button
                key={item.tab}
                onClick={() => setActiveTab(item.tab)}
                className={`flex flex-col items-center justify-center p-2 ${
                  activeTab === item.tab ? "text-blue-600" : "text-gray-500"
                }`}
                aria-label={`Go to ${item.label} section`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-xs">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
};

export default Dashboard;
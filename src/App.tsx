/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Video, 
  Briefcase, 
  Map, 
  Settings, 
  Bell, 
  ArrowLeft, 
  IdCard, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  Circle, 
  Book, 
  ShieldCheck, 
  Plus, 
  Search, 
  Download, 
  Trash2, 
  Sparkles,
  Mic,
  Globe,
  X,
  ChevronDown,
  Target,
  Cpu,
  Terminal,
  Clock,
  ArrowRight,
  BarChart3,
  History,
  TrendingUp,
  Award,
  PlayCircle,
  Zap,
  DollarSign,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Send,
  Loader2,
  Trophy,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { startInterviewSession, sendMessageWithRetry } from './services/gemini';
import Markdown from 'react-markdown';

type Page = 'dashboard' | 'resume' | 'interview' | 'analytics' | 'jobs' | 'settings' | 'notifications';

interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [settingsTab, setSettingsTab] = useState<'personal' | 'security' | 'notifications'>('personal');
  const [jobSource, setJobSource] = useState<'college' | 'web'>('college');
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileSteps, setProfileSteps] = useState([
    { id: 'basic', label: 'Basic Information', done: true, value: 40 },
    { id: 'academic', label: 'Academic Records', done: true, value: 42 },
    { id: 'gate', label: 'Sync GATE/GRE', done: false, bonus: '+10%', value: 10 },
    { id: 'certs', label: 'Verify Certificates', done: false, bonus: '+8%', value: 8 },
  ]);
  const profileCompletion = profileSteps.reduce((acc, step) => acc + (step.done ? step.value : 0), 0);

  const [showPassword, setShowPassword] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [showContext, setShowContext] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  
  // Interview States
  const [interviewMessages, setInterviewMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isAILoading, setIsAILoading] = useState(false);
  const [chatSession, setChatSession] = useState<any>(null);
  const [finalReport, setFinalReport] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showInterviewSetupModal, setShowInterviewSetupModal] = useState(false);
  const [interviewJD, setInterviewJD] = useState('');
  const [interviewResumeSource, setInterviewResumeSource] = useState<'ai' | 'upload'>('ai');
  const [uploadedResumeFile, setUploadedResumeFile] = useState<File | null>(null);
  
  const [interviewHistory, setInterviewHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem('interviewHistory');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('interviewHistory', JSON.stringify(interviewHistory));
  }, [interviewHistory]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const startInterview = async () => {
    setIsAILoading(true);
    setIsInterviewActive(true);
    setTimer(0);
    setShowInterviewSetupModal(false);
    
    try {
      // Start Camera
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Prepare Resume Context
      let resumeContext = "";
      if (interviewResumeSource === 'ai') {
        resumeContext = `
          Name: ${resumeData.name}
          Summary: ${resumeData.summary}
          Education: ${resumeData.degree}, CGPA: ${resumeData.cgpa}
          Skills: ${Object.entries(resumeData.skills).map(([k, v]) => `${k}: ${v}`).join(', ')}
          Experience: ${resumeData.experience.map(e => `${e.role} at ${e.company} (${e.duration}): ${e.desc}`).join('; ')}
          Projects: ${resumeData.projects.map(p => `${p.title} (${p.tech}): ${p.desc}`).join('; ')}
        `;
      } else {
        resumeContext = uploadedResumeFile ? `Uploaded Resume: ${uploadedResumeFile.name}` : "Standard Resume";
      }

      // Initialize Gemini
      const session = startInterviewSession("Software Developer (CSE)", interviewJD, resumeContext);
      setChatSession(session);
      
      const response = await sendMessageWithRetry(session, "Hello, I am ready for the interview.");
      setInterviewMessages([{
        role: 'model',
        text: response.text || "Hello! I'm your AI interviewer today. Let's start with a brief introduction. Can you tell me about yourself?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch (error: any) {
      console.error("Failed to start interview:", error);
      const errorMsg = error?.message || "";
      if (errorMsg.includes("429") || errorMsg.includes("quota")) {
        alert("Gemini API quota exceeded. Please wait a moment or try again later. If you have a paid API key, please configure it in the settings.");
      } else {
        alert("Failed to start interview. Please check your connection and try again.");
      }
    } finally {
      setIsAILoading(false);
    }
  };

  const endInterviewAndGenerateReport = async () => {
    if (!chatSession || isAILoading) return;
    
    setIsAILoading(true);
    try {
      const response = await sendMessageWithRetry(chatSession, "GENERATE_FINAL_REPORT");
      setFinalReport(response.text || "Report generation failed.");
      setShowReportModal(true);
      
      // Save to history
      const newHistoryItem = {
        id: Date.now(),
        date: new Date().toLocaleDateString(),
        role: "Software Developer (CSE)",
        score: response.text?.match(/Score: (\d+)/)?.[1] || "N/A",
        report: response.text,
        messages: interviewMessages
      };
      setInterviewHistory(prev => [newHistoryItem, ...prev]);
      
      // Stop camera
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
      setIsInterviewActive(false);
    } catch (error: any) {
      console.error("Report Generation Error:", error);
      const errorMsg = error?.message || "";
      if (errorMsg.includes("429") || errorMsg.includes("quota")) {
        alert("Quota exceeded while generating report. Retrying in a few seconds...");
      } else {
        alert("Failed to generate report. Please try again.");
      }
    } finally {
      setIsAILoading(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userInput.trim() || !chatSession || isAILoading) return;

    const userMsg: Message = {
      role: 'user',
      text: userInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setInterviewMessages(prev => [...prev, userMsg]);
    setUserInput('');
    setIsAILoading(true);

    try {
      const response = await sendMessageWithRetry(chatSession, userInput);
      const aiMsg: Message = {
        role: 'model',
        text: response.text || "I see. Let's move to the next question.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setInterviewMessages(prev => [...prev, aiMsg]);
    } catch (error: any) {
      console.error("Gemini Error:", error);
      const errorMsg = error?.message || "";
      if (errorMsg.includes("429") || errorMsg.includes("quota")) {
        const retryMsg: Message = {
          role: 'model',
          text: "⚠️ Quota exceeded. I'm having trouble connecting to my brain right now. Please wait a few seconds and try sending your message again.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setInterviewMessages(prev => [...prev, retryMsg]);
      }
    } finally {
      setIsAILoading(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [interviewMessages]);
  
  const [resumeData, setResumeData] = useState({
    name: 'Fathima Islam',
    email: 'fathima.i@osmania.edu',
    phone: '+91 98765 43210',
    location: 'Hyderabad, India',
    github: 'github.com/fathimaislam',
    summary: 'Diligent Final Year B.Tech student at Osmania University with expertise in Full-Stack Development and Cloud Infrastructures. Demonstrated success in building scalable microservices and optimizing system performance. Active contributor to campus open-source projects with a strong foundation in data structures and algorithms.',
    degree: 'B.Tech Computer Science Engineering',
    cgpa: '9.2 / 10.0',
    startDate: 'Aug 2022',
    endDate: 'Jun 2026',
    skills: {
      languages: 'Python, Java, JavaScript, C++, SQL',
      web: 'React.js, Node.js, Express, TailwindCSS',
      databases: 'MongoDB, MySQL, PostgreSQL, Redis',
      tools: 'Git, Docker, AWS, Kubernetes, Linux'
    },
    experience: [
      { role: 'Backend Development Intern', company: 'TechStart Solutions', duration: 'Jun - Aug 2025', desc: 'Built REST API serving 10K+ requests/day; Reduced database query time by 40% through optimization; Collaborated with team of 5 developers using Agile methodology' }
    ],
    projects: [
      { title: 'E-Commerce Platform', tech: 'React, Node.js, MongoDB, Stripe API', desc: 'Built full-stack e-commerce site with React, Node.js, MongoDB. Implemented payment gateway, user authentication, and admin dashboard.' }
    ],
    certifications: [
      { title: 'AWS Certified Cloud Practitioner', date: 'Jan 2026', issuer: 'Amazon Web Services' }
    ],
    awards: [
      { title: 'Best Project Award - AI Resume Builder', date: 'College Tech Fest 2025', desc: 'Won first prize for developing ML-powered resume optimization tool.' }
    ]
  });

  // Timer effect for interview
  useEffect(() => {
    let interval: any;
    if (currentPage === 'interview' && isInterviewActive) {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentPage, isInterviewActive]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggedIn(true);
  };

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-screen bg-white">
        {/* Left Panel */}
        <div className="hidden lg:flex flex-1 bg-gradient-to-br from-[#5c0a0a] to-[#3d0707] text-white p-10 flex-col justify-between">
          <div className="text-center">
            <div className="w-44 h-44 mx-auto mb-6 flex items-center justify-center overflow-hidden">
              <img 
                src="https://plain-apac-prod-public.komododecks.com/202603/14/VnwGWoj2VpwWfj7fohwt/image.png" 
                alt="Osmania University Logo" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <h2 className="text-3xl font-bold text-[#f4d03f] mb-2 tracking-widest">OSMANIA UNIVERSITY</h2>
            <p className="text-lg text-[#e0e0e0] font-light">Engineering Career Portal</p>
          </div>

          <div className="space-y-5">
            {[
              { icon: <Briefcase className="text-[#f4d03f]" />, title: 'Career Opportunities', desc: 'Access exclusive job postings from top companies' },
              { icon: <Book className="text-[#f4d03f]" />, title: 'Smart Resume Builder', desc: 'AI-powered resume creation and optimization' },
              { icon: <Video className="text-[#f4d03f]" />, title: 'Interview Prep', desc: 'Practice with AI-powered interview simulations' }
            ].map((feature, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-6 flex items-start gap-5 hover:bg-white/10 transition-all transform hover:translate-x-1">
                <div className="w-12 h-12 bg-[#f4d03f]/20 rounded-lg flex items-center justify-center shrink-0">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">{feature.title}</h3>
                  <p className="text-sm text-[#b0b0b0] leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center text-xs text-gray-400 space-y-1">
            <p>© 2025 Osmania University. All rights reserved.</p>
            <p>Powered by AIVORA Career Platform</p>
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-10">
          <div className="w-full max-w-md">
            <div className="mb-10">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome Back</h1>
              <p className="text-gray-600">Sign in to access your career portal</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">University ID / Email</label>
                <div className="relative">
                  <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input 
                    type="text" 
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-av-maroon-900/10 focus:border-av-maroon-900 transition-all"
                    placeholder="2024CS102 or student@osmania.edu"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    className="w-full pl-12 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-av-maroon-900/10 focus:border-av-maroon-900 transition-all"
                    placeholder="Enter your password"
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-av-maroon-900 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer text-gray-600">
                  <input type="checkbox" className="w-4 h-4 accent-av-maroon-900" />
                  <span>Remember me</span>
                </label>
                <a href="#" className="text-av-gold-500 font-medium hover:underline">Forgot password?</a>
              </div>

              <button type="submit" className="w-full py-4 bg-av-maroon-900 text-white rounded-xl font-bold text-lg hover:bg-av-maroon-800 transition-all transform hover:-translate-y-0.5 shadow-lg shadow-av-maroon-900/20">
                Sign In to Portal
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F7F4]">
      {/* Header */}
      {currentPage !== 'interview' && (
        <header className="h-[72px] bg-av-maroon-900 text-white px-6 flex items-center justify-between sticky top-0 z-50 shadow-av-md">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setCurrentPage('dashboard')}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">AIVORA</h1>
              <div className="border-l border-white/20 pl-2 leading-none">
                <small className="block text-[10px] text-av-gold-400 font-bold uppercase tracking-wider">OSMANIA UNIVERSITY</small>
                <small className="block text-[10px] text-white/60 font-medium">Career Portal</small>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div 
              className="relative cursor-pointer group"
              onClick={() => setCurrentPage('notifications')}
            >
              <Bell className="w-6 h-6 text-white/80 group-hover:text-white transition-colors" />
              <span className="absolute -top-1.5 -right-2 bg-av-gold-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">8</span>
            </div>
            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold">{resumeData.name}</div>
                <div className="text-[10px] text-av-gold-400 font-bold uppercase tracking-wider">B.TECH · CSE</div>
              </div>
              <img 
                src="https://i.pravatar.cc/150?img=5" 
                alt="Profile" 
                className="w-11 h-11 rounded-full border-2 border-av-gold-500 group-hover:scale-105 transition-transform"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </header>
      )}

      <div className={`flex ${currentPage === 'interview' ? 'h-screen' : 'min-h-[calc(100vh-72px)]'}`}>
        {/* Sidebar */}
        {currentPage !== 'interview' && (
          <aside className="w-72 bg-white border-r border-[#EAEAEA] py-8 hidden lg:block shrink-0 overflow-y-auto">
            <div className="space-y-8">
              <section>
                <h6 className="px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Core Actions</h6>
                <nav className="space-y-1">
                  {[
                    { id: 'dashboard', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard' },
                    { id: 'resume', icon: <FileText className="w-5 h-5" />, label: 'AI Resume Builder' },
                    { id: 'interview', icon: <Video className="w-5 h-5" />, label: 'Live AI Interview' },
                    { id: 'analytics', icon: <BarChart3 className="w-5 h-5" />, label: 'My Analytics' },
                    { id: 'jobs', icon: <Briefcase className="w-5 h-5" />, label: 'Explore Jobs' },
                    { id: 'path', icon: <Map className="w-5 h-5" />, label: 'Career Path', soon: true },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => !item.soon && setCurrentPage(item.id as Page)}
                      className={`w-full flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all border-l-4 ${
                        currentPage === item.id 
                          ? 'bg-av-maroon-900/5 border-av-maroon-900 text-av-maroon-900' 
                          : 'border-transparent text-gray-600 hover:bg-gray-50'
                      } ${item.soon ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <span className={currentPage === item.id ? 'text-av-maroon-900' : 'text-av-gold-500'}>{item.icon}</span>
                      {item.label}
                      {item.soon && <span className="ml-auto bg-av-warning/10 text-av-warning text-[9px] font-bold px-2 py-0.5 rounded-full">SOON</span>}
                    </button>
                  ))}
                </nav>
              </section>

              <section>
                <h6 className="px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Account</h6>
                <nav className="space-y-1">
                  <button
                    onClick={() => setCurrentPage('settings')}
                    className={`w-full flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all border-l-4 ${
                      currentPage === 'settings' 
                        ? 'bg-av-maroon-900/5 border-av-maroon-900 text-av-maroon-900' 
                        : 'border-transparent text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Settings className={`w-5 h-5 ${currentPage === 'settings' ? 'text-av-maroon-900' : 'text-av-gold-500'}`} />
                    Account Settings
                  </button>
                </nav>
              </section>
            </div>
          </aside>
        )}

        {/* Main Content Area */}
        <main className={`flex-1 ${currentPage === 'interview' ? 'p-4 h-screen overflow-hidden' : 'p-6 lg:p-8 ' + (currentPage === 'resume' ? 'h-[calc(100vh-72px)] overflow-hidden' : 'overflow-y-auto')}`}>
          <AnimatePresence mode="wait">
            {currentPage === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Profile Banner */}
                <div className="bg-gradient-to-br from-av-maroon-900 to-av-maroon-700 rounded-av-l p-8 text-white flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="flex items-center gap-6">
                    <img 
                      src="https://i.pravatar.cc/150?img=5" 
                      alt="Avatar" 
                      className="w-24 h-24 rounded-2xl border-4 border-av-gold-500 shadow-xl"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h2 className="text-3xl font-bold">{resumeData.name}</h2>
                      <p className="text-white/80 font-medium">B.TECH · CSE · Software Developer</p>
                      <div className="flex gap-2 mt-3">
                        {['ALGORITHMS', 'SYSTEM DESIGN', 'REACT.JS'].map(tag => (
                          <span key={tag} className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider">{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/10 p-6 rounded-2xl text-center backdrop-blur-sm border border-white/10">
                    <div className="w-20 h-20 rounded-full border-4 border-av-gold-400/30 border-t-av-gold-400 flex items-center justify-center text-2xl font-black text-av-gold-400 mx-auto mb-2">82%</div>
                    <div className="text-xs font-bold uppercase tracking-widest text-white/70">Job Readiness Score</div>
                  </div>
                </div>

                {/* Profile Completion */}
                <div className="av-card">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-av-maroon-900">Profile Completion</h3>
                    <span className="bg-av-gold-500/10 text-av-gold-500 px-3 py-1 rounded-full text-xs font-bold">{profileCompletion}% COMPLETE</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-6">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${profileCompletion}%` }}
                      className="h-full bg-av-maroon-900 transition-all duration-1000"
                    ></motion.div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {profileSteps.map((item, i) => (
                      <button 
                        key={i} 
                        onClick={() => !item.done && setShowProfileModal(true)}
                        className={`flex items-center gap-3 p-4 rounded-xl transition-all text-left ${item.done ? 'bg-av-success/5 border border-av-success/20' : 'bg-[#F1F0EC] border border-transparent hover:border-av-maroon-900/20 hover:bg-white'}`}
                      >
                        {item.done ? <CheckCircle className="w-5 h-5 text-av-success" /> : <Circle className="w-5 h-5 text-gray-400" />}
                        <span className={`text-sm font-semibold ${item.done ? 'text-av-success' : 'text-gray-700'}`}>{item.label}</span>
                        {item.bonus && <span className="ml-auto text-[10px] font-bold text-av-maroon-900">{item.bonus}</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Career Tools */}
                <div>
                  <h2 className="text-2xl font-bold text-av-maroon-900 mb-6">Primary Career Tools</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="av-card group hover:border-av-maroon-900/30 transition-all">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-av-maroon-900 rounded-xl flex items-center justify-center text-white">
                          <Book className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold">AI Resume Builder</h3>
                        <span className="ml-auto av-badge bg-av-gold-500/10 text-av-gold-500">V2.1</span>
                      </div>
                      <p className="text-gray-500 text-sm mb-6 leading-relaxed">Tailored for SDE roles and ATS optimization with FAANG-ready templates.</p>
                      <ul className="space-y-3 mb-8">
                        <li className="flex items-center gap-2 text-sm font-medium text-gray-700">
                          <CheckCircle className="w-4 h-4 text-av-success" /> FAANG templates
                        </li>
                        <li className="flex items-center gap-2 text-sm font-medium text-gray-700">
                          <CheckCircle className="w-4 h-4 text-av-success" /> Keyword highlighting
                        </li>
                      </ul>
                      <button 
                        onClick={() => setCurrentPage('resume')}
                        className="w-full av-btn av-btn-primary"
                      >
                        OPTIMIZE MY RESUME
                      </button>
                    </div>

                    <div className="av-card group hover:border-av-gold-500/30 transition-all">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-av-gold-500 rounded-xl flex items-center justify-center text-white">
                          <Video className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold">AI Mockup Interview</h3>
                        <span className="ml-auto av-badge bg-av-success/10 text-av-success">RECOMMENDED</span>
                      </div>
                      <p className="text-gray-500 text-sm mb-6 leading-relaxed">Practice DSA, System Design, and Behavioral questions with real-time AI feedback.</p>
                      <ul className="space-y-3 mb-8">
                        <li className="flex items-center gap-2 text-sm font-medium text-gray-700">
                          <CheckCircle className="w-4 h-4 text-av-success" /> Live coding simulations
                        </li>
                        <li className="flex items-center gap-2 text-sm font-medium text-gray-700">
                          <CheckCircle className="w-4 h-4 text-av-success" /> Performance metrics
                        </li>
                      </ul>
                      <button 
                        onClick={() => setShowInterviewSetupModal(true)}
                        className="w-full av-btn av-btn-secondary"
                      >
                        START MOCK INTERVIEW
                      </button>
                    </div>
                  </div>
                </div>

                {/* Interview History */}
                {interviewHistory.length > 0 && (
                  <div className="mt-12">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-av-maroon-900">Recent Interview Sessions</h2>
                      <button 
                        onClick={() => {
                          if (confirm('Are you sure you want to clear your interview history?')) {
                            setInterviewHistory([]);
                          }
                        }}
                        className="text-xs font-bold text-av-maroon-900 hover:underline"
                      >
                        CLEAR HISTORY
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {interviewHistory.map((session) => (
                        <div key={session.id} className="av-card hover:shadow-lg transition-all border-l-4 border-av-maroon-900">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="font-bold text-gray-900">{session.role}</h4>
                              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{session.date}</p>
                            </div>
                            <div className="bg-av-maroon-900 text-white px-3 py-1 rounded-full text-xs font-bold">
                              {session.score}/100
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mb-4">
                            <Trophy className="w-4 h-4 text-av-gold-500" />
                            <span className="text-xs font-semibold text-gray-700">Performance Report Ready</span>
                          </div>
                          <button 
                            onClick={() => {
                              setFinalReport(session.report);
                              setShowReportModal(true);
                            }}
                            className="w-full py-2 rounded-lg bg-gray-100 text-gray-900 text-xs font-bold hover:bg-gray-200 transition-colors"
                          >
                            VIEW FULL REPORT
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {currentPage === 'interview' && (
              <motion.div 
                key="interview"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="h-full flex flex-col space-y-6"
              >
                {!isInterviewActive ? (
                  <div className="h-full flex items-center justify-center p-8">
                    <div className="max-w-md w-full bg-white rounded-[32px] p-10 text-center shadow-2xl border border-gray-100">
                      <div className="w-20 h-20 bg-av-maroon-900/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
                        <Video className="w-10 h-10 text-av-maroon-900" />
                      </div>
                      <h2 className="text-3xl font-black text-av-maroon-900 mb-4 tracking-tight">AI Interview Prep</h2>
                      <p className="text-gray-500 mb-10 leading-relaxed font-medium">
                        Ready to practice? Our AI will simulate a real Software Engineering interview at a top tech company.
                      </p>
                      
                      <div className="space-y-4 mb-10 text-left bg-gray-50 p-6 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-3 text-sm font-semibold text-gray-700">
                          <CheckCircle2 className="w-4 h-4 text-av-success" />
                          <span>Role: Software Developer (CSE)</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm font-semibold text-gray-700">
                          <CheckCircle2 className="w-4 h-4 text-av-success" />
                          <span>Duration: ~15 Minutes</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm font-semibold text-gray-700">
                          <CheckCircle2 className="w-4 h-4 text-av-success" />
                          <span>Real-time AI Feedback</span>
                        </div>
                      </div>

                      <button 
                        onClick={startInterview}
                        disabled={isAILoading}
                        className="w-full av-btn av-btn-primary py-5 text-base flex items-center justify-center gap-3"
                      >
                        {isAILoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <PlayCircle className="w-5 h-5" />}
                        START MOCK INTERVIEW
                      </button>
                    </div>
                  </div>
                ) : (
                  <React.Fragment>
                    {/* Interview Header */}
                    <div className="bg-[#2D0A0A] rounded-2xl p-4 text-white flex justify-between items-center shadow-lg shrink-0">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => {
                        setIsInterviewActive(false);
                        setCurrentPage('dashboard');
                        if (videoRef.current?.srcObject) {
                          (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
                        }
                      }}
                      className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">OSMANIA UNIVERSITY ENGINEERING PORTAL</p>
                      <h2 className="text-lg font-bold">SDE-1 AI Mock Interview Session</h2>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="bg-white/5 text-white/80 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 border border-white/10">
                      <Mic className="w-4 h-4 text-green-400" />
                      Live Audio Active
                    </div>
                    <button 
                      onClick={endInterviewAndGenerateReport}
                      disabled={isAILoading}
                      className="bg-av-maroon-900 px-6 py-2 rounded-full text-xs font-bold hover:bg-av-maroon-800 transition-colors flex items-center gap-2 border border-white/20"
                    >
                      {isAILoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
                      Finish & Get Report
                    </button>
                    <button 
                      onClick={() => {
                        setIsInterviewActive(false);
                        setCurrentPage('dashboard');
                        if (videoRef.current?.srcObject) {
                          (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
                        }
                      }}
                      className="bg-white/10 px-4 py-2 rounded-full text-xs font-bold hover:bg-white/20 transition-colors flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[1fr_480px] gap-6 flex-1 min-h-0">
                  {/* Left Column: Video & Context */}
                  <div className="flex flex-col space-y-6 overflow-y-auto custom-scrollbar pr-2">
                    {/* Video Feed */}
                    <div className="aspect-video bg-[#1A1A1A] rounded-3xl overflow-hidden relative shadow-av-lg shrink-0 border-4 border-[#2D0A0A]">
                      <div className="absolute top-6 left-6 bg-black/40 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-[10px] font-bold z-10 flex items-center gap-2 border border-white/10">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div> LIVE INTERVIEW
                      </div>
                      
                      {/* AI Avatar Video */}
                      <video 
                        autoPlay 
                        loop 
                        muted 
                        playsInline
                        className="w-full h-full object-cover"
                        src="https://cdn.pixabay.com/video/2023/10/20/185805-876352062_large.mp4"
                      />
                      
                      {/* Candidate PiP (Real Camera) */}
                      <div className="absolute bottom-6 right-6 w-48 aspect-video rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black">
                        <video 
                          ref={videoRef}
                          autoPlay 
                          muted 
                          playsInline
                          className="w-full h-full object-cover scale-x-[-1]"
                        />
                      </div>

                      {/* AI Status Badge */}
                      <div className="absolute bottom-6 left-6 bg-white/95 backdrop-blur px-5 py-2.5 rounded-full flex items-center gap-3 shadow-2xl border border-white">
                        <div className="flex gap-1 items-center h-4">
                          {[1,2,3,4,5].map(i => (
                            <div key={i} className="w-0.5 bg-av-maroon-900 rounded-full animate-wave" style={{ height: `${20 + Math.random() * 80}%`, animationDelay: `${i * 0.1}s` }}></div>
                          ))}
                        </div>
                        <span className="text-[10px] font-black text-av-maroon-900 uppercase tracking-[0.2em]">
                          {isAILoading ? 'AI Thinking...' : 'AI Listening...'}
                        </span>
                      </div>
                    </div>

                    {/* Interview Context Accordion */}
                    <div className="bg-white rounded-3xl p-8 shadow-av-sm border border-gray-100">
                      <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-bold text-gray-900">Interview Context</h3>
                        <ChevronDown className="w-6 h-6 text-gray-400" />
                      </div>
                      
                      <div className="space-y-4">
                        {[
                          { icon: FileText, label: 'RESUME', value: 'Fathima_Resume_v2.pdf' },
                          { icon: Target, label: 'TARGET ROLE', value: 'Software Developer (CSE)' },
                          { icon: Globe, label: 'LANGUAGE', value: 'English (United States)' },
                          { icon: Cpu, label: 'AI MODEL', value: 'Google Gemini 3 Flash' },
                        ].map((ctx, i) => (
                          <div key={i} className="group">
                            <div className="flex items-center gap-3 mb-2">
                              <ctx.icon className="w-4 h-4 text-av-maroon-900" />
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{ctx.label}</span>
                            </div>
                            <div className="bg-[#F8F7F4] px-5 py-4 rounded-xl text-sm font-semibold text-gray-700 border border-gray-100 flex justify-between items-center group-hover:border-av-maroon-900/20 transition-colors">
                              {ctx.value}
                              <ChevronDown className="w-4 h-4 text-gray-300" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Question & Transcript */}
                  <div className="flex flex-col space-y-6 overflow-hidden">
                    {/* Live Transcript & Footer */}
                    <div className="bg-white rounded-[32px] shadow-av-lg border border-gray-100 flex flex-col flex-1 min-h-0 overflow-hidden">
                      <div className="p-8 border-bottom border-gray-50 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-bold text-gray-900">Live Transcript</h3>
                          <div className="flex items-center gap-1.5 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                            <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">ACTIVE</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                        {interviewMessages.map((msg, i) => (
                          <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse ml-auto' : ''} max-w-[85%]`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-lg ${msg.role === 'model' ? 'bg-[#4A0404] text-white' : 'bg-av-gold-500 text-white'}`}>
                              {msg.role === 'model' ? 'AI' : 'YOU'}
                            </div>
                            <div className={`space-y-2 ${msg.role === 'user' ? 'text-right' : ''}`}>
                              <div className={`p-5 rounded-3xl text-sm leading-relaxed border ${
                                msg.role === 'model' 
                                  ? 'bg-[#F8F7F4] rounded-tl-none text-gray-700 border-gray-100' 
                                  : 'bg-[#4A0404] rounded-tr-none text-white border-transparent shadow-xl'
                              }`}>
                                {msg.text}
                              </div>
                              <div className="text-[10px] text-gray-400 font-bold">
                                {msg.role === 'model' ? 'AI Interviewer' : 'You'} • {msg.timestamp}
                              </div>
                            </div>
                          </div>
                        ))}
                        {isAILoading && (
                          <div className="flex gap-4 max-w-[85%]">
                            <div className="w-10 h-10 rounded-full bg-[#4A0404] flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-lg">
                              AI
                            </div>
                            <div className="bg-[#F8F7F4] p-5 rounded-3xl rounded-tl-none text-sm leading-relaxed text-gray-700 border border-gray-100 italic">
                              Thinking...
                            </div>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>

                      {/* Footer Controls */}
                      <form onSubmit={handleSendMessage} className="p-8 bg-gray-50/50 border-t border-gray-100 flex gap-4 items-center shrink-0">
                        <div className="flex-1 relative">
                          <input 
                            type="text"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            placeholder="Type your answer here..."
                            className="w-full pl-6 pr-12 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-av-maroon-900/10 focus:border-av-maroon-900 outline-none transition-all font-medium"
                          />
                          <button 
                            type="submit"
                            disabled={!userInput.trim() || isAILoading}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-av-maroon-900 text-white rounded-xl flex items-center justify-center hover:bg-av-maroon-800 transition-all disabled:opacity-50"
                          >
                            <Send className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-6 px-4">
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ELAPSED</p>
                            <div className="flex items-center gap-2 text-gray-900 font-bold">
                              <Clock className="w-4 h-4 text-av-maroon-900" />
                              <span className="text-lg">{formatTime(timer)}</span>
                            </div>
                          </div>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </React.Fragment>
            )}
          </motion.div>
        )}

            {currentPage === 'resume' && (
              <motion.div 
                key="resume"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full flex flex-col space-y-8"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">AI Resume Editor</h1>
                    <p className="text-gray-500 text-sm">Optimize your profile for ATS and high-tier engineering roles.</p>
                  </div>
                  <div className="flex gap-3">
                    <button className="av-btn av-btn-secondary">Discard</button>
                    <button className="av-btn av-btn-primary shadow-lg shadow-av-maroon-900/20">Save Changes</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[480px_1fr] gap-8 flex-1 min-h-0">
                  {/* Form Column */}
                  <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="av-card">
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2 font-bold text-av-maroon-900">
                          <ShieldCheck className="w-5 h-5" /> Personal Information
                        </div>
                        <span className="bg-av-gold-500/10 text-av-gold-500 text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">🔒 University Locked</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Full Name</label>
                          <input disabled value={resumeData.name} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 cursor-not-allowed" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">College Email</label>
                          <input disabled value={resumeData.email} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 cursor-not-allowed" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Phone</label>
                          <input 
                            value={resumeData.phone} 
                            onChange={(e) => setResumeData({...resumeData, phone: e.target.value})}
                            className="w-full p-3 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-av-maroon-900/10 focus:border-av-maroon-900 outline-none transition-all" 
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Location</label>
                          <input 
                            value={resumeData.location} 
                            onChange={(e) => setResumeData({...resumeData, location: e.target.value})}
                            className="w-full p-3 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-av-maroon-900/10 focus:border-av-maroon-900 outline-none transition-all" 
                          />
                        </div>
                      </div>
                    </div>

                    <div className="av-card">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-av-maroon-900">Professional Summary</h3>
                        <button className="text-av-gold-500 text-xs font-bold flex items-center gap-1 hover:underline">
                          <Sparkles className="w-3 h-3" /> IMPROVE WITH AI
                        </button>
                      </div>
                      <textarea 
                        rows={5}
                        value={resumeData.summary}
                        onChange={(e) => setResumeData({...resumeData, summary: e.target.value})}
                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm leading-relaxed focus:bg-white focus:ring-2 focus:ring-av-maroon-900/10 focus:border-av-maroon-900 outline-none transition-all resize-none"
                      />
                      <div className="mt-2 text-[10px] text-gray-400 font-bold uppercase text-right">{resumeData.summary.length} / 500 characters</div>
                    </div>

                    <div className="av-card">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-av-maroon-900">Technical Skills</h3>
                        <button 
                          onClick={() => setResumeData({
                            ...resumeData,
                            skills: { ...resumeData.skills, [`newSkill${Object.keys(resumeData.skills).length}`]: '' }
                          })}
                          className="bg-gray-100 p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          <Plus className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                      <div className="space-y-4">
                        {Object.entries(resumeData.skills).map(([key, val]) => (
                          <div key={key} className="space-y-1">
                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
                            <input 
                              value={val} 
                              onChange={(e) => setResumeData({
                                ...resumeData, 
                                skills: { ...resumeData.skills, [key]: e.target.value }
                              })}
                              className="w-full p-3 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-av-maroon-900/10 focus:border-av-maroon-900 outline-none transition-all" 
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Professional Experience */}
                    <div className="av-card">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-av-maroon-900">Professional Experience</h3>
                        <button 
                          onClick={() => setResumeData({
                            ...resumeData,
                            experience: [...resumeData.experience, { role: '', company: '', duration: '', desc: '' }]
                          })}
                          className="bg-gray-100 p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          <Plus className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                      <div className="space-y-6">
                        {resumeData.experience.map((exp, i) => (
                          <div key={i} className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-100 relative group">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Company</label>
                                <input 
                                  value={exp.company} 
                                  onChange={(e) => {
                                    const newExp = [...resumeData.experience];
                                    newExp[i].company = e.target.value;
                                    setResumeData({...resumeData, experience: newExp});
                                  }}
                                  className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm outline-none" 
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Role</label>
                                <input 
                                  value={exp.role} 
                                  onChange={(e) => {
                                    const newExp = [...resumeData.experience];
                                    newExp[i].role = e.target.value;
                                    setResumeData({...resumeData, experience: newExp});
                                  }}
                                  className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm outline-none" 
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Duration</label>
                              <input 
                                value={exp.duration} 
                                onChange={(e) => {
                                  const newExp = [...resumeData.experience];
                                  newExp[i].duration = e.target.value;
                                  setResumeData({...resumeData, experience: newExp});
                                }}
                                className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm outline-none" 
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Achievements</label>
                              <textarea 
                                rows={3}
                                value={exp.desc}
                                onChange={(e) => {
                                  const newExp = [...resumeData.experience];
                                  newExp[i].desc = e.target.value;
                                  setResumeData({...resumeData, experience: newExp});
                                }}
                                className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm outline-none resize-none" 
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Projects */}
                    <div className="av-card">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-av-maroon-900">Projects</h3>
                        <button 
                          onClick={() => setResumeData({
                            ...resumeData,
                            projects: [...resumeData.projects, { title: '', tech: '', desc: '' }]
                          })}
                          className="bg-gray-100 p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          <Plus className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                      <div className="space-y-6">
                        {resumeData.projects.map((proj, i) => (
                          <div key={i} className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Title</label>
                                <input 
                                  value={proj.title} 
                                  onChange={(e) => {
                                    const newProj = [...resumeData.projects];
                                    newProj[i].title = e.target.value;
                                    setResumeData({...resumeData, projects: newProj});
                                  }}
                                  className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm outline-none" 
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Tech Stack</label>
                                <input 
                                  value={proj.tech} 
                                  onChange={(e) => {
                                    const newProj = [...resumeData.projects];
                                    newProj[i].tech = e.target.value;
                                    setResumeData({...resumeData, projects: newProj});
                                  }}
                                  className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm outline-none" 
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Description</label>
                              <textarea 
                                rows={3}
                                value={proj.desc}
                                onChange={(e) => {
                                  const newProj = [...resumeData.projects];
                                  newProj[i].desc = e.target.value;
                                  setResumeData({...resumeData, projects: newProj});
                                }}
                                className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm outline-none resize-none" 
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Certifications */}
                    <div className="av-card">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-av-maroon-900">Certifications</h3>
                        <button 
                          onClick={() => setResumeData({
                            ...resumeData,
                            certifications: [...resumeData.certifications, { title: '', date: '', issuer: '' }]
                          })}
                          className="bg-gray-100 p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          <Plus className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                      <div className="space-y-4">
                        {resumeData.certifications.map((cert, i) => (
                          <div key={i} className="grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="col-span-2 space-y-1">
                              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Certificate Name</label>
                              <input 
                                value={cert.title} 
                                onChange={(e) => {
                                  const newCert = [...resumeData.certifications];
                                  newCert[i].title = e.target.value;
                                  setResumeData({...resumeData, certifications: newCert});
                                }}
                                className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm outline-none" 
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Date</label>
                              <input 
                                value={cert.date} 
                                onChange={(e) => {
                                  const newCert = [...resumeData.certifications];
                                  newCert[i].date = e.target.value;
                                  setResumeData({...resumeData, certifications: newCert});
                                }}
                                className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm outline-none" 
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Awards */}
                    <div className="av-card">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-av-maroon-900">Awards & Honors</h3>
                        <button 
                          onClick={() => setResumeData({
                            ...resumeData,
                            awards: [...resumeData.awards, { title: '', date: '', desc: '' }]
                          })}
                          className="bg-gray-100 p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          <Plus className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                      <div className="space-y-4">
                        {resumeData.awards.map((award, i) => (
                          <div key={i} className="space-y-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="flex justify-between gap-4">
                              <div className="flex-1 space-y-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Award Title</label>
                                <input 
                                  value={award.title} 
                                  onChange={(e) => {
                                    const newAwards = [...resumeData.awards];
                                    newAwards[i].title = e.target.value;
                                    setResumeData({...resumeData, awards: newAwards});
                                  }}
                                  className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm outline-none" 
                                />
                              </div>
                              <div className="w-24 space-y-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Date</label>
                                <input 
                                  value={award.date} 
                                  onChange={(e) => {
                                    const newAwards = [...resumeData.awards];
                                    newAwards[i].date = e.target.value;
                                    setResumeData({...resumeData, awards: newAwards});
                                  }}
                                  className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm outline-none" 
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Preview Column */}
                  <div className="flex flex-col space-y-6 overflow-hidden">
                    <div className="av-card flex items-center justify-between py-4 shrink-0">
                      <div className="flex items-center gap-6">
                        <div className="relative w-16 h-16">
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="16" fill="none" stroke="#F1F0EC" strokeWidth="3" />
                            <circle cx="18" cy="18" r="16" fill="none" stroke="#B28C32" strokeWidth="3" strokeDasharray="100" strokeDashoffset="12" strokeLinecap="round" />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center text-sm font-black text-av-maroon-900">88%</div>
                        </div>
                        <div>
                          <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">ATS Match Score</div>
                          <div className="text-sm font-bold text-gray-900">Optimized for Junior SDE Roles</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setZoomLevel(prev => Math.min(prev + 0.1, 1.5))} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"><Search className="w-4 h-4 text-gray-600" /></button>
                        <button onClick={() => setZoomLevel(1)} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-[10px] font-bold">100%</button>
                        <button className="p-2 bg-av-maroon-900 text-white rounded-lg hover:bg-av-maroon-800 transition-colors"><Download className="w-4 h-4" /></button>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-av-lg border border-gray-200 overflow-y-auto flex-1 custom-scrollbar">
                      <div 
                        className="p-12 origin-top transition-transform duration-300"
                        style={{ transform: `scale(${zoomLevel})` }}
                      >
                        <div className="border-b-2 border-av-maroon-900 pb-5 mb-8">
                          <h1 className="text-4xl font-black text-av-maroon-900 tracking-tight mb-2 uppercase">{resumeData.name}</h1>
                          <div className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-4">{resumeData.degree}</div>
                          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-500 font-medium">
                            <span className="flex items-center gap-1.5"><Bell className="w-3 h-3" /> {resumeData.email}</span>
                            <span className="flex items-center gap-1.5"><Mic className="w-3 h-3" /> {resumeData.phone}</span>
                            <span className="flex items-center gap-1.5"><Map className="w-3 h-3" /> {resumeData.location}</span>
                          </div>
                        </div>

                        <section className="mb-8">
                          <h2 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em] border-b border-gray-100 pb-2 mb-4">Professional Summary</h2>
                          <p className="text-xs text-gray-600 leading-relaxed">{resumeData.summary}</p>
                        </section>

                        <section className="mb-8">
                          <h2 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em] border-b border-gray-100 pb-2 mb-4">Education</h2>
                          <div className="space-y-4">
                            <div>
                              <div className="flex justify-between items-baseline mb-1">
                                <h3 className="text-sm font-bold text-gray-900">Osmania University, University College of Engineering</h3>
                                <span className="text-[10px] font-bold text-gray-400">2022 - 2026</span>
                              </div>
                              <div className="text-[11px] font-semibold text-gray-500 italic">{resumeData.degree} | {resumeData.cgpa}</div>
                            </div>
                          </div>
                        </section>

                        <section className="mb-8">
                          <h2 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em] border-b border-gray-100 pb-2 mb-4">Technical Skills</h2>
                          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                            {Object.entries(resumeData.skills).map(([key, val]) => (
                              <div key={key}>
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">{key}</div>
                                <div className="flex flex-wrap gap-1.5">
                                  {(val as string).split(',').map(s => (
                                    <span key={s} className="bg-gray-50 px-2 py-0.5 rounded text-[10px] text-gray-700 font-medium">{s.trim()}</span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>

                        <section className="mb-8">
                          <h2 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em] border-b border-gray-100 pb-2 mb-4">Professional Experience</h2>
                          <div className="space-y-6">
                            {resumeData.experience.map((exp, i) => (
                              <div key={i}>
                                <div className="flex justify-between items-baseline mb-1">
                                  <h3 className="text-sm font-bold text-gray-900">{exp.role}</h3>
                                  <span className="text-[10px] font-bold text-gray-400 uppercase">{exp.duration}</span>
                                </div>
                                <div className="text-[11px] font-bold text-av-maroon-900 mb-2">{exp.company}</div>
                                <ul className="list-disc list-outside ml-4 space-y-1">
                                  {exp.desc.split(';').map((point, pi) => (
                                    <li key={pi} className="text-[11px] text-gray-600 leading-relaxed">{point.trim()}</li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </section>

                        <section className="mb-8">
                          <h2 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em] border-b border-gray-100 pb-2 mb-4">Key Projects</h2>
                          <div className="space-y-6">
                            {resumeData.projects.map((proj, i) => (
                              <div key={i}>
                                <div className="flex justify-between items-baseline mb-1">
                                  <h3 className="text-sm font-bold text-gray-900">{proj.title}</h3>
                                  <span className="text-[10px] font-bold text-av-gold-600 uppercase tracking-widest">{proj.tech}</span>
                                </div>
                                <p className="text-[11px] text-gray-600 leading-relaxed">{proj.desc}</p>
                              </div>
                            ))}
                          </div>
                        </section>

                        <div className="grid grid-cols-2 gap-8">
                          <section>
                            <h2 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em] border-b border-gray-100 pb-2 mb-4">Certifications</h2>
                            <div className="space-y-3">
                              {resumeData.certifications.map((cert, i) => (
                                <div key={i}>
                                  <div className="text-[11px] font-bold text-gray-900">{cert.title}</div>
                                  <div className="text-[10px] text-gray-500">{cert.issuer} · {cert.date}</div>
                                </div>
                              ))}
                            </div>
                          </section>
                          <section>
                            <h2 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em] border-b border-gray-100 pb-2 mb-4">Awards & Honors</h2>
                            <div className="space-y-3">
                              {resumeData.awards.map((award, i) => (
                                <div key={i}>
                                  <div className="text-[11px] font-bold text-gray-900">{award.title}</div>
                                  <div className="text-[10px] text-gray-500">{award.date}</div>
                                </div>
                              ))}
                            </div>
                          </section>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {currentPage === 'analytics' && (
              <motion.div 
                key="analytics"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="text-3xl font-black text-av-maroon-900 tracking-tight">MY ANALYTICS</h2>
                    <p className="text-gray-500 font-medium">Performance insights and interview history</p>
                  </div>
                  <div className="flex gap-3">
                    <button className="av-btn av-btn-secondary flex items-center gap-2">
                      <Download className="w-4 h-4" /> EXPORT REPORT
                    </button>
                    <button className="av-btn av-btn-primary flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" /> IMPROVEMENT PLAN
                    </button>
                  </div>
                </div>

                {/* Score Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {[
                    { label: 'OVERALL SCORE', value: '84/100', trend: '+5%', icon: Award, color: 'text-av-maroon-900', bg: 'bg-av-maroon-900/5' },
                    { label: 'TECHNICAL SKILLS', value: '88%', trend: '+12%', icon: Terminal, color: 'text-av-gold-600', bg: 'bg-av-gold-500/10' },
                    { label: 'COMMUNICATION', value: '76%', trend: '-2%', icon: Mic, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'CONFIDENCE', value: '92%', trend: '+8%', icon: Sparkles, color: 'text-av-success', bg: 'bg-av-success/10' },
                  ].map((stat, i) => (
                    <div key={i} className="av-card p-6 flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center shrink-0`}>
                        <stat.icon className={`w-6 h-6 ${stat.color}`} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-black text-gray-900">{stat.value}</span>
                          <span className={`text-[10px] font-bold ${stat.trend.startsWith('+') ? 'text-av-success' : 'text-av-error'}`}>{stat.trend}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Skill Analysis */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="av-card p-8">
                      <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-bold text-gray-900">Skill Breakdown</h3>
                        <div className="flex gap-2">
                          <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                            <div className="w-2 h-2 rounded-full bg-av-maroon-900"></div> CURRENT
                          </span>
                          <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                            <div className="w-2 h-2 rounded-full bg-gray-200"></div> TARGET
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-6">
                        {[
                          { skill: 'Data Structures', score: 92, target: 95 },
                          { skill: 'System Design', score: 78, target: 90 },
                          { skill: 'Problem Solving', score: 85, target: 95 },
                          { skill: 'Behavioral', score: 72, target: 85 },
                          { skill: 'Cloud Architecture', score: 65, target: 80 },
                        ].map((skill, i) => (
                          <div key={i} className="space-y-2">
                            <div className="flex justify-between text-xs font-bold">
                              <span className="text-gray-700 uppercase tracking-wider">{skill.skill}</span>
                              <span className="text-av-maroon-900">{skill.score}%</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden relative">
                              <div 
                                className="absolute top-0 left-0 h-full bg-gray-200 rounded-full transition-all duration-1000"
                                style={{ width: `${skill.target}%` }}
                              ></div>
                              <div 
                                className="absolute top-0 left-0 h-full bg-av-maroon-900 rounded-full transition-all duration-1000 shadow-lg"
                                style={{ width: `${skill.score}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Interview History */}
                    <div className="av-card p-0 overflow-hidden">
                      <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="text-xl font-bold text-gray-900">Interview History</h3>
                        <button className="text-av-maroon-900 text-xs font-bold hover:underline">VIEW ALL</button>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {[
                          { role: 'SDE-1 Mock Interview', date: 'Mar 12, 2026', score: 84, duration: '45m', status: 'Completed', recording: true },
                          { role: 'Backend Intern Practice', date: 'Mar 08, 2026', score: 72, duration: '30m', status: 'Completed', recording: true },
                          { role: 'Frontend Engineer Mock', date: 'Feb 28, 2026', score: 91, duration: '50m', status: 'Completed', recording: true },
                          { role: 'Full Stack Challenge', date: 'Feb 15, 2026', score: 65, duration: '40m', status: 'Needs Improvement', recording: false },
                        ].map((interview, i) => (
                          <div key={i} className="p-6 hover:bg-gray-50 transition-colors flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${interview.score >= 80 ? 'bg-av-success/10 text-av-success' : 'bg-av-warning/10 text-av-warning'}`}>
                                <History className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-gray-900">{interview.role}</h4>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{interview.date} · {interview.duration}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <div className="text-sm font-black text-av-maroon-900">{interview.score}/100</div>
                                <div className={`text-[9px] font-bold uppercase tracking-tighter ${interview.score >= 80 ? 'text-av-success' : 'text-av-warning'}`}>{interview.status}</div>
                              </div>
                              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {interview.recording && (
                                  <button className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 text-gray-400 hover:text-av-maroon-900 transition-all shadow-sm">
                                    <PlayCircle className="w-4 h-4" />
                                  </button>
                                )}
                                <button className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 text-gray-400 hover:text-av-maroon-900 transition-all shadow-sm">
                                  <Download className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* AI Insights Sidebar */}
                  <div className="space-y-6">
                    <div className="bg-av-maroon-900 rounded-[32px] p-8 text-white shadow-av-lg relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                      <div className="flex items-center gap-3 mb-6 relative z-10">
                        <Sparkles className="w-5 h-5 text-av-gold-500" />
                        <h3 className="text-lg font-bold tracking-tight">AI Insights</h3>
                      </div>
                      <div className="space-y-6 relative z-10">
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">TOP STRENGTH</p>
                          <p className="text-sm font-medium leading-relaxed">Your understanding of <span className="text-av-gold-500">Big O notation</span> and data structure trade-offs is exceptional. You consistently choose optimal algorithms.</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">CRITICAL GAP</p>
                          <p className="text-sm font-medium leading-relaxed">You tend to rush into coding before fully clarifying <span className="text-av-gold-500">edge cases</span>. Try to spend 2 more minutes in the planning phase.</p>
                        </div>
                        <div className="pt-4">
                          <button className="w-full bg-white text-av-maroon-900 py-3 rounded-xl text-xs font-bold hover:bg-av-gold-500 hover:text-white transition-all">
                            VIEW FULL ANALYSIS
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="av-card p-8">
                      <h3 className="text-lg font-bold text-gray-900 mb-6">Recent Badges</h3>
                      <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="aspect-square rounded-2xl bg-gray-50 border border-gray-100 flex flex-col items-center justify-center p-2 text-center group cursor-pointer hover:border-av-gold-500 transition-all">
                            <Award className="w-6 h-6 text-av-gold-500 mb-1 group-hover:scale-110 transition-transform" />
                            <span className="text-[8px] font-bold text-gray-400 uppercase leading-tight">Fast Coder</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {currentPage === 'notifications' && (
              <motion.div 
                key="notifications"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-4xl mx-auto w-full"
              >
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 bg-av-gold-500 rounded-full animate-pulse"></span>
                      <span className="text-[10px] font-black text-av-gold-500 uppercase tracking-[0.3em]">Live Updates</span>
                    </div>
                    <h2 className="text-4xl font-black text-av-maroon-900 tracking-tight">Notifications</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="text-[10px] font-bold text-gray-400 hover:text-av-maroon-900 transition-colors uppercase tracking-widest border-b border-transparent hover:border-av-maroon-900 pb-1">Mark all as read</button>
                    <button 
                      onClick={() => setCurrentPage('settings')}
                      className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">
                  {/* Categories */}
                  <div className="space-y-1">
                    {[
                      { id: 'all', label: 'All Notifications', count: 8 },
                      { id: 'jobs', label: 'Job Matches', count: 3 },
                      { id: 'interviews', label: 'Interviews', count: 2 },
                      { id: 'campus', label: 'Campus News', count: 2 },
                      { id: 'ai', label: 'AI Insights', count: 1 },
                    ].map((cat) => (
                      <button 
                        key={cat.id}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                          cat.id === 'all' 
                            ? 'bg-av-maroon-900 text-white shadow-lg shadow-av-maroon-900/20' 
                            : 'text-gray-500 hover:bg-white hover:text-av-maroon-900'
                        }`}
                      >
                        {cat.label}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${cat.id === 'all' ? 'bg-white/20' : 'bg-gray-100'}`}>{cat.count}</span>
                      </button>
                    ))}
                  </div>

                  {/* List */}
                  <div className="space-y-4">
                    {[
                      { 
                        id: 1,
                        title: 'New Job Match: Senior Frontend Engineer', 
                        desc: 'Mindtree Systems posted a new position matching 94% of your skills. They are looking for expertise in React and Tailwind CSS.', 
                        time: '2h ago', 
                        type: 'job', 
                        unread: true,
                        action: 'View Job'
                      },
                      { 
                        id: 2,
                        title: 'Technical Interview Analyzed', 
                        desc: 'Your mock interview for "Backend Intern" has been processed. You showed strong communication but could improve on System Design.', 
                        time: '5h ago', 
                        type: 'interview', 
                        unread: true,
                        action: 'Review Feedback'
                      },
                      { 
                        id: 3,
                        title: 'Mega Placement Drive 2026', 
                        desc: 'Osmania University is hosting 50+ companies including Google, Microsoft, and Amazon on March 20th. Registration mandatory.', 
                        time: '1d ago', 
                        type: 'campus', 
                        unread: false,
                        action: 'Register Now'
                      },
                      { 
                        id: 4,
                        title: 'Skill Gap Detected', 
                        desc: 'AI suggests adding "Kubernetes" to your learning path based on 15 new job postings in your preferred locations.', 
                        time: '2d ago', 
                        type: 'ai', 
                        unread: false,
                        action: 'Add to Path'
                      },
                      { 
                        id: 5,
                        title: 'Profile Viewed by Recruiter', 
                        desc: 'A recruiter from Goldman Sachs viewed your profile and downloaded your AI-generated resume.', 
                        time: '3d ago', 
                        type: 'job', 
                        unread: false,
                        action: 'View Profile Stats'
                      },
                    ].map((notif) => (
                      <div 
                        key={notif.id} 
                        className={`group p-6 rounded-2xl border transition-all hover:shadow-xl hover:-translate-y-1 bg-white ${
                          notif.unread ? 'border-av-maroon-900/20 ring-1 ring-av-maroon-900/5' : 'border-gray-100'
                        }`}
                      >
                        <div className="flex items-start gap-5">
                          <div className={`w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center transition-transform group-hover:scale-110 ${
                            notif.unread ? 'bg-av-maroon-900 text-white shadow-lg shadow-av-maroon-900/20' : 'bg-gray-50 text-gray-400'
                          }`}>
                            {notif.type === 'job' && <Briefcase className="w-6 h-6" />}
                            {notif.type === 'interview' && <Video className="w-6 h-6" />}
                            {notif.type === 'campus' && <Globe className="w-6 h-6" />}
                            {notif.type === 'ai' && <Sparkles className="w-6 h-6" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className={`text-base font-black tracking-tight mb-1 ${notif.unread ? 'text-av-maroon-900' : 'text-gray-900'}`}>
                                  {notif.title}
                                </h4>
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-bold text-av-gold-500 uppercase tracking-widest">{notif.type}</span>
                                  <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{notif.time}</span>
                                </div>
                              </div>
                              {notif.unread && <span className="w-2 h-2 bg-av-maroon-900 rounded-full"></span>}
                            </div>
                            <p className="text-sm text-gray-500 leading-relaxed mb-4">{notif.desc}</p>
                            <div className="flex items-center gap-4">
                              <button className="text-[11px] font-black text-av-maroon-900 uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all">
                                {notif.action} <ArrowRight className="w-3 h-3" />
                              </button>
                              {!notif.unread && (
                                <button className="text-[11px] font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors">
                                  Archive
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
            {currentPage === 'jobs' && (
              <motion.div 
                key="jobs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col lg:flex-row gap-8"
              >
                <aside className="w-full lg:w-64 space-y-6 shrink-0">
                  <div className="av-card p-6">
                    <h4 className="font-bold text-av-maroon-900 mb-6 uppercase tracking-widest text-[10px]">Filter Positions</h4>
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Job Type</h5>
                        <div className="space-y-2">
                          {['Internship', 'Full-Time', 'Contract'].map(type => (
                            <label key={type} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                              <input type="checkbox" className="w-4 h-4 accent-av-maroon-900" defaultChecked={type === 'Internship'} />
                              {type}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Salary (LPA)</h5>
                        <input type="range" className="w-full accent-av-maroon-900" min="5" max="50" />
                        <div className="flex justify-between text-[10px] font-bold text-gray-400">
                          <span>5 LPA</span>
                          <span>50 LPA+</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </aside>

                <div className="flex-1 space-y-6">
                  <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex gap-1">
                      <button 
                        onClick={() => setJobSource('college')}
                        className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${jobSource === 'college' ? 'bg-av-maroon-900 text-white shadow-lg shadow-av-maroon-900/20' : 'text-gray-500 hover:bg-gray-50'}`}
                      >
                        <ShieldCheck className="w-4 h-4" />
                        College Placements
                      </button>
                      <button 
                        onClick={() => setJobSource('web')}
                        className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${jobSource === 'web' ? 'bg-av-maroon-900 text-white shadow-lg shadow-av-maroon-900/20' : 'text-gray-500 hover:bg-gray-50'}`}
                      >
                        <Globe className="w-4 h-4" />
                        Web Scraped Jobs
                      </button>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      <Sparkles className="w-3 h-3 text-av-gold-500" />
                      AI Powered Matching
                    </div>
                  </div>

                  <div className="space-y-4">
                    {(jobSource === 'college' ? [
                      { title: 'Software Development Engineer - I', company: 'Mindtree Systems', loc: 'Hyderabad', salary: '12 - 18 LPA', match: '95%', tags: ['Java', 'Spring Boot', 'AWS'], type: 'On-Campus' },
                      { title: 'Backend Engineering Intern', company: 'Emphasis IT Solutions', loc: 'Remote', salary: '45k/mo Stipend', match: '92%', tags: ['Node.js', 'PostgreSQL', 'Redis'], type: 'On-Campus' },
                      { title: 'Full Stack Developer Trainee', company: 'InnovateLabs', loc: 'Bangalore', salary: '8 - 12 LPA', match: '88%', tags: ['React', 'Node', 'Docker'], type: 'Direct Placement' },
                    ] : [
                      { title: 'Junior Frontend Developer', company: 'GlobalTech Inc', loc: 'Pune', salary: '10 - 15 LPA', match: '85%', tags: ['React', 'TypeScript', 'Tailwind'], type: 'LinkedIn Scraped' },
                      { title: 'Python Developer (Fresher)', company: 'DataFlow Systems', loc: 'Mumbai', salary: '7 - 10 LPA', match: '82%', tags: ['Python', 'Django', 'PostgreSQL'], type: 'Indeed Scraped' },
                      { title: 'Cloud Support Engineer', company: 'CloudScale', loc: 'Remote', salary: '9 - 14 LPA', match: '78%', tags: ['AWS', 'Linux', 'Networking'], type: 'Naukri Scraped' },
                    ]).map((job, i) => (
                      <div key={i} className="av-card group hover:border-av-maroon-900/30 transition-all">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-xl font-bold text-gray-900 group-hover:text-av-maroon-900 transition-colors">{job.title}</h4>
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-500 uppercase tracking-tighter">{job.type}</span>
                            </div>
                            <p className="text-sm text-gray-500 font-medium">{job.company} · {job.loc}</p>
                          </div>
                          <span className="bg-av-gold-500/10 text-av-gold-500 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest">AI MATCH {job.match}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-6">
                          {job.tags.map(tag => (
                            <span key={tag} className="bg-[#F1F0EC] px-3 py-1 rounded-full text-[10px] font-bold text-gray-600">{tag}</span>
                          ))}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-black text-av-maroon-900">{job.salary}</span>
                          <div className="flex gap-2">
                            <button className="av-btn av-btn-secondary px-4 text-[10px]">VIEW DETAILS</button>
                            <button 
                              onClick={() => setSelectedJob(job)}
                              className="av-btn av-btn-primary px-4 text-[10px] flex items-center gap-1.5"
                            >
                              <Zap className="w-3 h-3" /> PRACTICE MOCKUP
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {currentPage === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="av-card max-w-4xl mx-auto"
              >
                <h2 className="text-2xl font-bold text-av-maroon-900 mb-8">Account Settings</h2>
                <div className="flex flex-col md:flex-row gap-10">
                  <nav className="w-full md:w-56 space-y-1">
                    {[
                      { id: 'personal', label: 'Personal Info', icon: <IdCard className="w-4 h-4" /> },
                      { id: 'security', label: 'Security', icon: <ShieldCheck className="w-4 h-4" /> },
                      { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
                    ].map(tab => (
                      <button 
                        key={tab.id} 
                        onClick={() => setSettingsTab(tab.id as any)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${settingsTab === tab.id ? 'bg-av-maroon-900/5 text-av-maroon-900' : 'text-gray-500 hover:bg-gray-50'}`}
                      >
                        {tab.icon}
                        {tab.label}
                      </button>
                    ))}
                  </nav>
                  
                  <div className="flex-1">
                    {settingsTab === 'personal' && (
                      <div className="space-y-8">
                        <div className="flex items-center gap-6">
                          <div className="relative group">
                            <img src="https://i.pravatar.cc/150?img=5" className="w-24 h-24 rounded-full border-4 border-av-gold-500" referrerPolicy="no-referrer" />
                            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                              <Eye className="text-white w-6 h-6" />
                            </div>
                          </div>
                          <div>
                            <h3 className="text-xl font-bold">{resumeData.name}</h3>
                            <p className="text-sm text-gray-500">2024CS102 · BE Computer Science</p>
                            <span className="mt-2 inline-flex items-center gap-1.5 bg-av-success/10 text-av-success px-3 py-1 rounded-full text-[10px] font-bold">
                              <ShieldCheck className="w-3 h-3" /> PROFILE VERIFIED
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          {[
                            { label: 'Full Name', val: resumeData.name },
                            { label: 'Email', val: resumeData.email },
                            { label: 'Phone', val: resumeData.phone },
                            { label: 'Location', val: resumeData.location },
                          ].map((field, i) => (
                            <div key={i} className="space-y-1.5">
                              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{field.label}</label>
                              <input defaultValue={field.val} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-av-maroon-900/10 focus:border-av-maroon-900 outline-none transition-all" />
                            </div>
                          ))}
                        </div>

                        <button className="av-btn av-btn-primary px-10">SAVE CHANGES</button>
                      </div>
                    )}

                    {settingsTab === 'security' && (
                      <div className="space-y-8">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 mb-4">Password & Authentication</h3>
                          <div className="space-y-4 max-w-md">
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Current Password</label>
                              <input type="password" placeholder="••••••••" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-av-maroon-900/10 focus:border-av-maroon-900 outline-none transition-all" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">New Password</label>
                                <input type="password" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-av-maroon-900/10 focus:border-av-maroon-900 outline-none transition-all" />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Confirm New</label>
                                <input type="password" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-av-maroon-900/10 focus:border-av-maroon-900 outline-none transition-all" />
                              </div>
                            </div>
                            <button className="av-btn av-btn-primary">Update Password</button>
                          </div>
                        </div>

                        <div className="pt-8 border-t border-gray-100">
                          <h3 className="text-lg font-bold text-gray-900 mb-4">Two-Factor Authentication</h3>
                          <div className="space-y-4">
                            {[
                              { label: 'Authenticator App', desc: 'Use an app like Google Authenticator', active: true },
                              { label: 'SMS Verification', desc: 'Receive a code via text message', active: false },
                            ].map((item, i) => (
                              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                <div>
                                  <div className="text-sm font-bold text-gray-900">{item.label}</div>
                                  <div className="text-xs text-gray-500">{item.desc}</div>
                                </div>
                                <button className={`w-12 h-6 rounded-full relative transition-colors ${item.active ? 'bg-av-maroon-900' : 'bg-gray-300'}`}>
                                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${item.active ? 'left-7' : 'left-1'}`}></div>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {settingsTab === 'notifications' && (
                      <div className="space-y-8">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 mb-4">Notification Preferences</h3>
                          <p className="text-sm text-gray-500 mb-6">Choose how you want to be notified about career opportunities and campus updates.</p>
                          
                          <div className="space-y-2">
                            {[
                              { label: 'Job Alerts', desc: 'New positions matching your profile', active: true },
                              { label: 'Campus Events', desc: 'Placement drives and workshops', active: true },
                              { label: 'Academic Updates', desc: 'University notices and results', active: false },
                              { label: 'Recruiter Messages', desc: 'Direct messages from hiring managers', active: true },
                            ].map((item, i) => (
                              <div key={i} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
                                <div>
                                  <div className="text-sm font-bold text-gray-900">{item.label}</div>
                                  <div className="text-xs text-gray-500">{item.desc}</div>
                                </div>
                                <button className={`w-12 h-6 rounded-full relative transition-colors ${item.active ? 'bg-av-maroon-900' : 'bg-gray-300'}`}>
                                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${item.active ? 'left-7' : 'left-1'}`}></div>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                        <button className="av-btn av-btn-primary px-10">SAVE PREFERENCES</button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Job Detail Modal */}
      <AnimatePresence>
        {selectedJob && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedJob(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-5xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-8 border-b border-gray-100 flex justify-between items-start shrink-0">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center text-white font-black text-xl">
                    {selectedJob.company.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">{selectedJob.title}</h2>
                    <p className="text-gray-500 font-medium">{selectedJob.company} • {selectedJob.loc}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedJob(null)}
                  className="px-6 py-2 rounded-full border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10">
                  <div className="space-y-10">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mb-3 shadow-sm">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Salary</p>
                        <p className="text-sm font-black text-gray-900">{selectedJob.salary}</p>
                      </div>
                      <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mb-3 shadow-sm">
                          <Briefcase className="w-4 h-4 text-gray-400" />
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Experience</p>
                        <p className="text-sm font-black text-gray-900">0-2 Years</p>
                      </div>
                      <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mb-3 shadow-sm">
                          <MapPin className="w-4 h-4 text-gray-400" />
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Location</p>
                        <p className="text-sm font-black text-gray-900">Hybrid</p>
                      </div>
                    </div>

                    {/* About The Role */}
                    <div className="av-card p-8 border-gray-100">
                      <div className="flex items-center gap-3 mb-6">
                        <FileText className="w-5 h-5 text-av-maroon-900" />
                        <h3 className="text-xl font-bold text-gray-900">About The Role</h3>
                      </div>
                      <div className="space-y-6 text-gray-600 leading-relaxed">
                        <p>We are looking for a talented {selectedJob.title} to join our team. You will be responsible for designing, developing, and maintaining scalable solutions that power millions of users globally.</p>
                        
                        <div>
                          <h4 className="font-bold text-gray-900 mb-3">Key Responsibilities:</h4>
                          <ul className="space-y-3 list-disc pl-5">
                            <li>Design and implement RESTful APIs using modern frameworks.</li>
                            <li>Collaborate with cross-functional teams to define and ship new features.</li>
                            <li>Optimize applications for maximum speed and scalability.</li>
                            <li>Participate in code reviews and mentor junior developers.</li>
                            <li>Maintain high standards of software quality through testing and automation.</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Requirements */}
                    <div className="av-card p-8 border-gray-100">
                      <div className="flex items-center gap-3 mb-6">
                        <LayoutDashboard className="w-5 h-5 text-av-maroon-900" />
                        <h3 className="text-xl font-bold text-gray-900">Requirements</h3>
                      </div>
                      
                      <div className="space-y-8">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Must Have Skills</p>
                          <div className="flex flex-wrap gap-2">
                            {['Data Structures', 'Algorithms', 'C++ / Java', 'CGPA > 8.0', 'System Design'].map(skill => (
                              <span key={skill} className="bg-gray-100 px-4 py-2 rounded-full text-xs font-bold text-gray-700">{skill}</span>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Good To Have</p>
                          <div className="flex flex-wrap gap-2">
                            {['Kubernetes', 'Docker', 'Open Source Contributor'].map(skill => (
                              <span key={skill} className="bg-gray-100 px-4 py-2 rounded-full text-xs font-bold text-gray-500">{skill}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sidebar */}
                  <div className="space-y-8">
                    <div className="text-center py-6">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-8">AI Eligibility Score</p>
                      <div className="relative inline-flex items-center justify-center">
                        <div className="text-5xl font-black text-gray-900">{selectedJob.match}</div>
                        <div className="absolute -bottom-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Match</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {[
                        { label: 'CGPA Match', value: '9.2/10', status: 'success' },
                        { label: 'Skills Match', value: '8/10', status: 'success' },
                        { label: 'Experience Gap', value: 'Low', status: 'warning' },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl">
                          <div className="flex items-center gap-3">
                            {item.status === 'success' ? (
                              <CheckCircle2 className="w-4 h-4 text-av-success" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-av-warning" />
                            )}
                            <span className="text-xs font-bold text-gray-700">{item.label}</span>
                          </div>
                          <span className={`text-xs font-black ${item.status === 'success' ? 'text-gray-900' : 'text-av-warning'}`}>{item.value}</span>
                        </div>
                      ))}
                    </div>

                    <div className="p-6 bg-blue-50 rounded-[24px] border border-blue-100 relative overflow-hidden">
                      <div className="flex items-start gap-4 relative z-10">
                        <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                          <Lightbulb className="w-4 h-4 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">AI Tip:</p>
                          <p className="text-xs text-blue-800 leading-relaxed font-medium">
                            You lack cloud certification. Completing the "AWS Cloud Practitioner" module on AIVORA could boost your score to 92%.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-10 border-t border-gray-100">
                      <button 
                        onClick={() => {
                          setShowInterviewSetupModal(true);
                          setSelectedJob(null);
                        }}
                        className="w-full bg-black text-white py-5 rounded-2xl font-black text-sm flex items-center justify-center gap-3 hover:bg-gray-900 transition-all shadow-xl shadow-black/10"
                      >
                        <Zap className="w-5 h-5" /> Trail Mockup Interview
                      </button>
                      <p className="text-[10px] text-gray-400 text-center mt-4 leading-relaxed px-4">
                        Direct applications are managed by the University Placement Cell. Click above to request the official portal link.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Completion Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProfileModal(false)}
              className="absolute inset-0 bg-av-maroon-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-10">
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-av-gold-500" />
                      <span className="text-[10px] font-black text-av-gold-500 uppercase tracking-[0.3em]">Profile Booster</span>
                    </div>
                    <h2 className="text-4xl font-black text-av-maroon-900 tracking-tight">Complete Your Profile</h2>
                    <p className="text-gray-500 mt-2 font-medium">Unlock FAANG-level AI Mock Interviews</p>
                  </div>
                  <button 
                    onClick={() => setShowProfileModal(false)}
                    className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6 mb-10">
                  {profileSteps.map((step) => (
                    <div 
                      key={step.id}
                      className={`p-6 rounded-3xl border transition-all ${
                        step.done 
                          ? 'bg-av-success/5 border-av-success/20' 
                          : 'bg-white border-gray-100 shadow-sm hover:border-av-maroon-900/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                            step.done ? 'bg-av-success text-white' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {step.done ? <CheckCircle className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                          </div>
                          <div>
                            <h4 className={`font-black tracking-tight ${step.done ? 'text-av-success' : 'text-gray-900'}`}>
                              {step.label}
                            </h4>
                            <p className="text-xs text-gray-500 font-medium">
                              {step.done ? 'Successfully verified' : `Adds ${step.bonus} to your readiness score`}
                            </p>
                          </div>
                        </div>
                        {!step.done && (
                          <button 
                            onClick={() => {
                              setProfileSteps(prev => prev.map(s => s.id === step.id ? { ...s, done: true } : s));
                            }}
                            className="px-6 py-2.5 bg-av-maroon-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-av-maroon-800 transition-all shadow-lg shadow-av-maroon-900/20"
                          >
                            Verify Now
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                      <Target className="w-6 h-6 text-av-gold-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Current Status</p>
                      <p className="text-xl font-black text-av-maroon-900">{profileCompletion}% Ready</p>
                    </div>
                  </div>
                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${profileCompletion}%` }}
                      className="h-full bg-av-maroon-900"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Report Modal */}
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReportModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="bg-av-maroon-900 p-8 text-white shrink-0 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                <div className="flex justify-between items-start relative z-10">
                  <div>
                    <h2 className="text-3xl font-bold mb-2">Interview Performance Report</h2>
                    <p className="text-white/60">Software Developer (CSE) • {new Date().toLocaleDateString()}</p>
                  </div>
                  <button 
                    onClick={() => setShowReportModal(false)}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                <div className="prose prose-slate max-w-none">
                  <div className="markdown-body">
                    <Markdown>{finalReport || ""}</Markdown>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center shrink-0">
                <div className="flex gap-4">
                  <button className="av-btn av-btn-secondary flex items-center gap-2">
                    <Share2 className="w-4 h-4" /> Share Report
                  </button>
                  <button className="av-btn av-btn-secondary flex items-center gap-2">
                    <Download className="w-4 h-4" /> Download PDF
                  </button>
                </div>
                <button 
                  onClick={() => {
                    setShowReportModal(false);
                    setCurrentPage('dashboard');
                  }}
                  className="av-btn av-btn-primary px-8"
                >
                  Back to Dashboard
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Interview Setup Modal */}
      <AnimatePresence>
        {showInterviewSetupModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInterviewSetupModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="bg-av-maroon-900 p-6 text-white shrink-0">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold">Prepare Your Interview</h2>
                  <button 
                    onClick={() => setShowInterviewSetupModal(false)}
                    className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Job Description (JD)</label>
                  <textarea 
                    value={interviewJD}
                    onChange={(e) => setInterviewJD(e.target.value)}
                    placeholder="Paste the job description here to tailor the interview questions..."
                    className="w-full h-32 p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-av-maroon-900/10 focus:border-av-maroon-900 outline-none transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Resume Source</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setInterviewResumeSource('ai')}
                      className={`p-4 rounded-2xl border-2 transition-all text-left flex flex-col gap-2 ${interviewResumeSource === 'ai' ? 'border-av-maroon-900 bg-av-maroon-900/5' : 'border-gray-100 hover:border-gray-200'}`}
                    >
                      <Sparkles className={`w-5 h-5 ${interviewResumeSource === 'ai' ? 'text-av-maroon-900' : 'text-gray-400'}`} />
                      <div>
                        <div className="text-sm font-bold">AI Generated</div>
                        <div className="text-[10px] text-gray-500">Use your current AIVORA profile</div>
                      </div>
                    </button>
                    <button 
                      onClick={() => setInterviewResumeSource('upload')}
                      className={`p-4 rounded-2xl border-2 transition-all text-left flex flex-col gap-2 ${interviewResumeSource === 'upload' ? 'border-av-maroon-900 bg-av-maroon-900/5' : 'border-gray-100 hover:border-gray-200'}`}
                    >
                      <Download className={`w-5 h-5 ${interviewResumeSource === 'upload' ? 'text-av-maroon-900' : 'text-gray-400'}`} />
                      <div>
                        <div className="text-sm font-bold">Upload Resume</div>
                        <div className="text-[10px] text-gray-500">Upload a PDF or Word file</div>
                      </div>
                    </button>
                  </div>
                </div>

                {interviewResumeSource === 'upload' && (
                  <div className="p-4 border-2 border-dashed border-gray-200 rounded-2xl text-center">
                    <input 
                      type="file" 
                      id="resume-upload" 
                      className="hidden" 
                      onChange={(e) => setUploadedResumeFile(e.target.files?.[0] || null)}
                    />
                    <label htmlFor="resume-upload" className="cursor-pointer">
                      <div className="text-sm font-bold text-av-maroon-900 mb-1">
                        {uploadedResumeFile ? uploadedResumeFile.name : 'Click to select file'}
                      </div>
                      <div className="text-[10px] text-gray-400">PDF, DOCX (Max 5MB)</div>
                    </label>
                  </div>
                )}

                <button 
                  onClick={() => {
                    setCurrentPage('interview');
                    startInterview();
                  }}
                  className="w-full av-btn av-btn-primary py-4 shadow-xl shadow-av-maroon-900/20"
                >
                  CONTINUE TO INTERVIEW
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

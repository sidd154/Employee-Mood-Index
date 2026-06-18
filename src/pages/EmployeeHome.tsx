import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { MoodCircle } from '../components/MoodCircle';
import { Navigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const FEELINGS_BY_MOOD: { [key: number]: string[] } = {
  5: ['Happy', 'Excited', 'Grateful', 'Inspired', 'Confident', 'Energetic', 'Proud', 'Optimistic'],
  4: ['Content', 'Calm', 'Productive', 'Focused', 'Relaxed', 'Hopeful', 'Satisfied', 'Positive'],
  3: ['Neutral', 'Tired', 'Busy', 'Thoughtful', 'Uncertain', 'Distracted'],
  2: ['Stressed', 'Anxious', 'Frustrated', 'Overwhelmed', 'Drained', 'Irritated', 'Pressured'],
  1: ['Burned Out', 'Exhausted', 'Disconnected', 'Demotivated', 'Defeated', 'Angry'],
};

const CONTRIBUTORS = [
  'Work', 'Team', 'Manager', 'Health', 'Sleep', 'Exercise',
  'Family', 'Finances', 'Relationships', 'Personal Life', 'Learning', 'Other'
];

export const EmployeeHome: React.FC = () => {
  const { user, accessToken, logout } = useAuth();
  const [screen, setScreen] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [branding, setBranding] = useState({ companyName: 'Mood Index', logoUrl: '' });
  
  // Check-in responses
  const [selectedMood, setSelectedMood] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [selectedFeelings, setSelectedFeelings] = useState<string[]>([]);
  const [selectedContributors, setSelectedContributors] = useState<string[]>([]);


  // Report modal states
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportRange, setReportRange] = useState<'7d' | '30d' | 'ytd'>('30d');
  const [sendingReport, setSendingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      if (!accessToken) return;
      try {
        // Fetch checkin status
        const res = await fetch(`${API_URL}/checkins/today-status`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.completed) {
            setScreen(5);
          }
        }

        // Fetch company branding settings
        const settingsRes = await fetch(`${API_URL}/settings`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        if (settingsRes.ok) {
          const sData = await settingsRes.json();
          if (sData.settings) {
            setBranding({
              companyName: sData.settings.companyName || 'Mood Index',
              logoUrl: sData.settings.companyLogoUrl || '',
            });
          }
        }
      } catch (err) {
        console.error('Failed to fetch check-in status or settings:', err);
      }
      setLoading(false);
    };

    checkStatus();
  }, [accessToken]);

  // Auth Guard
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'employee') return <Navigate to="/admin" replace />;

  const handleMoodSelect = (mood: 1 | 2 | 3 | 4 | 5) => {
    setSelectedMood(mood);
    // Reset feelings since they are dynamic per mood
    setSelectedFeelings([]);
    setScreen(2);
  };

  const handleFeelingToggle = (feeling: string) => {
    setSelectedFeelings(prev => 
      prev.includes(feeling) ? prev.filter(f => f !== feeling) : [...prev, feeling]
    );
  };

  const handleContributorToggle = (contributor: string) => {
    setSelectedContributors(prev => 
      prev.includes(contributor) ? prev.filter(c => c !== contributor) : [...prev, contributor]
    );
  };

  const handleCheckinSubmit = async () => {
    if (selectedMood === null || !accessToken) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/checkins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          moodScore: selectedMood,
          feelings: selectedFeelings,
          contributors: selectedContributors,
          journalText: '',
        }),
      });

      if (res.ok) {
        setScreen(5);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to submit check-in');
      }
    } catch (err) {
      console.error('Submit check-in error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReport = async () => {
    if (!accessToken) return;
    setSendingReport(true);
    setReportSuccess(false);
    setReportError(null);

    try {
      const res = await fetch(`${API_URL}/reports/employee`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ range: reportRange }),
      });

      if (res.ok) {
        setReportSuccess(true);
      } else {
        const data = await res.json();
        setReportError(data.error || 'Failed to send report');
      }
    } catch (err: any) {
      setReportError(err.message || 'Server connection error');
    } finally {
      setSendingReport(false);
    }
  };

  const firstName = user.fullName ? user.fullName.split(' ')[0] : 'there';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-950 text-white py-8 px-4 font-sans">
      {/* Top Navbar */}
      <header className="w-full max-w-md mx-auto flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-contain bg-slate-900 border border-slate-800 p-0.5" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
                <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-2.625 6c-.54 0-.828.419-.936.634a1.96 1.96 0 0 0-.189.866c0 .298.059.605.189.866.108.215.395.634.936.634.54 0 .828-.419.936-.634.13-.26.189-.568.189-.866 0-.298-.059-.605-.189-.866-.108-.215-.395-.634-.936-.634Zm5.25 0c-.54 0-.828.419-.936.634a1.96 1.96 0 0 0-.189.866c0 .298.059.605.189.866.108.215.395.634.936.634.54 0 .828-.419.936-.634.13-.26.189-.568.189-.866 0-.298-.059-.605-.189-.866-.108-.215-.395-.634-.936-.634Zm-5.25 6a.75.75 0 0 0 0 1.5h5.25a.75.75 0 0 0 0-1.5h-5.25Z" clipRule="evenodd" />
              </svg>
            </div>
          )}
          <span className="font-bold text-sm tracking-wide">{branding.companyName}</span>
        </div>
        <button
          onClick={logout}
          className="text-slate-400 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-900 transition-colors"
        >
          Sign Out
        </button>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-md mx-auto flex-1 flex flex-col justify-center">
        <div className="w-full glass rounded-2xl p-6 shadow-2xl relative overflow-hidden transition-all duration-300 min-h-[360px] flex flex-col justify-between">
          
          {/* Progress Indicators */}
          {screen < 5 && (
            <div className="flex justify-between gap-1.5 mb-8">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                    step <= screen ? 'bg-blue-500 shadow-md shadow-blue-500/20' : 'bg-slate-800'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Screen 1: Mood Select */}
          {screen === 1 && (
            <div className="flex-1 flex flex-col justify-center py-4 animate-fade-in">
              <h2 className="text-2xl font-extrabold text-white leading-tight mb-8">
                Hi {firstName}, how is your day today?
              </h2>
              <div className="flex justify-between gap-2 items-center px-1">
                {(Object.keys(FEELINGS_BY_MOOD).map(Number).sort((a,b) => b-a) as (1|2|3|4|5)[]).map((score) => (
                  <MoodCircle
                    key={score}
                    score={score}
                    onClick={() => handleMoodSelect(score)}
                    size={62}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Screen 2: Feelings Selector */}
          {screen === 2 && selectedMood !== null && (
            <div className="flex-1 flex flex-col justify-between animate-fade-in">
              <div>
                <h2 className="text-xl font-bold mb-1">What else are you feeling?</h2>
                <p className="text-slate-400 text-xs mb-6">Select all that apply</p>
                <div className="flex flex-wrap gap-2.5">
                  {FEELINGS_BY_MOOD[selectedMood].map((feeling) => {
                    const isSelected = selectedFeelings.includes(feeling);
                    return (
                      <button
                        key={feeling}
                        onClick={() => handleFeelingToggle(feeling)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold tracking-wide border transition-all duration-300 ${
                          isSelected
                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20 scale-105'
                            : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        {feeling}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="mt-8 flex gap-3">
                <button
                  onClick={() => setScreen(1)}
                  className="flex-1 border border-slate-800 hover:bg-slate-900 text-slate-300 font-semibold py-3 rounded-xl transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setScreen(3)}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Screen 3: Contributors */}
          {screen === 3 && (
            <div className="flex-1 flex flex-col justify-between animate-fade-in">
              <div>
                <h2 className="text-xl font-bold mb-1">What had the biggest impact on your day?</h2>
                <p className="text-slate-400 text-xs mb-6">Select all that apply</p>
                <div className="flex flex-wrap gap-2.5 max-h-[200px] overflow-y-auto pr-1">
                  {CONTRIBUTORS.map((contrib) => {
                    const isSelected = selectedContributors.includes(contrib);
                    return (
                      <button
                        key={contrib}
                        onClick={() => handleContributorToggle(contrib)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold tracking-wide border transition-all duration-300 ${
                          isSelected
                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20 scale-105'
                            : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        {contrib}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="mt-8 flex gap-3">
                <button
                  onClick={() => setScreen(2)}
                  className="flex-1 border border-slate-800 hover:bg-slate-900 text-slate-300 font-semibold py-3 rounded-xl transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleCheckinSubmit}
                  disabled={submitting}
                  className="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-green-800 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-green-500/20"
                >
                  {submitting ? 'Submitting...' : 'Finish Check-in'}
                </button>
              </div>
            </div>
          )}



          {/* Screen 5: Success / Completed */}
          {screen === 5 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-6 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 flex items-center justify-center mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Thank you for checking in today.</h2>
              <p className="text-slate-400 text-sm max-w-xs mb-8">
                Your check-in helps management track wellbeing trends and make your workplace better.
              </p>
              
              <div className="w-full space-y-3">
                <button
                  onClick={() => setShowReportModal(true)}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20"
                >
                  Send Report
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Footer Branding */}
      <footer className="w-full text-center text-slate-500 text-[10px] mt-6">
        Employee Mood Index © 2026. Made with care for your workplace.
      </footer>

      {/* Send Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl glass p-6 shadow-2xl animate-fade-in">
            <h3 className="text-lg font-bold text-white mb-2">Send Personal Report</h3>
            <p className="text-slate-400 text-xs mb-6">
              Generate a custom PDF containing your wellbeing trends and email it to <strong className="text-slate-200">{user.email}</strong>.
            </p>

            {reportSuccess ? (
              <div className="space-y-6 text-center py-4">
                <div className="text-green-400 text-sm font-semibold">
                  Report sent successfully! Check your inbox.
                </div>
                <button
                  onClick={() => {
                    setShowReportModal(false);
                    setReportSuccess(false);
                  }}
                  className="w-full bg-slate-900 border border-slate-800 hover:bg-slate-800 py-2.5 rounded-xl text-sm font-semibold"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Date Period
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { id: '30d', label: 'Last 30 Days' },
                      { id: '7d', label: 'Last Week' },
                      { id: 'ytd', label: 'From January' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setReportRange(item.id as any)}
                        className={`px-4 py-3 rounded-xl text-left text-sm font-medium border flex justify-between items-center transition-colors ${
                          reportRange === item.id
                            ? 'bg-blue-600/10 border-blue-500 text-white'
                            : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {item.label}
                        {reportRange === item.id && (
                          <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {reportError && (
                  <div className="text-red-400 text-xs text-center">
                    {reportError}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowReportModal(false)}
                    disabled={sendingReport}
                    className="flex-1 border border-slate-800 hover:bg-slate-900 text-slate-300 font-semibold py-2.5 rounded-xl text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendReport}
                    disabled={sendingReport}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold py-2.5 rounded-xl text-sm transition-all"
                  >
                    {sendingReport ? 'Generating...' : 'Email PDF'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default EmployeeHome;

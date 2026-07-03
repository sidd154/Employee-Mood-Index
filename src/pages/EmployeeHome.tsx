import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

const FEELINGS_BY_MOOD: { [key: number]: string[] } = {
  5: ['Happy', 'Excited', 'Grateful', 'Inspired', 'Confident', 'Energetic', 'Proud', 'Optimistic'],
  4: ['Content', 'Calm', 'Productive', 'Focused', 'Relaxed', 'Hopeful', 'Satisfied', 'Positive'],
  3: ['Neutral', 'Tired', 'Busy', 'Thoughtful', 'Uncertain', 'Distracted'],
  2: ['Stressed', 'Anxious', 'Frustrated', 'Overwhelmed', 'Drained', 'Irritated', 'Pressured'],
  1: ['Burned Out', 'Exhausted', 'Disconnected', 'Demotivated', 'Defeated', 'Angry'],
};

const CONTRIBUTORS = [
  'Work', 'Team', 'Manager', 'Health', 'Sleep', 'Exercise',
  'Family', 'Finances', 'Clients', 'Learning', 'Other'
];

interface ThemeConfig {
  glow: string;
  accentClass: string;
  trackBg: string;
  blobs: { color: string; x: string; y: string; scale: string }[];
}

const MOOD_THEMES: Record<number, ThemeConfig> = {
  1: {
    glow: 'rgba(239, 68, 68, 0.2)',
    accentClass: 'text-red-500 border-red-500/30 shadow-red-500/20',
    trackBg: 'bg-red-950',
    blobs: [
      { color: 'bg-red-900/30', x: '10%', y: '20%', scale: 'scale-150' },
      { color: 'bg-stone-900/70', x: '80%', y: '70%', scale: 'scale-125' },
    ]
  },
  2: {
    glow: 'rgba(244, 63, 94, 0.2)',
    accentClass: 'text-rose-500 border-rose-500/30 shadow-rose-500/20',
    trackBg: 'bg-rose-950',
    blobs: [
      { color: 'bg-rose-950/40', x: '15%', y: '15%', scale: 'scale-125' },
      { color: 'bg-neutral-900/80', x: '75%', y: '65%', scale: 'scale-150' },
    ]
  },
  3: {
    glow: 'rgba(249, 115, 22, 0.2)',
    accentClass: 'text-orange-500 border-orange-500/30 shadow-orange-500/20',
    trackBg: 'bg-orange-950',
    blobs: [
      { color: 'bg-orange-950/40', x: '20%', y: '30%', scale: 'scale-110' },
      { color: 'bg-slate-900/60', x: '70%', y: '60%', scale: 'scale-140' },
    ]
  },
  4: {
    glow: 'rgba(245, 158, 11, 0.2)',
    accentClass: 'text-amber-500 border-amber-500/30 shadow-amber-500/20',
    trackBg: 'bg-amber-950',
    blobs: [
      { color: 'bg-amber-950/30', x: '25%', y: '25%', scale: 'scale-130' },
      { color: 'bg-slate-900/50', x: '65%', y: '75%', scale: 'scale-120' },
    ]
  },
  5: {
    glow: 'rgba(234, 179, 8, 0.2)',
    accentClass: 'text-yellow-500 border-yellow-500/30 shadow-yellow-500/20',
    trackBg: 'bg-yellow-950/50',
    blobs: [
      { color: 'bg-yellow-950/20', x: '30%', y: '10%', scale: 'scale-125' },
      { color: 'bg-slate-900/40', x: '60%', y: '80%', scale: 'scale-135' },
    ]
  },
  6: {
    glow: 'rgba(132, 204, 22, 0.2)',
    accentClass: 'text-lime-500 border-lime-500/30 shadow-lime-500/20',
    trackBg: 'bg-lime-950/50',
    blobs: [
      { color: 'bg-lime-950/20', x: '35%', y: '15%', scale: 'scale-115' },
      { color: 'bg-zinc-900/40', x: '55%', y: '70%', scale: 'scale-140' },
    ]
  },
  7: {
    glow: 'rgba(34, 197, 94, 0.2)',
    accentClass: 'text-green-500 border-green-500/30 shadow-green-500/20',
    trackBg: 'bg-green-950/50',
    blobs: [
      { color: 'bg-green-950/30', x: '40%', y: '20%', scale: 'scale-130' },
      { color: 'bg-slate-900/30', x: '50%', y: '65%', scale: 'scale-120' },
    ]
  },
  8: {
    glow: 'rgba(20, 184, 166, 0.2)',
    accentClass: 'text-teal-500 border-teal-500/30 shadow-teal-500/20',
    trackBg: 'bg-teal-950/50',
    blobs: [
      { color: 'bg-teal-950/40', x: '45%', y: '25%', scale: 'scale-140' },
      { color: 'bg-zinc-900/30', x: '45%', y: '60%', scale: 'scale-130' },
    ]
  },
  9: {
    glow: 'rgba(6, 182, 212, 0.2)',
    accentClass: 'text-cyan-500 border-cyan-500/30 shadow-cyan-500/20',
    trackBg: 'bg-cyan-950/50',
    blobs: [
      { color: 'bg-cyan-900/30', x: '50%', y: '30%', scale: 'scale-150' },
      { color: 'bg-violet-950/40', x: '40%', y: '50%', scale: 'scale-125' },
    ]
  },
  10: {
    glow: 'rgba(139, 92, 246, 0.25)',
    accentClass: 'text-violet-500 border-violet-500/30 shadow-violet-500/25',
    trackBg: 'bg-violet-950/50',
    blobs: [
      { color: 'bg-violet-900/40', x: '60%', y: '40%', scale: 'scale-160' },
      { color: 'bg-fuchsia-950/40', x: '30%', y: '30%', scale: 'scale-140' },
    ]
  }
};

const AWFUL_QUOTES = [
  { text: "It is during our darkest moments that we must focus to see the light.", author: "Aristotle" },
  { text: "Tough times never last, but tough people do.", author: "Robert H. Schuller" },
  { text: "You are allowed to be both a masterpiece and a work in progress, simultaneously." },
  { text: "Be gentle with yourself. You are doing the best you can." },
  { text: "Out of difficulties grow miracles.", author: "Jean de la Bruyere" },
  { text: "Courage does not always roar. Sometimes courage is the quiet voice at the end of the day saying, 'I will try again tomorrow.'", author: "Mary Anne Radmacher" },
  { text: "This too shall pass. Hold on, breathe, and take it one moment at a time." },
  { text: "Self-care is how you take your power back.", author: "Lalah Delia" },
  { text: "It's okay to not be okay, as long as you don't give up." },
  { text: "Healing takes time, and asking for help is a sign of strength." },
  { text: "No storm lasts forever. The sun will rise again." },
  { text: "Rest when you are tired. Your worth is not defined by your productivity." },
  { text: "Difficult roads often lead to beautiful destinations." },
  { text: "Your strength is defined by your resilience, not by your absence of struggles." },
  { text: "You don't have to carry it all. Pause, release, and recharge." },
  { text: "Sometimes the most productive thing you can do is relax.", author: "Mark Black" },
  { text: "Breathe in strength, breathe out tension. You are stronger than you think." },
  { text: "Give yourself grace. Every day is a fresh opportunity to heal." },
  { text: "Small progress is still progress. Keep moving forward gently." },
  { text: "You are resilient, you are valued, and your wellbeing matters." }
];

const BAD_QUOTES = [
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Every day may not be good... but there's something good in every day.", author: "Alice Morse Earle" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "The presentation of a goal is the first step in achieving it." },
  { text: "You are stronger than your challenges and wiser than your doubts." },
  { text: "Keep going. Each step forward brings you closer to a brighter day." },
  { text: "Fall seven times, stand up eight.", author: "Japanese Proverb" },
  { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
  { text: "Our greatest glory is not in never falling, but in rising every time we fall.", author: "Confucius" },
  { text: "Every week is a new chapter waiting to be written. Turn the page." },
  { text: "Focus on the step in front of you, not the whole staircase." },
  { text: "Your potential is unlimited; your obstacles are temporary." },
  { text: "The best way to predict the future is to create it.", author: "Abraham Lincoln" },
  { text: "Be patient with yourself. Nothing in nature blooms all year." },
  { text: "Your pace is entirely yours. Keep moving steadily." },
  { text: "Out of complications, find simplicity. Out of discord, find harmony.", author: "Albert Einstein" },
  { text: "You have within you right now, everything you need to succeed." },
  { text: "Look for the silver lining in every challenge. It is always there." },
  { text: "Progress, no matter how small, is a victory. Celebrate it." }
];

const OKAY_QUOTES = [
  { text: "Strive for progress, not perfection." },
  { text: "Keep your face always toward the sunshine - and shadows will fall behind you.", author: "Walt Whitman" },
  { text: "Happiness is not something ready made. It comes from your own actions.", author: "Dalai Lama" },
  { text: "Wellbeing is a state of balance. Keep adjusting your sails." },
  { text: "Quiet minds cannot be perplexed or frightened; they go on in fortune or misfortune at their own private pace.", author: "Ralph Waldo Emerson" },
  { text: "There is virtue in work and there is virtue in rest. Use both and overlook neither.", author: "Alan Cohen" },
  { text: "One day at a time is enough. Do not look back and grieve over the past." },
  { text: "Balance is not something you find, it's something you create.", author: "Jana Kingsford" },
  { text: "Enjoy the little things, for one day you may look back and realize they were the big things.", author: "Robert Brault" },
  { text: "A peaceful mind brings inner strength and self-confidence.", author: "Dalai Lama" },
  { text: "Work hard, stay humble, and keep finding your rhythm." },
  { text: "Give yourself credit for how far you've come. You're doing great." },
  { text: "May your choices reflect your hopes, not your fears.", author: "Nelson Mandela" },
  { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
  { text: "Patience and persistence have a magical effect before which difficulties disappear.", author: "John Quincy Adams" },
  { text: "Stay centered. The storm may rage outside, but peace lies within." },
  { text: "The key to life is balance, moderation, and finding joy in the middle ground." },
  { text: "Every week is an opportunity to refine your focus and restore your energy." },
  { text: "Do not let what you cannot do interfere with what you can do.", author: "John Wooden" },
  { text: "You are in control of your response. Choose peace and steady progress." }
];

const GOOD_QUOTES = [
  { text: "Success is not the key to happiness. Happiness is the key to success.", author: "Albert Schweitzer" },
  { text: "Positive thinking will let you do everything better than negative thinking will.", author: "Zig Ziglar" },
  { text: "Your attitude, not your aptitude, will determine your altitude.", author: "Zig Ziglar" },
  { text: "The only limit to our realization of tomorrow will be our doubts of today.", author: "Franklin D. Roosevelt" },
  { text: "Be thankful for what you have; you'll end up having more.", author: "Oprah Winfrey" },
  { text: "The more you praise and celebrate your life, the more there is in life to celebrate.", author: "Oprah Winfrey" },
  { text: "Good energy is contagious. Keep sharing your positive vibes." },
  { text: "Integrity, insight, and positive action lead to lasting satisfaction." },
  { text: "Success is liking yourself, liking what you do, and liking how you do it.", author: "Maya Angelou" },
  { text: "A positive attitude causes a chain reaction of positive thoughts, events and outcomes.", author: "Wade Boggs" },
  { text: "You are making a difference. Your effort and presence are valued." },
  { text: "Your dedication and focus are inspiring. Keep leading the way." },
  { text: "Work collaboratively, build support, and celebrate team milestones." },
  { text: "Gratitude turns what we have into enough, and more.", author: "Melody Beattie" },
  { text: "Keep up the momentum. You are doing fantastic work." },
  { text: "The difference between ordinary and extraordinary is that little extra.", author: "Jimmy Johnson" },
  { text: "Nurture your strengths and let your passion guide your path." },
  { text: "A good week is the result of steady effort, supportive teams, and self-care." },
  { text: "Your positive outlook is a powerful asset. Keep shining." },
  { text: "Celebrate your progress, learn from your actions, and keep growing." }
];

const GREAT_QUOTES = [
  { text: "Life is 10% what happens to us and 90% how we react to it.", author: "Charles R. Swindoll" },
  { text: "Spread love everywhere you go. Let no one ever come to you without leaving happier.", author: "Mother Teresa" },
  { text: "The best portion of a good man's life is his little, nameless, unremembered acts of kindness and of love.", author: "William Wordsworth" },
  { text: "The absolute joy of life is finding your purpose and living it fully." },
  { text: "Be the change that you wish to see in the world.", author: "Mahatma Gandhi" },
  { text: "You are at your best when you are fueled by passion, purpose, and positivity." },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "Inspire others by your actions, lift them with your words, and lead with empathy." },
  { text: "True happiness involves the full use of one's power and talents.", author: "John W. Gardner" },
  { text: "Peak performance is achieved when your mind, body, and goals are in perfect harmony." },
  { text: "You are achieving great heights. Keep pushing boundaries and exploring new potentials." },
  { text: "Your passion is your superpower. Let it drive you to extraordinary results." },
  { text: "Wellbeing is radiating happiness and strength to everyone around you." },
  { text: "When you feel great, you empower others to feel great too." },
  { text: "Outstanding work comes from outstanding commitment. Keep setting the standard." },
  { text: "Joy is the simplest form of gratitude. Bask in your achievements." },
  { text: "Your energy is a beacon. Keep inspiring your workplace and team." },
  { text: "What an amazing week! Use this positive energy to propel your future goals." },
  { text: "The power to create an incredible culture lies in your hands. Keep leading with joy." },
  { text: "Optimal wellbeing is a gift you give to yourself and share with the world." }
];

const DEFAULT_QUOTES = [
  { text: "Wellbeing is a journey, not a destination. Take it one step at a time." },
  { text: "Every week is a fresh start. Take a deep breath and begin again." },
  { text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
  { text: "Welcome back! Taking time to reflect is the first step toward self-care." },
  { text: "Your check-in is a moment of self-reflection. Embrace it without judgment." },
  { text: "Step forward with confidence. A new opportunity is here." },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "You don't have to be perfect to begin. Just take the first step." },
  { text: "Every moment is a fresh beginning.", author: "T.S. Eliot" },
  { text: "Pause, reflect, and check in with yourself. Your feelings matter." },
  { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
  { text: "Your wellbeing is your foundation. Invest in it every week." },
  { text: "Begin today with a clean slate and a positive focus." },
  { text: "Self-reflection is the key to insight, growth, and wellness." },
  { text: "You are here, and that is what matters. Let's begin the week's reflection." },
  { text: "Breathe in fresh possibilities, release past challenges." },
  { text: "Checking in with your emotional index is a powerful act of mindfulness." },
  { text: "A new week brings new strengths and new thoughts.", author: "Eleanor Roosevelt" },
  { text: "Be patient with your journey. Every step is valuable." },
  { text: "Let's capture this week's baseline and build toward a healthy balance." }
];

const getRandomQuote = (score: number | null) => {
  let list = DEFAULT_QUOTES;
  if (score !== null) {
    if (score <= 2) list = AWFUL_QUOTES;
    else if (score <= 4) list = BAD_QUOTES;
    else if (score <= 6) list = OKAY_QUOTES;
    else if (score <= 8) list = GOOD_QUOTES;
    else list = GREAT_QUOTES;
  }
  const idx = Math.floor(Math.random() * list.length);
  return list[idx];
};

const getMorphPaths = (score: number) => {
  const t = (score - 1) / 9; // normalized progress: 0 to 1

  // 1. Mouth quadratic curve interpolation
  const mStartX = 33 - (33 - 32) * t;
  const mStartY = 68 - 12 * t; 
  const mControlX = 50;
  const mControlY = 48 + 30 * t; 
  const mEndX = 67 + (68 - 67) * t;
  const mEndY = 68 - 12 * t;
  const mouthPath = `M ${mStartX},${mStartY} Q ${mControlX},${mControlY} ${mEndX},${mEndY}`;

  // 2. Eyebrow slant/arch interpolation
  const lEyebrowPath = t > 0.6 
    ? `M 28,${34 + 4 * (t - 0.6) / 0.4} Q 34,${34 - 3 * (t - 0.6) / 0.4} 40,${34 + 4 * (t - 0.6) / 0.4}`
    : `M 28,${33 + (34 - 33) * (t / 0.6)} L 40,${38 - (38 - 34) * (t / 0.6)}`;

  const rEyebrowPath = t > 0.6
    ? `M 72,${34 + 4 * (t - 0.6) / 0.4} Q 66,${34 - 3 * (t - 0.6) / 0.4} 60,${34 + 4 * (t - 0.6) / 0.4}`
    : `M 72,${33 + (34 - 33) * (t / 0.6)} L 60,${38 - (38 - 34) * (t / 0.6)}`;

  // 3. Eye morphing (circle to laughing squint)
  const showSquint = t > 0.75;
  const eyeOpacityCircle = showSquint ? Math.max(0, 1 - (t - 0.75) * 4) : 1;
  const eyeOpacitySquint = showSquint ? Math.min(1, (t - 0.75) * 4) : 0;
  const eyeY = 45 - 5 * t;

  return {
    mouthPath,
    lEyebrowPath,
    rEyebrowPath,
    eyeY,
    eyeOpacityCircle,
    eyeOpacitySquint
  };
};

export const EmployeeHome: React.FC = () => {
  const { user, accessToken, logout } = useAuth();
  const [screen, setScreen] = useState<1 | 2 | 3 | 5>(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [branding, setBranding] = useState({ companyName: 'Mood Index', logoUrl: '' });
  
  // Block state
  const [isBlocked, setIsBlocked] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<{ text: string; author?: string } | null>(null);

  // Check-in responses
  const [selectedMood, setSelectedMood] = useState<number>(7);
  const [selectedFeelings, setSelectedFeelings] = useState<string[]>([]);
  const [selectedContributors, setSelectedContributors] = useState<string[]>([]);
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);

  // Velocity state for squash & stretch animations
  const [velocity, setVelocity] = useState(0);
  const lastMood = useRef<number>(7);
  const lastTime = useRef<number>(Date.now());

  // Report modal states
  const [showReportModal, setShowReportModal] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      if (!accessToken) return;
      try {
        // Fetch checkin status
        const res = await fetch(`${API_URL}/checkins/weekly-status`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.completed) {
            setScreen(5);
            setAlreadyCheckedIn(true);
            setSelectedQuote(getRandomQuote(data.checkin?.mood_score || null));
          } else if (data.isBlockedDay) {
            setIsBlocked(true);
            setSelectedQuote(getRandomQuote(data.lastWeekScore));
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

  // Reset velocity after user stops dragging
  useEffect(() => {
    const timer = setTimeout(() => {
      setVelocity(0);
    }, 120);
    return () => clearTimeout(timer);
  }, [selectedMood]);

  // Auth Guard
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'employee') return <Navigate to="/admin" replace />;

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

  const handleSliderChange = (val: number) => {
    const now = Date.now();
    const dt = now - lastTime.current;
    if (dt > 0) {
      const dMood = val - lastMood.current;
      const rawVel = dMood / dt;
      setVelocity(Math.max(-0.5, Math.min(0.5, rawVel)));
    }
    setSelectedMood(val);
    lastMood.current = val;
    lastTime.current = now;
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
        setSelectedQuote(getRandomQuote(selectedMood));
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
        body: JSON.stringify({ range: 'ytd' }),
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
  const activeTheme = MOOD_THEMES[selectedMood] || MOOD_THEMES[7];
  const faceData = getMorphPaths(selectedMood);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-slate-950 text-white py-8 px-4 font-sans overflow-hidden">
      
      {/* Morphing Liquid Ambient Background Blobs */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        {activeTheme.blobs.map((blob, idx) => (
          <div
            key={idx}
            className={`absolute w-[450px] h-[450px] rounded-full blur-[120px] opacity-25 transition-all duration-1000 ease-out ${blob.color} ${blob.scale}`}
            style={{
              left: blob.x,
              top: blob.y,
              transform: `translate(${velocity * 40}px, 0px)`
            }}
          />
        ))}
      </div>

      {/* Top Navbar */}
      <header className="w-full max-w-md mx-auto flex justify-between items-center mb-6 z-10">
        <div className="flex items-center">
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
      <main className="w-full max-w-md mx-auto flex-1 flex flex-col justify-center z-10">
        <div className="w-full glass rounded-3xl p-6 shadow-2xl relative overflow-hidden transition-all duration-300 min-h-[380px] flex flex-col justify-between">
          
          {/* Progress Indicators */}
          {!isBlocked && screen < 5 && (
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

          {isBlocked ? (
            /* Monday-Thursday Blocked UI */
            <div className="flex-1 flex flex-col justify-between py-2 animate-fade-in">
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white mb-2 leading-tight">
                  Weekly Inspiration
                </h2>
                <p className="text-slate-400 text-xs max-w-xs mx-auto mb-5">
                  Come back on Friday to record this week's data. Check-ins are open Friday through Sunday.
                </p>

                {/* Quote Card */}
                {selectedQuote && (
                  <div className="w-full glass p-5 rounded-xl border border-slate-900 bg-slate-900/40 text-left relative overflow-hidden">
                    <div className="absolute top-2 right-4 text-slate-700 text-5xl font-serif select-none pointer-events-none">“</div>
                    <p className="text-slate-200 text-sm italic font-medium leading-relaxed mb-3">
                      "{selectedQuote.text}"
                    </p>
                    {selectedQuote.author && (
                      <p className="text-right text-xs font-semibold text-slate-400">
                        — {selectedQuote.author}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="w-full mt-4">
                <button
                  type="button"
                  onClick={() => setShowReportModal(true)}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20"
                >
                  Send Report
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Screen 1: Mood Select (1-10 Slider) */}
              {screen === 1 && (
                <div className="flex-1 flex flex-col justify-center py-6 animate-fade-in">
                  <h2 className="text-2xl font-extrabold text-white leading-tight mb-12">
                    Hi {firstName}, how was your week?
                  </h2>
                  <div className="flex flex-col items-center space-y-16">

                    {/* Custom 1-10 Slider with gliding morphing face emoji & score number inside */}
                    <div className="w-full relative pt-16 pb-4">
                      {/* Floating Emoji Indicator */}
                      <div 
                        className="absolute top-0 transform -translate-x-1/2 flex flex-col items-center transition-all duration-75"
                        style={{
                          left: `${(selectedMood - 1) / 9 * 100}%`,
                          transform: `translateX(-50%) scale(${velocity !== 0 ? 1.1 : 1}) scaleX(${1 + Math.abs(velocity) * 0.35}) scaleY(${1 - Math.abs(velocity) * 0.35}) rotate(${velocity * 15}deg)`,
                          boxShadow: `0 10px 25px -5px ${activeTheme.glow}`
                        }}
                      >
                        <div className={`w-14 h-14 rounded-full border flex flex-col items-center justify-center ${activeTheme.accentClass} bg-slate-950/95 backdrop-blur-md pt-1`}>
                          <svg viewBox="0 0 100 100" className="w-7 h-7 animate-fade-in" aria-hidden="true">
                            {/* Morphing Eyebrows */}
                            <path
                              d={faceData.lEyebrowPath}
                              stroke="currentColor"
                              strokeWidth="5"
                              strokeLinecap="round"
                              fill="none"
                              className="transition-all duration-300 ease-out"
                            />
                            <path
                              d={faceData.rEyebrowPath}
                              stroke="currentColor"
                              strokeWidth="5"
                              strokeLinecap="round"
                              fill="none"
                              className="transition-all duration-300 ease-out"
                            />

                            {/* Standard Circular Eyes */}
                            <g style={{ opacity: faceData.eyeOpacityCircle }}>
                              <circle cx="35" cy={faceData.eyeY} r="5.5" fill="currentColor" />
                              <circle cx="65" cy={faceData.eyeY} r="5.5" fill="currentColor" />
                            </g>

                            {/* Squinting Happy/Laughing Eyes */}
                            <g style={{ opacity: faceData.eyeOpacitySquint }} className="transition-all duration-300">
                              <path d="M 28,43 Q 34,36 40,43" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" fill="none" />
                              <path d="M 60,43 Q 66,36 72,43" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" fill="none" />
                            </g>

                            {/* Morphing Mouth */}
                            <path
                              d={faceData.mouthPath}
                              stroke="currentColor"
                              strokeWidth="6.5"
                              strokeLinecap="round"
                              fill="none"
                              className="transition-all duration-300 ease-out"
                            />
                          </svg>
                          <span className="text-[10px] font-black text-white -mt-0.5 leading-none tabular-nums">
                            {selectedMood}
                          </span>
                        </div>
                        <div className="w-2 h-2 rotate-45 border-r border-b border-slate-800 -mt-1 bg-slate-950" />
                      </div>

                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={selectedMood}
                        onChange={(e) => handleSliderChange(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-2.5 px-0.5 pointer-events-none">
                        <span>Awful</span>
                        <span>Okay</span>
                        <span>Outstanding</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8">
                    <button
                      type="button"
                      onClick={() => setScreen(2)}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-98"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {/* Screen 2: Feelings Selector */}
              {screen === 2 && selectedMood !== null && (
                <div className="flex-1 flex flex-col justify-between animate-fade-in">
                  <div>
                    <h2 className="text-xl font-bold mb-1">How else was your week?</h2>
                    <p className="text-slate-400 text-xs mb-6">Select all that apply</p>
                    <div className="flex flex-wrap gap-2.5">
                      {FEELINGS_BY_MOOD[Math.ceil(selectedMood / 2)].map((feeling) => {
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
                    <h2 className="text-xl font-bold mb-1">What had the biggest impact on your week?</h2>
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
                <div className="flex-1 flex flex-col justify-between py-2 animate-fade-in">
                  <div className="text-center py-4 flex-1 flex flex-col justify-center">
                    <div className="w-14 h-14 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 flex items-center justify-center mx-auto mb-5">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2 leading-tight">
                      {alreadyCheckedIn ? "You've already checked in this week." : "Thank you for checking in this week."}
                    </h2>
                    <p className="text-slate-400 text-xs max-w-xs mx-auto mb-6">
                      Your check-in helps management track wellbeing trends and make your workplace better.
                    </p>

                    {/* Quote Card for this week's check-in */}
                    {selectedQuote && (
                      <div className="w-full glass p-5 rounded-xl border border-slate-900 bg-slate-900/40 text-left relative overflow-hidden">
                        <div className="absolute top-2 right-4 text-slate-700 text-5xl font-serif select-none pointer-events-none">“</div>
                        <div className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-2">This Week's Reflection</div>
                        <p className="text-slate-200 text-sm italic font-medium leading-relaxed mb-3">
                          "{selectedQuote.text}"
                        </p>
                        {selectedQuote.author && (
                          <p className="text-right text-xs font-semibold text-slate-400">
                            — {selectedQuote.author}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="w-full mt-6">
                    <button
                      onClick={() => setShowReportModal(true)}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20"
                    >
                      Send Report
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </main>

      {/* Footer Branding */}
      <footer className="w-full text-center text-slate-500 text-[10px] mt-6 z-10">
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
                <p className="text-xs text-slate-400">
                  This report covers the timeframe <strong>From January</strong> (Year to Date).
                </p>

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

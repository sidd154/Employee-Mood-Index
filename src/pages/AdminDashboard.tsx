import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, Brush
} from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

export const AdminDashboard: React.FC = () => {
  const { user, accessToken, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'departments' | 'employees' | 'reports' | 'settings' | 'users'>('overview');
  const [loading, setLoading] = useState(true);

  // Filter ranges
  const [range] = useState<'7d' | '30d' | 'ytd'>('ytd');
  const [chartType, setChartType] = useState<'area' | 'line'>('area');

  // Overview Data
  const [stats, setStats] = useState({ moodIndex: 0, totalEmployees: 0, participationRate: 0, checkinsToday: 0 });
  const [trends, setTrends] = useState<any[]>([]);
  const [distribution, setDistribution] = useState<any[]>([]);

  // Feelings & Contributors
  const [feelings, setFeelings] = useState<any[]>([]);
  const [contributors, setContributors] = useState<any[]>([]);

  // Departments List
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [deptDetails, setDeptDetails] = useState<any | null>(null);
  const [deptRange] = useState<'7d' | '30d' | 'ytd'>('ytd');

  // Employees Explorer
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
  const [empDetails, setEmpDetails] = useState<any | null>(null);

  // Settings & Domains
  const [settings, setSettings] = useState({ companyName: '', reminderTime: '', afternoonReminderTime: '', companyLogoUrl: '', emailConfiguration: { from: '' } });
  const [domains, setDomains] = useState<any[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [savingDept, setSavingDept] = useState(false);

  // User accounts
  const [usersList, setUsersList] = useState<any[]>([]);
  const [regEmail, setRegEmail] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regDeptId, setRegDeptId] = useState('');
  const [regSubmitting, setRegSubmitting] = useState(false);

  // Detailed Modal for Mood Click
  const [selectedMoodScore, setSelectedMoodScore] = useState<number | null>(null);

  // Admin Reports Form
  const [reportRange] = useState<'7d' | '30d' | 'ytd' | 'custom'>('ytd');
  const [reportStart] = useState('');
  const [reportEnd] = useState('');
  const [reportExportType, setReportExportType] = useState<'pdf' | 'csv'>('pdf');
  const [sendingReport, setSendingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Load baseline statistics
  const fetchData = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${accessToken}` };
      
      // 1. Overview KPIs
      const statsRes = await fetch(`${API_URL}/analytics/overview`, { headers });
      if (statsRes.ok) setStats(await statsRes.json());

      // 2. Trend data
      const trendsRes = await fetch(`${API_URL}/analytics/trends?range=${range}`, { headers });
      if (trendsRes.ok) setTrends(await trendsRes.json());

      // 3. Distribution data
      const distRes = await fetch(`${API_URL}/analytics/distribution?range=${range}`, { headers });
      if (distRes.ok) setDistribution(await distRes.json());

      // 4. Feelings
      const feelingsRes = await fetch(`${API_URL}/analytics/feelings`, { headers });
      if (feelingsRes.ok) setFeelings(await feelingsRes.json());

      // 5. Contributors
      const contribsRes = await fetch(`${API_URL}/analytics/contributors`, { headers });
      if (contribsRes.ok) setContributors(await contribsRes.json());

      // 6. Departments
      const deptsRes = await fetch(`${API_URL}/analytics/departments`, { headers });
      if (deptsRes.ok) setDepartments(await deptsRes.json());

      // 7. Settings
      const settingsRes = await fetch(`${API_URL}/settings`, { headers });
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSettings(data.settings);
        setDomains(data.allowedDomains);
      }

    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [accessToken, range]);

  // Load employee explorer details
  const fetchEmployees = async () => {
    if (!accessToken) return;
    try {
      const headers = { 'Authorization': `Bearer ${accessToken}` };
      const res = await fetch(`${API_URL}/employees?search=${employeeSearch}&departmentId=${selectedDeptFilter}`, { headers });
      if (res.ok) setEmployees(await res.json());
    } catch (err) {
      console.error('Failed to fetch explorer:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'employees') {
      fetchEmployees();
    }
  }, [activeTab, employeeSearch, selectedDeptFilter]);

  // Fetch specific department details
  const loadDeptDetails = async (id: string, rangeOverride?: '7d' | '30d' | 'ytd') => {
    if (!accessToken) return;
    setSelectedDeptId(id);
    const activeRange = rangeOverride || deptRange;
    try {
      const res = await fetch(`${API_URL}/analytics/departments/${id}?range=${activeRange}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      if (res.ok) setDeptDetails(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch specific employee profile details
  const loadEmpDetails = async (id: string) => {
    if (!accessToken) return;
    setSelectedEmpId(id);
    try {
      const res = await fetch(`${API_URL}/employees/${id}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      if (res.ok) setEmpDetails(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    if (!accessToken || user?.role !== 'admin') return;
    try {
      const res = await fetch(`${API_URL}/users`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      if (res.ok) setUsersList(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEmail.trim() || !accessToken) return;

    setRegSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          email: regEmail.trim(),
          fullName: regFullName.trim() || null,
          roleName: 'employee',
          departmentId: regDeptId || null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert('User registered successfully!');
        setRegEmail('');
        setRegFullName('');
        setRegDeptId('');
        fetchUsers();
      } else {
        alert(data.error || 'Failed to register user');
      }
    } catch (err) {
      console.error('Register user error:', err);
      alert('Connection error');
    } finally {
      setRegSubmitting(false);
    }
  };

  // Settings CRUD handlers
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    setSavingSettings(true);
    try {
      const res = await fetch(`${API_URL}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        alert('Settings updated successfully');
      } else {
        alert('Failed to update settings');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddDomain = async () => {
    if (!newDomain.trim() || !accessToken) return;
    try {
      const res = await fetch(`${API_URL}/settings/domains`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ domain: newDomain.trim() }),
      });

      if (res.ok) {
        const added = await res.json();
        setDomains(prev => [...prev, added]);
        setNewDomain('');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to add domain');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteDomain = async (id: string) => {
    if (!accessToken) return;
    try {
      const res = await fetch(`${API_URL}/settings/domains/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      if (res.ok) {
        setDomains(prev => prev.filter(d => d.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateDept = async () => {
    if (!newDeptName.trim() || !accessToken) return;
    setSavingDept(true);
    try {
      const res = await fetch(`${API_URL}/settings/departments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name: newDeptName.trim() }),
      });

      if (res.ok) {
        const added = await res.json();
        setDepartments(prev => [...prev, added]);
        setNewDeptName('');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to add department');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingDept(false);
    }
  };

  const handleDeleteDept = async (id: string) => {
    if (!accessToken) return;
    if (!confirm('Are you sure you want to delete this department? Employees in this department will be reassigned.')) return;
    try {
      const res = await fetch(`${API_URL}/settings/departments/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (res.ok) {
        setDepartments(prev => prev.filter((d) => d.id !== id));
      } else {
        alert('Failed to delete department');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // User management promotion/deletion
  const handlePromoteDemoteUser = async (userId: string, currentRole: string) => {
    if (!accessToken) return;
    const targetRole = currentRole === 'admin' ? 'employee' : 'admin';
    try {
      const res = await fetch(`${API_URL}/users/role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ userId, roleName: targetRole }),
      });

      if (res.ok) {
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'Operation failed');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!accessToken || !window.confirm('Are you sure you want to permanently delete this user account?')) return;
    try {
      const res = await fetch(`${API_URL}/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      if (res.ok) {
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'Operation failed');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger Admin Report
  const handleSendAdminReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    setSendingReport(true);
    setReportSuccess(false);

    try {
      const res = await fetch(`${API_URL}/reports/admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          range: reportRange,
          startDate: reportStart || undefined,
          endDate: reportEnd || undefined,
          exportType: reportExportType,
        }),
      });

      if (res.ok) {
        setReportSuccess(true);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to request report');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSendingReport(false);
    }
  };

  // Auth check
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') {
    return <Navigate to="/checkin" replace />;
  }

  // Color mapping
  const moodColors: { [key: string]: string } = {
    Great: '#10b981',
    Good: '#22c55e',
    Okay: '#eab308',
    Bad: '#f97316',
    Awful: '#ef4444',
  };

  // Custom tooltips
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dateObj = new Date(payload[0].payload.date);
      const formattedDate = isNaN(dateObj.getTime())
        ? payload[0].payload.date
        : `Week of ${dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
      return (
        <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg shadow-xl text-xs">
          <p className="text-slate-400 mb-1">{formattedDate}</p>
          <p className="font-bold text-white">Index Score: {payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans">
      {/* Admin Top Header */}
      <header className="border-b border-stone-850 bg-stone-950/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          {settings.companyLogoUrl ? (
            <img src={settings.companyLogoUrl} alt="Logo" className="w-9 h-9 rounded-xl object-contain bg-stone-900 border border-stone-800 p-0.5" />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
                <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-2.625 6c-.54 0-.828.419-.936.634a1.96 1.96 0 0 0-.189.866c0 .298.059.605.189.866.108.215.395.634.936.634.54 0 .828-.419.936-.634.13-.26.189-.568.189-.866 0-.298-.059-.605-.189-.866-.108-.215-.395-.634-.936-.634Zm5.25 0c-.54 0-.828.419-.936.634a1.96 1.96 0 0 0-.189.866c0 .298.059.605.189.866.108.215.395.634.936.634.54 0 .828-.419.936-.634.13-.26.189-.568.189-.866 0-.298-.059-.605-.189-.866-.108-.215-.395-.634-.936-.634Zm-5.25 6a.75.75 0 0 0 0 1.5h5.25a.75.75 0 0 0 0-1.5h-5.25Z" clipRule="evenodd" />
              </svg>
            </div>
          )}
          <div>
            <h1 className="font-bold text-base tracking-wide text-white">{settings.companyName || 'Employee Mood Index'}</h1>
            <p className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold">Management Console</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs font-bold text-white">{user.fullName || 'Admin'}</p>
            <p className="text-[10px] text-stone-400 capitalize">{user.role.replace('_', ' ')}</p>
          </div>
          <button
            onClick={logout}
            className="text-stone-400 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg border border-stone-800 hover:bg-stone-900 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex">
        {/* Left Sidebar */}
        <aside className="w-64 border-r border-stone-800 bg-stone-950 p-6 flex flex-col gap-1.5">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'overview' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-stone-400 hover:bg-stone-900 hover:text-stone-200'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('departments')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'departments' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-stone-400 hover:bg-stone-900 hover:text-stone-200'
            }`}
          >
            Departments
          </button>
          <button
            onClick={() => setActiveTab('employees')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'employees' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-stone-400 hover:bg-stone-900 hover:text-stone-200'
            }`}
          >
            Employee Explorer
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'reports' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-stone-400 hover:bg-stone-900 hover:text-stone-200'
            }`}
          >
            Export Reports
          </button>
          {user.role === 'admin' && (
            <>
              <div className="h-px bg-stone-850 my-4" />
              <button
                onClick={() => setActiveTab('users')}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'users' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-stone-400 hover:bg-stone-900 hover:text-stone-200'
                }`}
              >
                Access Control
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'settings' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-stone-400 hover:bg-stone-900 hover:text-stone-200'
                }`}
              >
                Settings
              </button>
            </>
          )}
        </aside>

        {/* Dashboard Main Workspace */}
        <main className="flex-1 bg-stone-900 p-8 overflow-y-auto">
          {loading ? (
            <div className="h-[400px] flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">

              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <>
                  {/* Top Bar with Time Filters */}
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-bold text-white">Wellbeing Overview</h2>
                      <p className="text-xs text-stone-400 mt-1">Metrics aggregated from January (Year-to-Date)</p>
                    </div>
                    <div>
                      <span className="text-xs bg-stone-950 border border-stone-800 text-stone-400 px-3.5 py-2 rounded-xl font-semibold">
                        From January
                      </span>
                    </div>
                  </div>

                  {/* KPI Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="glass p-6 rounded-2xl border border-stone-850 hover:border-stone-700 transition-all cursor-pointer">
                      <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Overall Mood Index</p>
                      <h3 className="text-4xl font-extrabold text-blue-500 mt-3">{stats.moodIndex}</h3>
                      <p className="text-[10px] text-stone-500 mt-1">Wellbeing Index (Target &gt; 7.5)</p>
                    </div>
                    <div className="glass p-6 rounded-2xl border border-stone-850 hover:border-stone-700 transition-all cursor-pointer">
                      <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Total Employees</p>
                      <h3 className="text-4xl font-extrabold text-white mt-3">{stats.totalEmployees}</h3>
                      <p className="text-[10px] text-stone-500 mt-1">Active onboarded employees</p>
                    </div>
                    <div className="glass p-6 rounded-2xl border border-stone-850 hover:border-stone-700 transition-all cursor-pointer">
                      <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Participation Rate</p>
                      <h3 className="text-4xl font-extrabold text-white mt-3">{stats.participationRate}%</h3>
                      <p className="text-[10px] text-stone-500 mt-1">Checked-in this week</p>
                    </div>
                    <div className="glass p-6 rounded-2xl border border-stone-850 hover:border-stone-700 transition-all cursor-pointer">
                      <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Check-ins This Week</p>
                      <h3 className="text-4xl font-extrabold text-green-500 mt-3">{stats.checkinsToday}</h3>
                      <p className="text-[10px] text-stone-500 mt-1">Submissions received this week</p>
                    </div>
                  </div>

                  {/* Charts Layout */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* Mood Trends Line/Area Graph */}
                    <div className="glass p-6 rounded-2xl border border-stone-850 md:col-span-2">
                      <div className="flex justify-between items-center mb-6">
                        <div>
                          <h4 className="text-sm font-bold text-white">Mood Index Trend</h4>
                          <p className="text-[10px] text-stone-500">Average employee mood plotted over time</p>
                        </div>
                        <div className="flex bg-stone-950 p-1 rounded-lg border border-stone-800">
                          <button
                            onClick={() => setChartType('area')}
                            className={`px-2 py-1 rounded text-[10px] font-bold ${chartType === 'area' ? 'bg-stone-900 text-white' : 'text-stone-500'}`}
                          >
                            Area
                          </button>
                          <button
                            onClick={() => setChartType('line')}
                            className={`px-2 py-1 rounded text-[10px] font-bold ${chartType === 'line' ? 'bg-stone-900 text-white' : 'text-stone-500'}`}
                          >
                            Line
                          </button>
                        </div>
                      </div>
                      <div className="h-64">
                        {trends.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-xs text-stone-500">No trend data available for this range.</div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            {chartType === 'area' ? (
                              <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis
                                  dataKey="date"
                                  stroke="#64748b"
                                  fontSize={10}
                                  tickLine={false}
                                  tickFormatter={(str) => {
                                    const d = new Date(str);
                                    return isNaN(d.getTime()) ? str : `Wk of ${d.getMonth() + 1}/${d.getDate()}`;
                                  }}
                                />
                                <YAxis domain={[0, 10]} stroke="#64748b" fontSize={10} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorScore)" />
                              </AreaChart>
                            ) : (
                              <LineChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis
                                  dataKey="date"
                                  stroke="#64748b"
                                  fontSize={10}
                                  tickLine={false}
                                  tickFormatter={(str) => {
                                    const d = new Date(str);
                                    return isNaN(d.getTime()) ? str : `Wk of ${d.getMonth() + 1}/${d.getDate()}`;
                                  }}
                                />
                                <YAxis domain={[0, 10]} stroke="#64748b" fontSize={10} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                              </LineChart>
                            )}
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>

                    {/* Mood Distribution */}
                    <div className="glass p-6 rounded-2xl border border-stone-850">
                      <h4 className="text-sm font-bold text-white mb-2">Mood Distribution</h4>
                      <p className="text-[10px] text-stone-500 mb-6">Click on a category to filter breakdowns</p>
                      
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={distribution} margin={{ top: 10, right: 10, left: -30, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} />
                            <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                            <Bar dataKey="count" radius={[4, 4, 0, 0]} onClick={(data: any) => setSelectedMoodScore(data.score)}>
                              {distribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={moodColors[entry.name] || '#3b82f6'} className="cursor-pointer hover:opacity-80 transition-opacity" />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                  </div>

                  {/* Feelings & Impacts Grid (Merged for simple analytics dashboard) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Feelings frequency */}
                    <div className="glass p-6 rounded-2xl border border-stone-850 space-y-4">
                      <div>
                        <h4 className="text-sm font-bold text-white">Top Feelings</h4>
                        <p className="text-[10px] text-stone-400 mt-1">Correlation with average wellbeing index</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-stone-950 text-stone-400 font-semibold uppercase">
                            <tr>
                              <th className="p-3">Feeling</th>
                              <th className="p-3 text-center">Frequency</th>
                              <th className="p-3 text-right">Mood Correlation</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-800 text-stone-300">
                            {feelings.slice(0, 5).map((feel) => (
                              <tr key={feel.name} className="hover:bg-stone-850/20">
                                <td className="p-3 font-bold text-white">{feel.name}</td>
                                <td className="p-3 text-center text-stone-400">{feel.count}x</td>
                                <td className="p-3 text-right font-bold text-blue-500">{feel.moodCorrelation}</td>
                              </tr>
                            ))}
                            {feelings.length === 0 && (
                              <tr>
                                <td colSpan={3} className="p-3 text-center text-stone-500">No feelings data recorded.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Impact factors */}
                    <div className="glass p-6 rounded-2xl border border-stone-850 space-y-4">
                      <div>
                        <h4 className="text-sm font-bold text-white">Top Impact Factors</h4>
                        <p className="text-[10px] text-stone-400 mt-1">Wellbeing metrics mapped to contributors</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-stone-950 text-stone-400 font-semibold uppercase">
                            <tr>
                              <th className="p-3">Impact Factor</th>
                              <th className="p-3 text-center">Frequency</th>
                              <th className="p-3 text-right">Mood Correlation</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-800 text-stone-300">
                            {contributors.slice(0, 5).map((contrib) => (
                              <tr key={contrib.name} className="hover:bg-stone-850/20">
                                <td className="p-3 font-bold text-white">{contrib.name}</td>
                                <td className="p-3 text-center text-stone-400">{contrib.count}x</td>
                                <td className="p-3 text-right font-bold text-blue-500">{contrib.moodCorrelation}</td>
                              </tr>
                            ))}
                            {contributors.length === 0 && (
                              <tr>
                                <td colSpan={3} className="p-3 text-center text-stone-500">No contributor data recorded.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* TAB 2: DEPARTMENTS */}
              {activeTab === 'departments' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-white">Department breakdown</h2>
                    <p className="text-xs text-slate-400 mt-1">Click a department to view detailed reports</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {departments.map((dept) => (
                      <div
                        key={dept.id}
                        onClick={() => {
                          loadDeptDetails(dept.id, 'ytd');
                        }}
                        className="glass p-6 rounded-2xl border border-slate-900 hover:border-blue-500/50 hover:bg-slate-900/40 transition-all cursor-pointer group"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors">{dept.name}</h3>
                          <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-2.5 py-1 rounded-lg">
                            {dept.employeeCount} Members
                          </span>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400">Mood Index:</span>
                            <span className="font-bold text-blue-500">{dept.moodIndex}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400">Weekly Participation:</span>
                            <span className="font-bold text-slate-200">{dept.participationRate}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Department Details Modal was moved to root level */}

                </div>
              )}

              {/* TAB 3: EMPLOYEES EXPLORER */}
              {activeTab === 'employees' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-white">Employee Explorer</h2>
                    <p className="text-xs text-slate-400 mt-1">Search profiles and review individual wellbeing timelines</p>
                  </div>

                  {/* Filters Bar */}
                  <div className="flex gap-4">
                    <input
                      type="text"
                      placeholder="Search employees..."
                      value={employeeSearch}
                      onChange={(e) => setEmployeeSearch(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                    <select
                      value={selectedDeptFilter}
                      onChange={(e) => setSelectedDeptFilter(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white cursor-pointer"
                    >
                      <option value="">All Departments</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Employees Table */}
                  <div className="glass rounded-2xl border border-slate-900 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900 text-slate-400 font-semibold uppercase tracking-wider">
                          <tr>
                            <th className="p-4">Name</th>
                            <th className="p-4">Department</th>
                            <th className="p-4 text-center">Mood Index</th>
                            <th className="p-4 text-center">Participation %</th>
                            <th className="p-4 text-right">Last Check-In</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900 text-slate-300">
                          {employees.map((emp) => (
                            <tr
                              key={emp.id}
                              onClick={() => loadEmpDetails(emp.id)}
                              className="hover:bg-slate-900/40 cursor-pointer transition-colors"
                            >
                              <td className="p-4 font-bold text-white">{emp.name}</td>
                              <td className="p-4 text-slate-400">{emp.department}</td>
                              <td className="p-4 text-center font-bold text-blue-500">{emp.moodIndex || '—'}</td>
                              <td className="p-4 text-center font-semibold text-slate-200">{emp.participationRate}%</td>
                              <td className="p-4 text-right text-slate-400">
                                {emp.lastCheckIn ? new Date(emp.lastCheckIn).toLocaleDateString() : 'Never'}
                              </td>
                            </tr>
                          ))}
                          {employees.length === 0 && (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-slate-500">No employees found.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Employee Details Modal was moved to root level */}

                </div>
              )}



              {/* TAB 5: REPORTS */}
              {activeTab === 'reports' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-white">Generate Organizational Reports</h2>
                    <p className="text-xs text-slate-400 mt-1">Export executive PDF summaries or raw data CSV reports</p>
                  </div>

                  <div className="w-full max-w-xl glass p-8 rounded-2xl border border-slate-900">
                    <form onSubmit={handleSaveSettings} className="space-y-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            Report Period
                          </label>
                          <div className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-300 font-medium">
                            From January (Year to Date)
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            Export Format
                          </label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 text-xs cursor-pointer text-slate-300">
                              <input
                                type="radio"
                                name="exportType"
                                value="pdf"
                                checked={reportExportType === 'pdf'}
                                onChange={() => setReportExportType('pdf')}
                                className="accent-blue-500"
                              />
                              Executive PDF summary
                            </label>
                            <label className="flex items-center gap-2 text-xs cursor-pointer text-slate-300">
                              <input
                                type="radio"
                                name="exportType"
                                value="csv"
                                checked={reportExportType === 'csv'}
                                onChange={() => setReportExportType('csv')}
                                className="accent-blue-500"
                              />
                              Raw Data CSV dataset
                            </label>
                          </div>
                        </div>
                      </div>

                      {reportSuccess ? (
                        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs text-center font-semibold">
                          Report exported successfully! Please check your email inbox.
                        </div>
                      ) : null}

                      <button
                        type="button"
                        onClick={handleSendAdminReport}
                        disabled={sendingReport || (reportRange === 'custom' && (!reportStart || !reportEnd))}
                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:cursor-not-allowed text-xs"
                      >
                        {sendingReport ? 'Generating and Emailing...' : 'Email Report'}
                      </button>
                    </form>
                  </div>
                </div>
              )}



              {/* TAB 7: ACCESS CONTROL */}
              {activeTab === 'users' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-white">Access Control</h2>
                    <p className="text-xs text-slate-400 mt-1">Configure user accounts and administrative roles</p>
                  </div>

                  {/* Register User Form */}
                  <div className="glass p-6 rounded-2xl border border-stone-850">
                    <h3 className="font-bold text-white mb-4 text-xs uppercase tracking-wider">Register New User / Email</h3>
                    <form onSubmit={handleRegisterUser} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <div>
                        <label className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-2">Email Address</label>
                        <input
                          type="email"
                          placeholder="employee@company.com"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-900 rounded-xl px-4 py-2.5 text-xs text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-2">Full Name (Optional)</label>
                        <input
                          type="text"
                          placeholder="John Doe"
                          value={regFullName}
                          onChange={(e) => setRegFullName(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-900 rounded-xl px-4 py-2.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-2">Department (Optional)</label>
                        <select
                          value={regDeptId}
                          onChange={(e) => setRegDeptId(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-900 rounded-xl px-4 py-2.5 text-xs text-white"
                        >
                          <option value="">None (Onboard Later)</option>
                          {departments.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <button
                          type="submit"
                          disabled={regSubmitting}
                          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition-all shadow-md"
                        >
                          {regSubmitting ? 'Registering...' : 'Register User'}
                        </button>
                      </div>
                    </form>
                  </div>

                  <div className="glass rounded-2xl border border-slate-900 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-slate-400 font-semibold uppercase">
                        <tr>
                          <th className="p-4">Name</th>
                          <th className="p-4">Email</th>
                          <th className="p-4">Department</th>
                          <th className="p-4">Role</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900 text-slate-300">
                        {usersList.map((usr) => (
                          <tr key={usr.id} className="hover:bg-slate-900/20">
                            <td className="p-4 font-bold text-white">{usr.name || '—'}</td>
                            <td className="p-4 text-slate-400">{usr.email}</td>
                            <td className="p-4 text-slate-400">{usr.department || '—'}</td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                usr.role === 'admin' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}>
                                {usr.role.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="p-4 text-right space-x-2">
                              {usr.email.toLowerCase() !== 'siddhanthsrinivasan@gmail.com' && usr.email !== user?.email && (
                                <>
                                  <button
                                    onClick={() => handlePromoteDemoteUser(usr.id, usr.role)}
                                    className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                                  >
                                    {usr.role === 'admin' ? 'Demote to Employee' : 'Promote to Admin'}
                                  </button>
                                  <span className="text-slate-700">|</span>
                                  <button
                                    onClick={() => handleDeleteUser(usr.id)}
                                    className="text-red-400 hover:text-red-300 font-semibold transition-colors"
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 8: SETTINGS */}
              {activeTab === 'settings' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Global settings */}
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-white">General Settings</h2>
                      <p className="text-xs text-slate-400 mt-1">Configure company branding and preferences</p>
                    </div>

                    <div className="glass p-6 rounded-2xl border border-slate-900">
                      <form onSubmit={handleSaveSettings} className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            Company Name
                          </label>
                          <input
                            type="text"
                            value={settings.companyName}
                            onChange={(e) => setSettings(prev => ({ ...prev, companyName: e.target.value }))}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            Morning Reminder Time
                          </label>
                          <input
                            type="time"
                            value={settings.reminderTime}
                            onChange={(e) => setSettings(prev => ({ ...prev, reminderTime: e.target.value }))}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            Afternoon Reminder Time
                          </label>
                          <input
                            type="time"
                            value={settings.afternoonReminderTime}
                            onChange={(e) => setSettings(prev => ({ ...prev, afternoonReminderTime: e.target.value }))}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            Email Sender Address (Resend)
                          </label>
                          <input
                            type="text"
                            value={settings.emailConfiguration.from}
                            onChange={(e) => setSettings(prev => ({ ...prev, emailConfiguration: { from: e.target.value } }))}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={savingSettings}
                          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl text-xs transition-all"
                        >
                          {savingSettings ? 'Saving Settings...' : 'Save General Settings'}
                        </button>
                      </form>
                    </div>
                            {/* Allowed domains and departments column */}
                  <div className="space-y-8">
                    {/* Allowed domains list */}
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-xl font-bold text-white">Allowed Domain Management</h2>
                        <p className="text-xs text-slate-400 mt-1">Only employees with domains listed here can sign up</p>
                      </div>

                      <div className="glass p-6 rounded-2xl border border-slate-900 space-y-6">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="company.com"
                            value={newDomain}
                            onChange={(e) => setNewDomain(e.target.value)}
                            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                          />
                          <button
                            onClick={handleAddDomain}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-semibold"
                          >
                            Add Domain
                          </button>
                        </div>

                        <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                          {domains.map((dom) => (
                            <div key={dom.id} className="flex justify-between items-center bg-slate-900/50 border border-slate-900 px-4 py-2.5 rounded-xl">
                              <span className="text-xs text-slate-200">{dom.domain}</span>
                              <button
                                onClick={() => handleDeleteDomain(dom.id)}
                                className="text-red-500 hover:text-red-400 text-xs font-semibold"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                          {domains.length === 0 && (
                            <p className="text-xs text-slate-500 text-center py-6">No domains configured.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Department list management */}
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-xl font-bold text-white">Department Management</h2>
                        <p className="text-xs text-slate-400 mt-1">Add or remove organization departments</p>
                      </div>

                      <div className="glass p-6 rounded-2xl border border-slate-900 space-y-6">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="e.g. Operations"
                            value={newDeptName}
                            onChange={(e) => setNewDeptName(e.target.value)}
                            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                          />
                          <button
                            onClick={handleCreateDept}
                            disabled={savingDept}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-50"
                          >
                            {savingDept ? 'Adding...' : 'Add Department'}
                          </button>
                        </div>

                        <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                          {departments.map((dept) => (
                            <div key={dept.id} className="flex justify-between items-center bg-slate-900/50 border border-slate-900 px-4 py-2.5 rounded-xl">
                              <span className="text-xs text-slate-200">{dept.name}</span>
                              {dept.name !== 'Other' && (
                                <button
                                  onClick={() => handleDeleteDept(dept.id)}
                                  className="text-red-500 hover:text-red-400 text-xs font-semibold"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          ))}
                          {departments.length === 0 && (
                            <p className="text-xs text-slate-500 text-center py-6">No departments configured.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>          </div>
                </div>
              )}

            </div>
          )}
        </main>
      </div>

      {/* MODALS RENDERED AT ROOT VIEWPORT LEVEL FOR CORRECT Z-INDEX STACKING */}
      {/* 1. Department Details Modal */}
      {selectedDeptId && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedDeptId(null);
              setDeptDetails(null);
            }
          }}
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm p-6 flex justify-center items-start"
        >
          <div className="w-full max-w-4xl bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-2xl space-y-6 my-8 relative animate-fade-in">
            <div className="flex justify-between items-start">
              <button
                onClick={() => { setSelectedDeptId(null); setDeptDetails(null); }}
                className="flex items-center gap-2 text-xs font-semibold text-stone-400 hover:text-white transition-colors bg-stone-900 px-3 py-1.5 rounded-lg border border-stone-850 hover:bg-stone-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                </svg>
                Back to Departments
              </button>
              
              <button
                onClick={() => { setSelectedDeptId(null); setDeptDetails(null); }}
                className="text-slate-400 hover:text-white text-base"
              >
                ✕
              </button>
            </div>
            
            {!deptDetails ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs text-stone-400">Loading department analytics...</p>
              </div>
            ) : (
              <>
                <div className="flex flex-col md:flex-row md:justify-between md:items-center border-b border-stone-800 pb-4 gap-4">
                  <div>
                    <h3 className="text-2xl font-bold text-white">{deptDetails.departmentName} Department Analytics</h3>
                    <p className="text-xs text-stone-400">Detailed historical wellbeing data</p>
                  </div>
                  <div>
                    <span className="text-xs bg-stone-950 border border-stone-800 text-stone-400 px-3.5 py-2 rounded-xl font-semibold">
                      From January
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Mood distribution */}
                  <div className="bg-slate-900/50 border border-slate-900 p-4 rounded-xl">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Mood Distribution</h4>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={deptDetails.distribution || []}>
                          <XAxis dataKey="name" stroke="#64748b" fontSize={9} />
                          <YAxis stroke="#64748b" fontSize={9} />
                          <Tooltip />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            {(deptDetails.distribution || []).map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={moodColors[entry.name] || '#3b82f6'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Department Trend Line Chart */}
                  <div className="bg-slate-900/50 border border-slate-900 p-4 rounded-xl flex flex-col">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Department Trend</h4>
                    <div className="h-48 flex-1 min-h-[180px]">
                      {!deptDetails.trends || deptDetails.trends.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-xs text-slate-500">No historical trend data available.</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={deptDetails.trends} margin={{ top: 10, right: 10, left: -20, bottom: 15 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1c1917" />
                            <XAxis dataKey="date" stroke="#78716c" fontSize={8} tickFormatter={(str) => {
                              const d = new Date(str);
                              return isNaN(d.getTime()) ? '' : `Wk of ${d.getMonth()+1}/${d.getDate()}`;
                            }} />
                            <YAxis domain={[0, 10]} stroke="#78716c" fontSize={9} />
                            <Tooltip content={({ active, payload }: any) => {
                              if (active && payload && payload.length) {
                                const dObj = new Date(payload[0].payload.date);
                                const formattedD = isNaN(dObj.getTime())
                                  ? payload[0].payload.date
                                  : `Week of ${dObj.toLocaleDateString()}`;
                                return (
                                  <div className="bg-stone-900 border border-stone-850 p-2.5 rounded-lg shadow-xl text-[10px]">
                                    <p className="text-stone-500 mb-1">{formattedD}</p>
                                    <p className="font-bold text-white">Score: {payload[0].value}</p>
                                  </div>
                                );
                              }
                              return null;
                            }} />
                            <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2.5 }} activeDot={{ r: 4.5 }} />
                            <Brush dataKey="date" height={20} stroke="#3b82f6" fill="#1c1917" tickFormatter={(str) => {
                              const d = new Date(str);
                              return isNaN(d.getTime()) ? '' : `${d.getMonth()+1}/${d.getDate()}`;
                            }} />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </div>

                {/* Top Feelings & Contributors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-900/50 border border-slate-900 p-4 rounded-xl">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Top Feelings</h4>
                    <div className="space-y-2">
                      {(deptDetails.topFeelings || []).map((f: any) => (
                        <div key={f.name} className="flex justify-between text-xs py-1 border-b border-slate-950">
                          <span className="text-slate-300">{f.name}</span>
                          <span className="text-slate-500 font-bold">{f.count}x</span>
                        </div>
                      ))}
                      {(!deptDetails.topFeelings || deptDetails.topFeelings.length === 0) && <p className="text-xs text-slate-500">No data</p>}
                    </div>
                  </div>

                  <div className="bg-slate-900/50 border border-slate-900 p-4 rounded-xl">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Top Impact factors</h4>
                    <div className="space-y-2">
                      {(deptDetails.topContributors || []).map((c: any) => (
                        <div key={c.name} className="flex justify-between text-xs py-1 border-b border-slate-950">
                          <span className="text-slate-300">{c.name}</span>
                          <span className="text-slate-500 font-bold">{c.count}x</span>
                        </div>
                      ))}
                      {(!deptDetails.topContributors || deptDetails.topContributors.length === 0) && <p className="text-xs text-slate-500">No data</p>}
                    </div>
                  </div>
                </div>

                {/* Employees List */}
                <div className="bg-slate-900/50 border border-slate-900 rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-slate-900">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Department Members</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-slate-400 font-semibold uppercase tracking-wider">
                        <tr>
                          <th className="p-4">Name</th>
                          <th className="p-4">Email</th>
                          <th className="p-4 text-center">Mood Index</th>
                          <th className="p-4 text-right">Last Check-In</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900 text-slate-300">
                        {(deptDetails.employees || []).map((emp: any) => (
                          <tr key={emp.id} className="hover:bg-slate-900/30">
                            <td className="p-4 font-bold text-white">{emp.name}</td>
                            <td className="p-4 text-slate-400">{emp.email}</td>
                            <td className="p-4 text-center font-bold text-blue-500">{emp.moodIndex || '—'}</td>
                            <td className="p-4 text-right text-slate-400">
                              {emp.last_check_in ? new Date(emp.last_check_in).toLocaleDateString() : 'Never'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 2. Employee Details Modal */}
      {selectedEmpId && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedEmpId(null);
              setEmpDetails(null);
            }
          }}
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm p-6 flex justify-center items-start"
        >
          <div className="my-8 w-full max-w-4xl bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-2xl space-y-6 relative animate-fade-in">
            <button
              onClick={() => { setSelectedEmpId(null); setEmpDetails(null); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              ✕
            </button>

            {!empDetails ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs text-stone-400">Loading employee details...</p>
              </div>
            ) : (
              <>
                <div className="border-b border-stone-850 pb-4">
                  <h3 className="text-2xl font-bold text-white">{empDetails.profile?.name || 'Employee Profile'}</h3>
                  <p className="text-xs text-stone-400 mt-1">
                    {empDetails.profile?.department || 'Other'} Department • {empDetails.profile?.email}
                  </p>
                  <p className="text-[10px] text-stone-500 mt-1.5 font-medium">
                    Last wellbeing check-in: {empDetails.profile?.last_check_in ? new Date(empDetails.profile.last_check_in).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : 'Never'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left: Stats & Common categories */}
                  <div className="space-y-4">
                    {/* Average Mood Index Card */}
                    <div className="bg-stone-950/50 border border-stone-850 p-4 rounded-xl text-center">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">Employee Mood Index</h4>
                      <p className="text-3xl font-extrabold text-blue-500">
                        {empDetails.trends && empDetails.trends.length > 0
                          ? (empDetails.trends.reduce((sum: number, t: any) => sum + parseFloat(t.score), 0) / empDetails.trends.length).toFixed(1)
                          : '—'}
                      </p>
                      <p className="text-[9px] text-stone-600 mt-1">30-day rolling average</p>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-900 p-4 rounded-xl">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Most Common Feelings</h4>
                      <div className="space-y-1.5">
                        {(empDetails.commonFeelings || []).map((f: any) => (
                          <div key={f.name} className="flex justify-between text-xs">
                            <span className="text-slate-300">{f.name}</span>
                            <span className="text-slate-500">{f.count}x</span>
                          </div>
                        ))}
                        {(!empDetails.commonFeelings || empDetails.commonFeelings.length === 0) && <p className="text-xs text-slate-500">No data</p>}
                      </div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-900 p-4 rounded-xl">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Most Common Impact factors</h4>
                      <div className="space-y-1.5">
                        {(empDetails.commonContributors || []).map((c: any) => (
                          <div key={c.name} className="flex justify-between text-xs">
                            <span className="text-slate-300">{c.name}</span>
                            <span className="text-slate-500">{c.count}x</span>
                          </div>
                        ))}
                        {(!empDetails.commonContributors || empDetails.commonContributors.length === 0) && <p className="text-xs text-slate-500">No data</p>}
                      </div>
                    </div>
                  </div>

                  {/* Middle/Right: Trend Line Chart */}
                  <div className="md:col-span-2 bg-slate-900/50 border border-slate-900 p-4 rounded-xl flex flex-col">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Wellbeing Trend (From January)</h4>
                    <div className="h-48 flex-1 min-h-[180px]">
                      {!empDetails.trends || empDetails.trends.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-xs text-slate-500">No historical trend data available.</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={empDetails.trends} margin={{ top: 10, right: 10, left: -20, bottom: 15 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1c1917" />
                            <XAxis dataKey="date" stroke="#78716c" fontSize={8} tickFormatter={(str) => {
                              const d = new Date(str);
                              return isNaN(d.getTime()) ? '' : `Wk of ${d.getMonth()+1}/${d.getDate()}`;
                            }} />
                            <YAxis domain={[0, 10]} stroke="#78716c" fontSize={9} />
                            <Tooltip content={({ active, payload }: any) => {
                              if (active && payload && payload.length) {
                                const dObj = new Date(payload[0].payload.date);
                                const formattedD = isNaN(dObj.getTime())
                                  ? payload[0].payload.date
                                  : `Week of ${dObj.toLocaleDateString()}`;
                                return (
                                  <div className="bg-stone-900 border border-stone-850 p-2.5 rounded-lg shadow-xl text-[10px]">
                                    <p className="text-stone-500 mb-1">{formattedD}</p>
                                    <p className="font-bold text-white">Score: {payload[0].value}</p>
                                  </div>
                                );
                              }
                              return null;
                            }} />
                            <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2.5 }} activeDot={{ r: 4.5 }} />
                            <Brush dataKey="date" height={20} stroke="#3b82f6" fill="#1c1917" tickFormatter={(str) => {
                              const d = new Date(str);
                              return isNaN(d.getTime()) ? '' : `${d.getMonth()+1}/${d.getDate()}`;
                            }} />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 3. Mood Drilldown Modal */}
      {selectedMoodScore !== null && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm p-6 flex justify-center items-start">
          <div className="my-8 w-full max-w-xl bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-2xl space-y-6 relative animate-fade-in">
            <button
              onClick={() => setSelectedMoodScore(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold text-white border-b border-slate-900 pb-3 flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: moodColors[selectedMoodScore === 5 ? 'Great' : selectedMoodScore === 4 ? 'Good' : selectedMoodScore === 3 ? 'Okay' : selectedMoodScore === 2 ? 'Bad' : 'Awful'] }} />
              Breakdown for score: {selectedMoodScore * 2} ({selectedMoodScore === 5 ? 'Great' : selectedMoodScore === 4 ? 'Good' : selectedMoodScore === 3 ? 'Okay' : selectedMoodScore === 2 ? 'Bad' : 'Awful'})
            </h3>
            <p className="text-xs text-slate-400">
              Check-ins scored with this rating are highly associated with the following indicators:
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Associated Feelings</h4>
                <div className="space-y-1 bg-slate-950 p-3 rounded-xl border border-slate-900 max-h-[160px] overflow-y-auto">
                  {feelings
                    .filter(f => f.moodCorrelation >= (selectedMoodScore * 2 - 1) && f.moodCorrelation <= (selectedMoodScore * 2 + 1))
                    .map(f => (
                      <div key={f.name} className="flex justify-between text-xs py-0.5">
                        <span className="text-slate-300">{f.name}</span>
                        <span className="text-slate-500 font-bold">{f.count}x</span>
                      </div>
                    ))}
                </div>
              </div>
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Associated Contributors</h4>
                <div className="space-y-1 bg-slate-950 p-3 rounded-xl border border-slate-900 max-h-[160px] overflow-y-auto">
                  {contributors
                    .filter(c => c.moodCorrelation >= (selectedMoodScore * 2 - 1.5) && c.moodCorrelation <= (selectedMoodScore * 2 + 1.5))
                    .map(c => (
                      <div key={c.name} className="flex justify-between text-xs py-0.5">
                        <span className="text-slate-300">{c.name}</span>
                        <span className="text-slate-500 font-bold">{c.count}x</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminDashboard;

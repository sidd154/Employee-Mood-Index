import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface Department {
  id: string;
  name: string;
}

export const Onboarding: React.FC = () => {
  const { user, accessToken, completeOnboarding, onboardingRequired } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [departments] = useState<Department[]>([
    { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', name: 'Engineering' },
    { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12', name: 'Sales' },
    { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b13', name: 'Marketing' },
    { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b14', name: 'HR' },
    { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b15', name: 'Finance' },
    { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b16', name: 'Operations' },
    { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b17', name: 'Other' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Attempt to fetch fresh departments from database settings configuration
  useEffect(() => {
    const fetchSettings = async () => {
      if (!accessToken) return;
      try {
        const res = await fetch(`${API_URL}/settings`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (res.ok) {
          // Departments fetch logic placeholder
        }
      } catch (err) {
        console.warn('Could not fetch settings list, using default list.', err);
      }
    };
    fetchSettings();
  }, [accessToken]);

  // If user is not logged in or onboarding is not required, redirect
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!onboardingRequired) {
    if (user.role === 'employee') {
      return <Navigate to="/checkin" replace />;
    }
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !departmentId) {
      setError('Please fill out all fields');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await completeOnboarding(fullName, departmentId);
    setLoading(false);

    if (res.success) {
      if (user.role === 'employee') {
        navigate('/checkin');
      } else {
        navigate('/admin');
      }
    } else {
      setError(res.error || 'Failed to complete profile');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md p-8 rounded-2xl glass shadow-2xl animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Complete Your Profile</h1>
          <p className="text-slate-400 text-sm mt-2">
            Just a few quick details to personalize your check-ins
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="fullName" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              placeholder="Jane Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="department" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Department
            </label>
            <select
              id="department"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              required
              className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none cursor-pointer"
            >
              <option value="" disabled className="bg-slate-900">Select Department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id} className="bg-slate-900">
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || !fullName.trim() || !departmentId}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:cursor-not-allowed"
          >
            {loading ? 'Completing Profile...' : 'Complete Profile'}
          </button>
        </form>
      </div>
    </div>
  );
};
export default Onboarding;

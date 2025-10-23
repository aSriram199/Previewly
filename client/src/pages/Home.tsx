import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import axios from 'axios';
import { BACKEND_URL } from '../config';


export function Home() {
  const [prompt, setPrompt] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[Home] Submit with prompt:', prompt);
    if (prompt.trim()) {
      console.log('[Home] Navigating to /builder with prompt');
      navigate('/builder', { state: { prompt } });
    }
  };

  const handleHabitTracker = async () => {
    console.log('[Home] Habit tracker button clicked');
    try {
      const resp = await axios.post(`${BACKEND_URL}/app/habittracker`);
      console.log('[Home] Habit tracker API response received');
      const artifact = resp.data?.response || '';
      navigate('/builder', { state: { prompt: 'Habit Tracker', prebuiltResponse: artifact } });
    } catch (err) {
      console.error('[Home] Habit tracker API error', err);
      alert('Failed to load Habit Tracker content. Check console for details.');
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-gray-900 flex flex-col items-center justify-center p-0 relative overflow-hidden">
    {/* Decorative background sparkles */}
    <div className="absolute inset-0 pointer-events-none opacity-30 z-0">
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-gradient-radial from-blue-500/30 to-transparent rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-radial from-purple-500/30 to-transparent rounded-full blur-2xl animate-pulse" />
    </div>
    <div className="max-w-2xl w-full z-10">
      <div className="text-center mb-10 mt-10">
        <div className="flex justify-center mb-4">
          <Sparkles className="w-14 h-14 text-purple-400 animate-bounce" />
        </div>
        <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mb-4 drop-shadow-lg">
          Build Your Dream Web App Instantly 🚀
        </h1>
        <p className="text-lg text-gray-200 max-w-xl mx-auto">
          AI-powered website builder: Describe your vision, and get a step-by-step plan, code, and live preview. No coding skills required!
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-gray-800/80 rounded-xl shadow-2xl p-8 backdrop-blur-md">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the website you want to build..."
            className="w-full h-32 p-4 bg-gray-900/80 text-gray-100 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none placeholder-gray-400 text-base"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white py-3 px-6 rounded-lg font-semibold shadow-md hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 transition-all text-lg tracking-wide"
            >
              Generate Website Plan
            </button>
            <button
              type="button"
              onClick={handleHabitTracker}
              className="w-full bg-gradient-to-r from-sky-600 to-cyan-600 text-white py-3 px-6 rounded-lg font-semibold shadow-md hover:from-sky-700 hover:to-cyan-700 transition-all text-lg tracking-wide"
            >
              Habit tracker
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
  );
}
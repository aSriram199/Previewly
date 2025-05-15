import React, { useState } from 'react';
import { ArrowRight, Code, Zap, Layout, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePrompt } from '../context/PromptContext';

export default function LandingPage() {
  const [prompt, setPrompt] = useState('');
  const [showError, setShowError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { setPrompt: setGlobalPrompt } = usePrompt();

  const handleGenerate = () => {
    console.log("Prompt : ", prompt);
    if (!prompt.trim()) {
      setShowError(true);
      return;
    }
    setIsLoading(true);
    // Simulate loading for demo
    setTimeout(() => {
      setGlobalPrompt(prompt);
      navigate('/workspace');
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -inset-[10px] opacity-50">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500 rounded-full blur-[120px]" />
          <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-purple-500 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-cyan-500 rounded-full blur-[120px]" />
        </div>
      </div>

      {/* Content */}
      <div className="relative container mx-auto px-4 pt-20 pb-32">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 leading-tight">
            Build Websites Instantly
          </h1>
          <p className="text-xl text-blue-100 mb-16 leading-relaxed">
            Transform your ideas into stunning websites with AI-powered generation.
            Just describe what you want, and watch the magic happen.
          </p>
          
          {/* Prompt Input */}
          <div className="relative max-w-2xl mx-auto backdrop-blur-sm bg-white/5 p-2 rounded-2xl border border-white/10 shadow-2xl">
            <div className="flex gap-4">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your dream website..."
                className="flex-1 px-6 py-4 rounded-xl bg-gray-900/50 border border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none text-white placeholder-gray-400"
              />
              <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl font-semibold flex items-center gap-2 transition-all duration-200 text-white shadow-lg hover:shadow-blue-500/25"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </div>
                ) : (
                  <>
                    Generate
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Features Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mt-32">
            <Feature
              icon={<Zap className="w-8 h-8 text-yellow-400" />}
              title="AI-Powered"
              description="Generate complete websites from natural language descriptions"
            />
            <Feature
              icon={<Code className="w-8 h-8 text-blue-400" />}
              title="Clean Code"
              description="Production-ready code with modern best practices"
            />
            <Feature
              icon={<Layout className="w-8 h-8 text-green-400" />}
              title="Responsive Design"
              description="Perfectly adapted for all screen sizes"
            />
          </div>
        </div>
      </div>

      {/* Error Modal */}
      {showError && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-red-500/20 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold text-white">Error</h3>
              <button
                onClick={() => setShowError(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-300 mb-6">
              Please enter a description for your website before generating.
            </p>
            <button
              onClick={() => setShowError(false)}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Feature({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="text-center p-6 backdrop-blur-sm bg-white/5 rounded-2xl border border-white/10">
      <div className="inline-block p-4 bg-gray-900/50 rounded-2xl mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2 text-white">{title}</h3>
      <p className="text-blue-100/80">{description}</p>
    </div>
  );
}
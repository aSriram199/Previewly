import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, Zap, Code2, Eye } from 'lucide-react';

const SUGGESTIONS = [
  'A portfolio site with dark mode and smooth scroll',
  'A SaaS landing page with pricing cards',
  'A recipe blog with search and categories',
  'An e-commerce storefront with a cart',
];

export function Home() {
  const [prompt, setPrompt] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const navigate = useNavigate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      navigate('/builder', { state: { prompt } });
    }
  };

  const handleSuggestion = (text: string) => {
    setPrompt(text);
    textareaRef.current?.focus();
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Ambient background orbs */}
      <div className="ambient-orb ambient-orb-1" />
      <div className="ambient-orb ambient-orb-2" />

      {/* Top badge */}
      <div className="fade-up mb-10 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
        style={{
          background: 'var(--accent-dim)',
          color: 'var(--accent)',
          border: '1px solid rgba(110,231,183,0.2)',
        }}>
        <Sparkles className="w-3.5 h-3.5" />
        AI-Powered Website Builder
      </div>

      {/* Hero heading */}
      <h1 className="fade-up fade-up-delay-1 text-center font-bold tracking-tight"
        style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: 'var(--text-primary)', maxWidth: 700, lineHeight: 1.1 }}>
        Describe it.{' '}
        <span style={{ color: 'var(--accent)' }}>Build it.</span>
        <br />Ship it.
      </h1>

      <p className="fade-up fade-up-delay-2 mt-4 text-center text-base"
        style={{ color: 'var(--text-secondary)', maxWidth: 480 }}>
        Turn any idea into a fully-functional web app — with code, file structure, and live preview — in seconds.
      </p>

      {/* Feature pills */}
      <div className="fade-up fade-up-delay-2 flex flex-wrap justify-center gap-3 mt-6">
        {[
          { icon: <Zap className="w-3.5 h-3.5" />, label: 'Instant generation' },
          { icon: <Code2 className="w-3.5 h-3.5" />, label: 'Full source code' },
          { icon: <Eye className="w-3.5 h-3.5" />, label: 'Live preview' },
        ].map(({ icon, label }) => (
          <span key={label}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
            style={{
              background: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
            }}>
            {icon} {label}
          </span>
        ))}
      </div>

      {/* Input card */}
      <form onSubmit={handleSubmit} className="fade-up fade-up-delay-3 w-full mt-10"
        style={{ maxWidth: 620 }}>
        <div
          className="rounded-2xl p-1 transition-all duration-300"
          style={{
            background: 'var(--bg-surface)',
            border: `1px solid ${isFocused ? 'var(--border-active)' : 'var(--border-subtle)'}`,
            boxShadow: isFocused
              ? '0 0 0 4px var(--accent-glow), 0 24px 48px rgba(0,0,0,0.4)'
              : '0 8px 32px rgba(0,0,0,0.3)',
          }}
        >
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e);
            }}
            placeholder="Describe the website you want to build…"
            rows={4}
            className="w-full resize-none bg-transparent outline-none text-sm leading-relaxed px-4 pt-4 pb-2"
            style={{ color: 'var(--text-primary)' }}
          />
          <div className="flex items-center justify-between px-3 pb-3 pt-1">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              ⌘ + Enter to generate
            </span>
            <button
              type="submit"
              disabled={!prompt.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{
                background: prompt.trim() ? 'var(--accent)' : 'var(--bg-elevated)',
                color: prompt.trim() ? '#0d0f12' : 'var(--text-muted)',
                cursor: prompt.trim() ? 'pointer' : 'not-allowed',
                transform: 'translateZ(0)',
              }}
              onMouseEnter={(e) => {
                if (prompt.trim()) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.03)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
              }}
            >
              Generate <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Suggestion chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => handleSuggestion(s)}
              className="px-3 py-1.5 rounded-lg text-xs transition-all duration-150"
              style={{
                background: 'var(--bg-elevated)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-active)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-subtle)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </form>
    </div>
  );
}
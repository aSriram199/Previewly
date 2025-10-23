require("dotenv").config();
import express from "express";
import OpenAI from "openai";
import { BASE_PROMPT, getSystemPrompt, React_Prompt, Node_Prompt } from "./prompts";
import cors from "cors";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();
app.use(cors())
app.use(express.json())

// app.post("/template", async (req, res) => {
//     const prompt = req.body.prompt;
//     console.log("[POST /template] Incoming prompt:", typeof prompt === 'string' ? prompt.slice(0, 200) : prompt);
//     try {
//     const response = await openai.chat.completions.create({
//         messages: [
//             {
//                 role: 'system', 
//                 content: "Return either node or react based on what do you think this project should be. Only return a single word either 'node' or 'react'. Do not return anything extra"
//             },
//             {
//                 role: 'user', 
//                 content: prompt
//             }
//         ],
//         model: 'gpt-4',
//         max_tokens: 80
//     });

//     const answer = response.choices[0].message.content?.trim().toLowerCase() || "";

//         console.log("[POST /template] Model: gpt-4 | Answer:", answer);
    
//     if (answer === "react") {
//         res.json({
//             prompts: [BASE_PROMPT, `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${React_Prompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`],
//             uiPrompts: [React_Prompt]
//         })
//         return;
//     }

//     if (answer === "node") {
//         res.json({
//             prompts: [`Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${Node_Prompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`],
//             uiPrompts: [Node_Prompt]
//         })
//         return;
//     }

//     res.status(403).json({message: "You cant access this"})
//     return;
//     } catch (error) {
//         console.error("[POST /template] Error:", error);
//         res.status(500).json({ message: 'Internal server error' });
//     }
// })

// app.post("/chat", async (req, res) => {
//     const messages = req.body.messages;
//     console.log("[POST /chat] Incoming messages:", Array.isArray(messages) ? messages.length : 0);
    
//     try {
//     // Add system message if not already present
//     const chatMessages = Array.isArray(messages) ? 
//         (messages[0]?.role === 'system' ? 
//             messages : 
//             [{ role: 'system', content: getSystemPrompt() }, ...messages]) :
//         [{ role: 'system', content: getSystemPrompt() }];

//         console.log("[POST /chat] Prepared chatMessages:", chatMessages);
    
//     const response = await openai.chat.completions.create({
//         messages: chatMessages,
//         model: 'gpt-4o',
//         max_tokens: 8000
//     });

//         const content = response.choices[0].message.content || '';
//         console.log("[POST /chat] Model: gpt-4o | Content preview:", content.slice(0, 200));

//     res.json({
//             response: content
//     });
//     } catch (error) {
//         console.error("[POST /chat] Error:", error);
//         res.status(500).json({ message: 'Internal server error' });
//     }
// })

app.post("/app/habittracker", async (req, res) => {
    console.log("[POST /app/habittracker] Serving habit tracker artifact");
    const artifact = `<boltArtifact id="video-conference-app" title="Video Conference App Setup">
  <boltAction type="file" filePath="src/components/VideoTracker/HabitTracker.tsx">
import React, { useEffect, useMemo, useState } from 'react';

// --- Simple habit tracker built for a React + TypeScript + Tailwind setup ---
// Features:
// - Add / edit / delete habits
// - Mark habit done for a given day (quick "Today" toggle)
// - View streaks and recent history
// - LocalStorage persistence
// - Clean, modern UI using Tailwind

// NOTE: This file contains multiple small components (Form, Card, Stats) bundled
// into one file so you can paste it into src/components/HabitTracker.tsx directly.

type Frequency = 'daily' | 'weekly';

interface Habit {
  id: string;
  title: string;
  emoji?: string;
  color?: string; // tailwind class or hex
  frequency: Frequency;
  createdAt: string; // ISO
  logs: string[]; // dates in YYYY-MM-DD
}

const STORAGE_KEY = 'habit-tracker:v1';

// --- utilities ---
const isoDate = (d = new Date()) => d.toISOString().slice(0, 10); // YYYY-MM-DD

const uid = (prefix = '') => prefix + Math.random().toString(36).slice(2, 9);

const loadHabits = (): Habit[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Habit[];
  } catch (e) {
    console.error('failed to load habits', e);
    return [];
  }
};

const saveHabits = (h: Habit[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(h));
};

const toggleLog = (habit: Habit, day: string): Habit => {
  const has = habit.logs.includes(day);
  const logs = has ? habit.logs.filter(d => d !== day) : [...habit.logs, day];
  logs.sort();
  return { ...habit, logs };
};

const getStreak = (logs: string[], fromDate = isoDate()) => {
  // count consecutive days up to fromDate inclusive
  const set = new Set(logs);
  let streak = 0;
  let cursor = new Date(fromDate + 'T00:00:00');
  while (true) {
    const d = isoDate(cursor);
    if (set.has(d)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }
  return streak;
};

const lastNDays = (n: number, end = new Date()) => {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    days.push(isoDate(d));
  }
  return days;
};

// --- UI Pieces ---

const COLORS = [
  'bg-rose-400',
  'bg-orange-400',
  'bg-amber-400',
  'bg-lime-400',
  'bg-emerald-400',
  'bg-cyan-400',
  'bg-sky-400',
  'bg-indigo-400',
  'bg-violet-400',
];

function HabitForm({
  onSave,
  onCancel,
  initial,
}: {
  onSave: (h: Partial<Habit>) => void;
  onCancel?: () => void;
  initial?: Partial<Habit>;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [emoji, setEmoji] = useState(initial?.emoji ?? '🔥');
  const [color, setColor] = useState(initial?.color ?? COLORS[0]);
  const [frequency, setFrequency] = useState<Frequency>(initial?.frequency ?? 'daily');

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <div className="grid grid-cols-1 gap-3">
        <label className="text-sm text-slate-600">Habit name</label>
        <input
          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-sky-300"
          placeholder="e.g. Read 20 pages"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />

        <div className="flex gap-2 items-center">
          <div>
            <label className="text-sm text-slate-600">Emoji</label>
            <input
              value={emoji}
              onChange={e => setEmoji(e.target.value)}
              className="p-2 border rounded w-20 text-center"
            />
          </div>

          <div className="flex-1">
            <label className="text-sm text-slate-600">Color</label>
            <div className="flex gap-2 mt-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className=\`\${c} w-8 h-8 rounded-full border-2 \${color === c ? 'ring-2 ring-offset-2 ring-sky-300' : 'border-white/40'}\`
                />
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-600">Frequency</label>
            <select
              value={frequency}
              onChange={e => setFrequency(e.target.value as Frequency)}
              className="p-2 border rounded"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-2">
          <button
            onClick={() => onCancel && onCancel()}
            className="px-3 py-1 rounded border text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave({ title: title.trim(), emoji, color, frequency })}
            disabled={!title.trim()}
            className="px-3 py-1 rounded text-sm bg-sky-600 text-white disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniSparkline({ days, logs }: { days: string[]; logs: string[] }) {
  return (
    <div className="flex gap-1">
      {days.map(d => {
        const done = logs.includes(d);
        return (
          <div
            key={d}
            title={d}
            className=\`w-3 h-3 rounded \${done ? 'bg-sky-600' : 'bg-slate-200'}\`
          />
        );
      })}
    </div>
  );
}

function HabitCard({
  habit,
  onToggleToday,
  onDelete,
  onEdit,
}: {
  habit: Habit;
  onToggleToday: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (h: Habit) => void;
}) {
  const today = isoDate();
  const doneToday = habit.logs.includes(today);
  const streak = getStreak(habit.logs, today);
  const recent = lastNDays(7);

  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm flex gap-4 items-center">
      <div className=\`w-14 h-14 rounded-lg flex items-center justify-center text-xl \${habit.color || 'bg-sky-300'}\`>
        <span className="text-2xl">{habit.emoji ?? '✨'}</span>
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-slate-800">{habit.title}</div>
            <div className="text-xs text-slate-500">created {new Date(habit.createdAt).toLocaleDateString()}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-600">streak</div>
            <div className="font-bold">{streak} 🔥</div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <MiniSparkline days={recent} logs={habit.logs} />

          <div className="flex gap-2 items-center">
            <button
              onClick={() => onToggleToday(habit.id)}
              className=\`px-3 py-1 rounded text-sm \${doneToday ? 'bg-green-600 text-white' : 'bg-white border'}\`
            >
              {doneToday ? 'Done today' : 'Mark today'}
            </button>
            <button onClick={() => onEdit(habit)} className="px-2 py-1 rounded border text-sm">Edit</button>
            <button onClick={() => onDelete(habit.id)} className="px-2 py-1 rounded border text-sm text-rose-600">Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HabitTracker() {
  const [habits, setHabits] = useState<Habit[]>(() => loadHabits());
  const [isCreating, setIsCreating] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const today = isoDate();

  useEffect(() => {
    saveHabits(habits);
  }, [habits]);

  const completedToday = useMemo(() => habits.filter(h => h.logs.includes(today)).length, [habits, today]);
  const total = habits.length;
  const bestStreak = useMemo(() => {
    return habits.reduce((m, h) => Math.max(m, getStreak(h.logs, today)), 0);
  }, [habits, today]);

  const createHabit = (data: Partial<Habit>) => {
    const h: Habit = {
      id: uid('h_'),
      title: data.title ?? 'Untitled',
      emoji: data.emoji ?? '✨',
      color: data.color ?? COLORS[0],
      frequency: data.frequency ?? 'daily',
      createdAt: new Date().toISOString(),
      logs: [],
    };
    setHabits(prev => [h, ...prev]);
    setIsCreating(false);
  };

  const updateHabit = (id: string, patch: Partial<Habit>) => {
    setHabits(prev => prev.map(h => (h.id === id ? { ...h, ...patch } : h)));
    setEditing(null);
  };

  const deleteHabit = (id: string) => {
    if (!confirm('Delete this habit?')) return;
    setHabits(prev => prev.filter(h => h.id !== id));
  };

  const toggleToday = (id: string) => {
    setHabits(prev => prev.map(h => (h.id === id ? toggleLog(h, today) : h)));
  };

  const toggleDayForHabit = (id: string, day: string) => {
    setHabits(prev => prev.map(h => (h.id === id ? toggleLog(h, day) : h)));
  };

  const clearAll = () => {
    if (!confirm('Clear all habits and data?')) return;
    setHabits([]);
  };

  return (
    <div className="max-w-5xl w-full mx-auto p-6">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Habit Studio</h1>
          <p className="text-sm text-slate-500">Build tiny routines that stick — quick and focused.</p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="text-sm text-slate-600">{completedToday}/{total} done today</div>
          <div className="bg-white border rounded p-2 text-sm">Best streak: <strong>{bestStreak}🔥</strong></div>
          <button onClick={() => setIsCreating(v => !v)} className="bg-sky-600 text-white px-3 py-2 rounded">{isCreating ? 'Close' : 'New Habit'}</button>
          <button onClick={clearAll} className="px-3 py-2 rounded border text-sm text-rose-600">Reset</button>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 space-y-4">
          {isCreating && (
            <HabitForm
              onSave={payload => createHabit(payload)}
              onCancel={() => setIsCreating(false)}
            />
          )}

          {editing && (
            <div className="bg-white p-4 rounded border">
              <h3 className="font-semibold mb-2">Edit habit</h3>
              <HabitForm
                initial={editing}
                onSave={payload => updateHabit(editing.id, payload)}
                onCancel={() => setEditing(null)}
              />
            </div>
          )}

          <div className="space-y-3">
            {habits.length === 0 && (
              <div className="bg-white border rounded p-6 text-center text-slate-500">
                No habits yet — create one and start small ✨
              </div>
            )}

            {habits.map(h => (
              <HabitCard
                key={h.id}
                habit={h}
                onToggleToday={toggleToday}
                onDelete={deleteHabit}
                onEdit={h => setEditing(h)}
              />
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <h3 className="font-semibold">Overview</h3>
            <div className="mt-3 grid grid-cols-1 gap-2">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600">Total habits</div>
                <div className="font-bold">{total}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600">Completed today</div>
                <div className="font-bold">{completedToday}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600">Best streak</div>
                <div className="font-bold">{bestStreak}🔥</div>
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <h3 className="font-semibold">Calendar (habit density)</h3>
            <div className="mt-3 text-sm text-slate-600">Last 30 days — number of habits completed each day</div>
            <div className="mt-3 grid grid-cols-6 gap-2">
              {lastNDays(30).map(d => {
                const count = habits.reduce((s, h) => s + (h.logs.includes(d) ? 1 : 0), 0);
                const opacity = Math.min(0.95, 0.15 + count * 0.13);
                return (
                  <div key={d} className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded" style={{ background: \`rgba(59,130,246,\${opacity})\` }} title=` + '\`${d} — ${count} completed\`' + ` />
                    <div className="text-[10px] text-slate-400 mt-1">{d.slice(5)}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <h3 className="font-semibold">Tips</h3>
            <ul className="list-disc list-inside text-sm text-slate-600 mt-2 space-y-1">
              <li>Start with one habit — small wins compound.</li>
              <li>Mark today as done as soon as you complete it.</li>
              <li>Use the streak to motivate consistent action.</li>
            </ul>
          </div>
        </aside>
      </main>
    </div>
  );
}
  </boltAction>

  <boltAction type="file" filePath="src/App.tsx">
import React from 'react';
import HabitTracker from './components/HabitTracker/HabitTracker';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-10">
      <div className="px-4">
        <HabitTracker />
      </div>
    </div>
  );
}

export default App;
  </boltAction>

  <boltAction type="shell">
    # Install dependencies (if using Vite + React + TypeScript + Tailwind)
    npm install
    # start dev server
    npm run dev
  </boltAction>
</boltArtifact>`;

    res.json({ response: artifact });
})

app.post("/app/videomeet", async (req, res) => {
    res.json({
        message: "Video Meet app endpoint - ready for content"
    });
})

app.post("/app/maps", async (req, res) => {
    res.json({
        message: "Maps app endpoint - ready for content"
    });
})

app.post("/app/tourist", async (req, res) => {
    res.json({
        message: "Tourist app endpoint - ready for content"
    });
})

app.post("/app/destinationbooking", async (req, res) => {
    res.json({
        message: "Destination Booking app endpoint - ready for content"
    });
})

app.listen(3000, () => {
    console.log("Server running on port 3000");
});

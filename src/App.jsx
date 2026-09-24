import { useState, useEffect, useMemo } from "react";
import {
  Flame,
  Activity,
  Wind,
  Moon,
  Dumbbell,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Settings as SettingsIcon,
  History as HistoryIcon,
  Home,
  BarChart3,
  Edit3,
  Save,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

// ============================================================
// CONSTANTS
// ============================================================

const DAY_TYPES = {
  peak: {
    name: "Peak",
    short: "PK",
    icon: Flame,
    accent: "#ff3e9d",
    accentMuted: "#ff3e9d20",
    description: "Maximum intensity. Mechanical failure focus.",
    rpe: "RPE 9-10",
    getDetails: (volume) => [
      `Up to ${volume.peak.songs} hard songs — this is a ceiling, not a target`,
      "STOP RULE: end the session after 2 consecutive songs with degraded accuracy",
      "Songs at the top of your ability — failure-adjacent difficulty",
      "Push to mechanical failure (not cardio fatigue)",
      "3-5 min full rest between songs",
      "Focus: clean execution under pressure, no tensing",
      "Quality of execution matters more than count — 4 clean songs > 7 sloppy ones",
    ],
  },
  stamina: {
    name: "Stamina",
    short: "ST",
    icon: Activity,
    accent: "#ffa83e",
    accentMuted: "#ffa83e20",
    description: "Sustained technical execution under fatigue.",
    rpe: "RPE 7-8",
    getDetails: (volume) => [
      `${volume.stamina} min continuous play`,
      "Mid-to-hard charts (not failure level)",
      "Minimal breaks between songs (30-60s)",
      "Ease intensity in back half if cardiac drift kicks in",
      "Focus: relaxed upper body, stable rhythm, no wasted steps",
    ],
  },
  technique: {
    name: "Technique",
    short: "TQ",
    icon: Wind,
    accent: "#3ee5ff",
    accentMuted: "#3ee5ff20",
    description: "Efficiency, form, skill engagement at low intensity.",
    rpe: "RPE 4-5",
    getDetails: (volume) => [
      `${volume.technique} min of easy-to-moderate charts`,
      "3-5 difficulty levels below your ceiling",
      "AAA / PFC hunts on familiar songs",
      "Drill specific weak patterns (crossovers, jumps, freezes)",
      "Focus: posture, ankle use, minimize lateral overtravel",
    ],
  },
  rest: {
    name: "Rest",
    short: "RS",
    icon: Moon,
    accent: "#6b6b80",
    accentMuted: "#6b6b8020",
    description: "No DDR today. Recovery is where adaptation happens.",
    rpe: "—",
    getDetails: () => [
      "No DDR",
      "Walking, mobility, or full rest are all fine",
      "Skipping rest is the most common way to stall progress",
    ],
  },
  upperLift: {
    name: "Upper Lift",
    short: "UL",
    icon: Dumbbell,
    accent: "#a855f7",
    accentMuted: "#a855f720",
    description: "Upper body strength. Independent of DDR recovery — schedule any day.",
    rpe: "2-3 RIR/set",
    getDetails: () => [
      'Dumbbell floor press · 3 × 8-12 — press from lying on floor, elbows ~45° from torso',
      "Single-arm row · 3 × 8-12 per side — knee on chair, flat back, pull to hip",
      "Shoulder press · 3 × 8-12 — seated or standing, full lockout overhead",
      "Lateral raise · 2 × 12-15 — slight elbow bend, lead with pinkies",
      "Bicep curl · 2 × 10-15 — controlled, no body english",
      "Tricep overhead extension · 2 × 10-15 — both hands on one DB, elbows tight",
      "Plank · 2 × 30-60s — neutral spine, glutes engaged",
      "Pick weights leaving 2-3 reps in reserve on the last set",
    ],
  },
  lowerLift: {
    name: "Lower Lift",
    short: "LL",
    icon: Dumbbell,
    accent: "#4ade80",
    accentMuted: "#4ade8020",
    description: "DDR-supportive lower body. Space 48h from Peak/Stamina days.",
    rpe: "2-3 RIR/set",
    getDetails: () => [
      "Bulgarian split squat · 3 × 8-12 per leg — back foot elevated, drop straight down (key DDR transfer)",
      "Goblet squat · 3 × 10-12 — hold DB at chest, elbows brush knees at bottom",
      "Romanian deadlift · 3 × 10-12 — hinge at hips, slight knee bend, feel hamstrings stretch",
      "Standing calf raise · 3 × 15-20 — full range, pause at top (often DDR's limiting muscle)",
      "Lateral lunge · 2 × 10 per side — direct DDR lateral pattern carryover",
      "Side plank · 2 × 30s per side — hips stacked, straight line head to heels",
      "Pick weights leaving 2-3 reps in reserve on the last set",
    ],
  },
};

const VOLUME_LEVELS = {
  1: { peak: { songs: 4 }, stamina: 30, technique: 20, label: "Starting" },
  2: { peak: { songs: 5 }, stamina: 40, technique: 25, label: "Ramping" },
  3: { peak: { songs: 6 }, stamina: 50, technique: 30, label: "Building" },
  4: { peak: { songs: 7 }, stamina: 60, technique: 35, label: "Conditioned" },
  5: { peak: { songs: 8 }, stamina: 70, technique: 40, label: "Peak Volume" },
};

const RPE_DESCRIPTIONS = {
  1: { label: "Very light, barely noticeable", dayType: null },
  2: { label: "Light, easy warmup pace", dayType: null },
  3: { label: "Moderate, full conversation easy", dayType: null },
  4: { label: "Somewhat hard, talk in sentences", dayType: "technique" },
  5: { label: "Hard, conversation getting choppy", dayType: "technique" },
  6: { label: "Hard, breathing noticeably labored", dayType: null },
  7: { label: "Very hard, short phrases only", dayType: "stamina" },
  8: { label: "Very hard, monosyllables, want to stop", dayType: "stamina" },
  9: { label: "Extremely hard, can barely speak", dayType: "peak" },
  10: { label: "Maximal, can't sustain, no speech", dayType: "peak" },
};

// Mon-Sun (JavaScript: 0=Sun, so we'll reindex)
const DEFAULT_SCHEDULE = [
  "peak",       // Mon
  "technique",  // Tue
  "rest",       // Wed
  "stamina",    // Thu
  "technique",  // Fri
  "rest",       // Sat
  "technique",  // Sun
];

const DEFAULT_SETTINGS = {
  schedule: DEFAULT_SCHEDULE,
  // One-off day swaps, keyed by ISO date. These override the weekly schedule for
  // a single day only — the recurring plan itself is never rewritten.
  overrides: {},
  volumeLevel: 1,
  startDate: todayISO(),
  lastProgressionCheck: null,
};

const SESSION_STORAGE_KEY = "terpsichore_sessions";
const SETTINGS_STORAGE_KEY = "terpsichore_settings";

// ============================================================
// HELPERS
// ============================================================

// Local calendar date, not UTC. toISOString() would roll over to tomorrow for
// anyone behind UTC during evening hours — exactly when sessions get logged.
function todayISO() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

const formatDate = (iso) => {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const dayOfWeekIndex = (iso) => {
  // Returns 0 for Monday, 6 for Sunday
  const d = new Date(iso + "T12:00:00");
  const js = d.getDay(); // 0=Sun, 1=Mon, ...
  return (js + 6) % 7;
};

const scheduledDayTypeFor = (settings, iso) =>
  settings.schedule[dayOfWeekIndex(iso)];

// What the app should actually prescribe for a date: a one-off swap if one was
// made for that date, otherwise the recurring weekly schedule.
const effectiveDayTypeFor = (settings, iso) =>
  settings.overrides?.[iso] ?? scheduledDayTypeFor(settings, iso);

// A date input yields "" while cleared or partially typed, and `max` only
// constrains the picker, not typed values. Only complete, non-future dates can
// be logged. ISO dates compare correctly as strings.
const isLoggableDate = (value) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && value <= todayISO();

// ============================================================
// STORAGE  (localStorage — works in any browser)
// ============================================================

const STORAGE = {
  async getSessions() {
    try {
      const r = localStorage.getItem(SESSION_STORAGE_KEY);
      return r ? JSON.parse(r) : [];
    } catch {
      return [];
    }
  },
  async saveSessions(sessions) {
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));
      return true;
    } catch {
      return false;
    }
  },
  async getSettings() {
    try {
      const r = localStorage.getItem(SETTINGS_STORAGE_KEY);
      return r ? { ...DEFAULT_SETTINGS, ...JSON.parse(r) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },
  async saveSettings(settings) {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      return true;
    } catch {
      return false;
    }
  },
};

// ============================================================
// ADAPTATION LOGIC
// ============================================================

function computeInsights(sessions, settings) {
  const DDR_TYPES = ["peak", "stamina", "technique"];
  const recent = sessions
    .filter((s) => s.completed && DDR_TYPES.includes(s.actualDayType))
    .slice(-10);

  if (recent.length < 3) {
    return {
      status: "warming-up",
      message: "Log a few sessions to start seeing recovery trends.",
      recommendation: "Stick to the schedule for now.",
      avgWipeout: null,
      trend: "neutral",
      readyToProgress: false,
      shouldDeload: false,
    };
  }

  const wipeouts = recent
    .map((s) => s.wipeoutMinutes)
    .filter((w) => w != null);
  const avgWipeout = wipeouts.length
    ? wipeouts.reduce((a, b) => a + b, 0) / wipeouts.length
    : null;

  // Trend: compare first half to second half
  const half = Math.floor(wipeouts.length / 2);
  const firstHalf = wipeouts.slice(0, half);
  const secondHalf = wipeouts.slice(half);
  const firstAvg = firstHalf.length
    ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
    : 0;
  const secondAvg = secondHalf.length
    ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
    : 0;
  let trend = "neutral";
  if (secondAvg < firstAvg - 3) trend = "improving";
  else if (secondAvg > firstAvg + 3) trend = "worsening";

  // Recovery indicators
  const recent5 = recent.slice(-5);
  const badSessions = recent5.filter(
    (s) =>
      (s.wipeoutMinutes != null && s.wipeoutMinutes > 30) ||
      s.performanceQuality === 1 ||
      s.accuracyHeld === "no"
  ).length;

  // Sleep quality if logged
  const sleepScores = recent
    .map((s) => s.sleepQuality)
    .filter((x) => x != null);
  const avgSleep = sleepScores.length
    ? sleepScores.reduce((a, b) => a + b, 0) / sleepScores.length
    : null;

  const shouldDeload = badSessions >= 3;

  // Ready to progress: ~4 weeks of good recovery
  const allSessionsAtLevel = sessions.filter(
    (s) =>
      s.volumeLevel === settings.volumeLevel &&
      s.completed &&
      DDR_TYPES.includes(s.actualDayType)
  );
  const recoveredCount = allSessionsAtLevel.filter(
    (s) => s.wipeoutMinutes != null && s.wipeoutMinutes <= 15
  ).length;
  const readyToProgress =
    !shouldDeload &&
    settings.volumeLevel < 5 &&
    recoveredCount >= 12 &&
    trend !== "worsening";

  let status, message, recommendation;
  if (shouldDeload) {
    status = "deload";
    message = "Multiple recent sessions show poor recovery.";
    recommendation =
      "Strongly consider a deload week: drop to half-volume on all session types and add an extra rest day. The world champion brain will hate this. Do it anyway.";
  } else if (readyToProgress) {
    status = "progress";
    message = "You've held this volume well for several weeks.";
    recommendation = `Ready to advance to Level ${settings.volumeLevel + 1} (${
      VOLUME_LEVELS[settings.volumeLevel + 1].label
    }). Bump volume in Settings.`;
  } else if (trend === "improving") {
    status = "good";
    message = "Wipeout pattern is shrinking. Recovery is improving.";
    recommendation = "Stay the course.";
  } else if (trend === "worsening") {
    status = "warning";
    message = "Wipeout pattern is growing. Recovery may be slipping.";
    recommendation =
      "Add a rest day this week, or substitute Technique for the next hard session.";
  } else {
    status = "neutral";
    message = "Recovery is stable.";
    recommendation = "Continue as planned.";
  }

  return {
    status,
    message,
    recommendation,
    avgWipeout,
    avgSleep,
    trend,
    readyToProgress,
    shouldDeload,
    sessionCount: recent.length,
  };
}

// ============================================================
// COMPONENTS
// ============================================================

const COLORS = {
  bg: "#0a0a14",
  surface: "#15152a",
  surfaceLight: "#1f1f3a",
  border: "#2a2a48",
  text: "#e8e8f0",
  muted: "#7878a0",
  accent: "#ff3e9d",
  accent2: "#3ee5ff",
};

function Header({ view, setView }) {
  const tabs = [
    { id: "today", label: "Today", Icon: Home },
    { id: "history", label: "History", Icon: HistoryIcon },
    { id: "insights", label: "Insights", Icon: BarChart3 },
    { id: "settings", label: "Settings", Icon: SettingsIcon },
  ];

  return (
    <div
      style={{ borderBottom: `1px solid ${COLORS.border}` }}
      className="px-6 py-5 mb-6"
    >
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <h1
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              letterSpacing: "0.05em",
              color: COLORS.text,
            }}
            className="text-4xl"
          >
            TERPSICHORE
          </h1>
          <p
            style={{ color: COLORS.muted, fontFamily: "'JetBrains Mono', monospace" }}
            className="text-xs tracking-wider mt-1"
          >
            DDR TRAINING LOG · {formatDate(todayISO()).toUpperCase()}
          </p>
        </div>
      </div>
      <div className="flex gap-1">
        {tabs.map(({ id, label, Icon }) => {
          const active = view === id;
          return (
            <button
              key={id}
              onClick={() => setView(id)}
              style={{
                color: active ? COLORS.text : COLORS.muted,
                backgroundColor: active ? COLORS.surface : "transparent",
                borderBottom: active
                  ? `2px solid ${COLORS.accent}`
                  : "2px solid transparent",
                fontFamily: "'JetBrains Mono', monospace",
              }}
              className="px-4 py-2 text-xs tracking-wider flex items-center gap-2 transition-all hover:text-white"
            >
              <Icon size={14} />
              {label.toUpperCase()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DayTypeCard({ dayType, volume, large = false }) {
  const config = DAY_TYPES[dayType];
  const Icon = config.icon;

  return (
    <div
      style={{
        backgroundColor: COLORS.surface,
        borderLeft: `3px solid ${config.accent}`,
      }}
      className={large ? "p-6" : "p-4"}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            style={{
              backgroundColor: config.accentMuted,
              color: config.accent,
            }}
            className="p-2"
          >
            <Icon size={large ? 24 : 18} />
          </div>
          <div>
            <h2
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                color: COLORS.text,
                letterSpacing: "0.05em",
              }}
              className={large ? "text-3xl" : "text-xl"}
            >
              {config.name.toUpperCase()} DAY
            </h2>
            <p
              style={{
                color: COLORS.muted,
                fontFamily: "'JetBrains Mono', monospace",
              }}
              className="text-xs"
            >
              {config.rpe}
            </p>
          </div>
        </div>
      </div>

      <p style={{ color: COLORS.text }} className="text-sm mb-4 opacity-80">
        {config.description}
      </p>

      <ul className="space-y-1.5">
        {config.getDetails(volume).map((detail, i) => (
          <li
            key={i}
            style={{ color: COLORS.text }}
            className="text-sm flex items-start gap-2 opacity-90"
          >
            <span style={{ color: config.accent }} className="mt-0.5">
              ▸
            </span>
            <span>{detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SessionLogSummary({ session }) {
  return (
    <div
      style={{
        backgroundColor: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
      }}
      className="p-6 mb-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <Check size={18} style={{ color: "#4ade80" }} />
        <span
          style={{ color: "#4ade80", fontFamily: "'JetBrains Mono', monospace" }}
          className="text-xs tracking-wider"
        >
          SESSION LOGGED
        </span>
      </div>
      <h2
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          color: COLORS.text,
          letterSpacing: "0.05em",
        }}
        className="text-2xl mb-3"
      >
        {DAY_TYPES[session.actualDayType].name.toUpperCase()} DAY · DONE
      </h2>
      <div className="grid grid-cols-2 gap-3 text-sm">
        {session.postSessionRPE != null && (
          <div>
            <div
              style={{ color: COLORS.muted, fontFamily: "'JetBrains Mono', monospace" }}
              className="text-xs tracking-wider"
            >
              RPE
            </div>
            <div style={{ color: COLORS.text }}>{session.postSessionRPE}/10</div>
          </div>
        )}
        {session.wipeoutMinutes != null && (
          <div>
            <div
              style={{ color: COLORS.muted, fontFamily: "'JetBrains Mono', monospace" }}
              className="text-xs tracking-wider"
            >
              WIPEOUT
            </div>
            <div style={{ color: COLORS.text }}>{session.wipeoutMinutes} min</div>
          </div>
        )}
        {session.accuracyHeld && (
          <div>
            <div
              style={{ color: COLORS.muted, fontFamily: "'JetBrains Mono', monospace" }}
              className="text-xs tracking-wider"
            >
              ACCURACY
            </div>
            <div style={{ color: COLORS.text }}>{session.accuracyHeld}</div>
          </div>
        )}
        {session.performanceQuality && (
          <div>
            <div
              style={{ color: COLORS.muted, fontFamily: "'JetBrains Mono', monospace" }}
              className="text-xs tracking-wider"
            >
              PERFORMANCE
            </div>
            <div style={{ color: COLORS.text }}>{session.performanceQuality}/5</div>
          </div>
        )}
      </div>
      {session.notes && (
        <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${COLORS.border}` }}>
          <div
            style={{ color: COLORS.muted, fontFamily: "'JetBrains Mono', monospace" }}
            className="text-xs tracking-wider mb-1"
          >
            NOTES
          </div>
          <div style={{ color: COLORS.text }} className="text-sm">
            {session.notes}
          </div>
        </div>
      )}
    </div>
  );
}

function TodayView({ todaySession, settings, volume, onLog, onSwapDay, onUndo }) {
  const [isLogging, setIsLogging] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const scheduledDayType = scheduledDayTypeFor(settings, todayISO());
  const todayDayType = effectiveDayTypeFor(settings, todayISO());
  const isSwapped = todayDayType !== scheduledDayType;

  if (todaySession) {
    return (
      <div className="px-6">
        <SessionLogSummary session={todaySession} />
        <button
          onClick={onUndo}
          style={{
            color: COLORS.muted,
            fontFamily: "'JetBrains Mono', monospace",
          }}
          className="text-xs tracking-wider mt-0 hover:text-white transition-colors ml-6"
        >
          ↶ UNDO / RE-LOG
        </button>
      </div>
    );
  }

  if (isLogging) {
    return (
      <LogSessionForm
        settings={settings}
        volume={volume}
        onCancel={() => setIsLogging(false)}
        onSubmit={(data) => {
          onLog(data);
          setIsLogging(false);
        }}
      />
    );
  }

  if (isSwapping) {
    return (
      <div className="px-6">
        <div
          style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}` }}
          className="p-6"
        >
          <h3
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              color: COLORS.text,
              letterSpacing: "0.05em",
            }}
            className="text-2xl mb-4"
          >
            SWAP TODAY'S SESSION
          </h3>
          <p style={{ color: COLORS.muted }} className="text-sm mb-4">
            Override today's prescribed session. Useful when you're not feeling up
            to the planned intensity. This affects today only — your weekly
            schedule stays as-is.
          </p>
          <div className="space-y-2">
            {Object.keys(DAY_TYPES).map((dt) => {
              const config = DAY_TYPES[dt];
              const Icon = config.icon;
              return (
                <button
                  key={dt}
                  onClick={() => {
                    onSwapDay(dt);
                    setIsSwapping(false);
                  }}
                  style={{
                    backgroundColor: COLORS.surfaceLight,
                    borderLeft: `3px solid ${config.accent}`,
                  }}
                  className="w-full p-3 text-left hover:opacity-80 flex items-center gap-3 transition-opacity"
                >
                  <Icon size={18} style={{ color: config.accent }} />
                  <span style={{ color: COLORS.text }}>{config.name}</span>
                  <span style={{ color: COLORS.muted }} className="text-xs ml-auto">
                    {config.rpe}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setIsSwapping(false)}
            style={{ color: COLORS.muted }}
            className="mt-4 text-sm hover:text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6">
      <DayTypeCard dayType={todayDayType} volume={volume} large />

      {isSwapped && (
        <div
          style={{ color: COLORS.muted, fontFamily: "'JetBrains Mono', monospace" }}
          className="text-xs tracking-wider mt-2 flex items-center gap-2"
        >
          <span>
            SWAPPED FROM{" "}
            <span style={{ color: DAY_TYPES[scheduledDayType].accent }}>
              {DAY_TYPES[scheduledDayType].name.toUpperCase()}
            </span>{" "}
            · TODAY ONLY
          </span>
          <button
            onClick={() => onSwapDay(null)}
            className="hover:text-white transition-colors underline"
          >
            REVERT
          </button>
        </div>
      )}

      {todayDayType !== "rest" ? (
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button
            onClick={() => setIsLogging(true)}
            style={{
              backgroundColor: COLORS.accent,
              color: "#0a0a14",
              fontFamily: "'JetBrains Mono', monospace",
            }}
            className="py-3 text-sm tracking-wider hover:opacity-90 transition-opacity"
          >
            LOG SESSION
          </button>
          <button
            onClick={() => setIsSwapping(true)}
            style={{
              backgroundColor: "transparent",
              color: COLORS.text,
              border: `1px solid ${COLORS.border}`,
              fontFamily: "'JetBrains Mono', monospace",
            }}
            className="py-3 text-sm tracking-wider hover:bg-white hover:bg-opacity-5 transition-colors"
          >
            SWAP DAY
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button
            onClick={() =>
              onLog({
                scheduledDayType,
                actualDayType: "rest",
                completed: true,
                notes: "",
              })
            }
            style={{
              backgroundColor: COLORS.accent,
              color: "#0a0a14",
              fontFamily: "'JetBrains Mono', monospace",
            }}
            className="py-3 text-sm tracking-wider hover:opacity-90 transition-opacity"
          >
            MARK REST TAKEN
          </button>
          <button
            onClick={() => setIsSwapping(true)}
            style={{
              backgroundColor: "transparent",
              color: COLORS.text,
              border: `1px solid ${COLORS.border}`,
              fontFamily: "'JetBrains Mono', monospace",
            }}
            className="py-3 text-sm tracking-wider hover:bg-white hover:bg-opacity-5 transition-colors"
          >
            TRAIN INSTEAD
          </button>
        </div>
      )}
    </div>
  );
}

function LogSessionForm({
  defaultDate = todayISO(),
  editableDate = false,
  settings,
  sessions = [],
  volume,
  onCancel,
  onSubmit,
}) {
  const [dateInput, setDateInput] = useState(defaultDate);
  // null while the date field holds something that can't be logged.
  const logDate = isLoggableDate(dateInput) ? dateInput : null;
  const scheduledDayType = logDate && scheduledDayTypeFor(settings, logDate);
  const effectiveDayType = logDate && effectiveDayTypeFor(settings, logDate);
  const existingSession = logDate && sessions.find((s) => s.date === logDate);

  const [actualDayType, setActualDayType] = useState(effectiveDayType);
  const [completed, setCompleted] = useState(true);
  const [rpe, setRpe] = useState(7);
  const [wipeout, setWipeout] = useState("");
  const [accuracy, setAccuracy] = useState("yes");
  const [performance, setPerformance] = useState(3);
  const [sleepQuality, setSleepQuality] = useState("");
  const [notes, setNotes] = useState("");

  // Reset actualDayType to match the prescribed session whenever the date changes
  useEffect(() => {
    if (effectiveDayType) setActualDayType(effectiveDayType);
  }, [logDate, effectiveDayType]);

  const isLiftOrRest = ["rest", "upperLift", "lowerLift"].includes(actualDayType);

  const handleSubmit = () => {
    onSubmit({
      date: logDate,
      scheduledDayType,
      actualDayType,
      completed,
      postSessionRPE: completed && !isLiftOrRest ? rpe : null,
      wipeoutMinutes:
        completed && !isLiftOrRest && wipeout !== ""
          ? parseInt(wipeout, 10)
          : null,
      accuracyHeld: completed && !isLiftOrRest ? accuracy : null,
      performanceQuality: completed && !isLiftOrRest ? performance : null,
      sleepQuality: sleepQuality !== "" ? parseInt(sleepQuality, 10) : null,
      notes,
    });
  };

  return (
    <div className="px-6">
      <div
        style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}` }}
        className="p-6"
      >
        <h3
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            color: COLORS.text,
            letterSpacing: "0.05em",
          }}
          className="text-2xl mb-4"
        >
          {editableDate ? "LOG PAST DAY" : "LOG SESSION"}
        </h3>

        <div className="space-y-4">
          {editableDate && (
            <div className="pb-4" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
              <label
                style={{ color: COLORS.muted, fontFamily: "'JetBrains Mono', monospace" }}
                className="text-xs tracking-wider mb-1 block"
              >
                DATE
              </label>
              <input
                type="date"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                max={todayISO()}
                style={{
                  backgroundColor: COLORS.surfaceLight,
                  color: COLORS.text,
                  border: `1px solid ${COLORS.border}`,
                  colorScheme: "dark",
                }}
                className="w-full p-2"
              />
              {logDate ? (
                <p
                  style={{ color: COLORS.muted, fontFamily: "'JetBrains Mono', monospace" }}
                  className="text-xs mt-1"
                >
                  {formatDate(logDate).toUpperCase()} · Scheduled:{" "}
                  <span style={{ color: DAY_TYPES[scheduledDayType].accent }}>
                    {DAY_TYPES[scheduledDayType].name}
                  </span>
                  {effectiveDayType !== scheduledDayType && (
                    <>
                      {" "}· Swapped to{" "}
                      <span style={{ color: DAY_TYPES[effectiveDayType].accent }}>
                        {DAY_TYPES[effectiveDayType].name}
                      </span>
                    </>
                  )}
                </p>
              ) : (
                <div
                  style={{ color: "#fbbf24", fontFamily: "'JetBrains Mono', monospace" }}
                  className="text-xs mt-1 flex items-center gap-2"
                >
                  <AlertTriangle size={12} />
                  Enter a date on or before today.
                </div>
              )}
              {existingSession && (
                <div
                  style={{ color: "#fbbf24", fontFamily: "'JetBrains Mono', monospace" }}
                  className="text-xs mt-2 flex items-center gap-2"
                >
                  <AlertTriangle size={12} />
                  This date already has a {DAY_TYPES[existingSession.actualDayType].name} session logged — saving will overwrite.
                </div>
              )}
            </div>
          )}

          <div>
            <label
              style={{ color: COLORS.muted, fontFamily: "'JetBrains Mono', monospace" }}
              className="text-xs tracking-wider mb-1 block"
            >
              SESSION TYPE
            </label>
            <select
              value={actualDayType}
              onChange={(e) => setActualDayType(e.target.value)}
              style={{
                backgroundColor: COLORS.surfaceLight,
                color: COLORS.text,
                border: `1px solid ${COLORS.border}`,
              }}
              className="w-full p-2"
            >
              <option value="peak">Peak</option>
              <option value="stamina">Stamina</option>
              <option value="technique">Technique</option>
              <option value="upperLift">Upper Lift</option>
              <option value="lowerLift">Lower Lift</option>
              <option value="rest">Rest</option>
            </select>
          </div>

          <div>
            <label
              style={{ color: COLORS.muted, fontFamily: "'JetBrains Mono', monospace" }}
              className="text-xs tracking-wider mb-1 block"
            >
              COMPLETED?
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setCompleted(true)}
                style={{
                  backgroundColor: completed ? COLORS.accent : COLORS.surfaceLight,
                  color: completed ? "#0a0a14" : COLORS.text,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
                className="px-4 py-2 text-xs tracking-wider flex-1"
              >
                YES
              </button>
              <button
                onClick={() => setCompleted(false)}
                style={{
                  backgroundColor: !completed ? COLORS.accent : COLORS.surfaceLight,
                  color: !completed ? "#0a0a14" : COLORS.text,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
                className="px-4 py-2 text-xs tracking-wider flex-1"
              >
                SKIPPED
              </button>
            </div>
          </div>

          {completed && !isLiftOrRest && (
            <>
              <div>
                <label
                  style={{ color: COLORS.muted, fontFamily: "'JetBrains Mono', monospace" }}
                  className="text-xs tracking-wider mb-1 block"
                >
                  RPE (1-10): {rpe} —{" "}
                  <span style={{ color: COLORS.text }}>
                    {RPE_DESCRIPTIONS[rpe].label}
                  </span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={rpe}
                  onChange={(e) => setRpe(parseInt(e.target.value, 10))}
                  className="w-full"
                  style={{ accentColor: COLORS.accent }}
                />
                <div className="mt-2 space-y-0.5">
                  {Object.entries(RPE_DESCRIPTIONS).map(([num, info]) => {
                    const n = parseInt(num, 10);
                    const isSelected = n === rpe;
                    const accent = info.dayType ? DAY_TYPES[info.dayType].accent : null;
                    return (
                      <div
                        key={num}
                        onClick={() => setRpe(n)}
                        style={{
                          color: isSelected ? COLORS.text : COLORS.muted,
                          fontFamily: "'JetBrains Mono', monospace",
                          backgroundColor: isSelected
                            ? COLORS.surfaceLight
                            : "transparent",
                          borderLeft: `2px solid ${accent || "transparent"}`,
                          cursor: "pointer",
                        }}
                        className="text-xs px-2 py-1 flex gap-3 items-center hover:bg-white hover:bg-opacity-5 transition-colors"
                      >
                        <span
                          style={{ color: isSelected ? COLORS.accent : COLORS.muted }}
                          className="w-5 font-semibold"
                        >
                          {num}
                        </span>
                        <span className="flex-1">{info.label}</span>
                        {info.dayType && (
                          <span style={{ color: accent }} className="text-xs tracking-wider">
                            {DAY_TYPES[info.dayType].short}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label
                  style={{ color: COLORS.muted, fontFamily: "'JetBrains Mono', monospace" }}
                  className="text-xs tracking-wider mb-1 block"
                >
                  POST-SESSION WIPEOUT (MIN)
                </label>
                <input
                  type="number"
                  min="0"
                  max="180"
                  value={wipeout}
                  onChange={(e) => setWipeout(e.target.value)}
                  placeholder="0 = none"
                  style={{
                    backgroundColor: COLORS.surfaceLight,
                    color: COLORS.text,
                    border: `1px solid ${COLORS.border}`,
                  }}
                  className="w-full p-2"
                />
                <p
                  style={{ color: COLORS.muted, fontFamily: "'JetBrains Mono', monospace" }}
                  className="text-xs mt-1"
                >
                  How long until you felt functional again
                </p>
              </div>

              <div>
                <label
                  style={{ color: COLORS.muted, fontFamily: "'JetBrains Mono', monospace" }}
                  className="text-xs tracking-wider mb-1 block"
                >
                  ACCURACY HELD UP?
                </label>
                <div className="flex gap-2">
                  {["yes", "partial", "no"].map((v) => (
                    <button
                      key={v}
                      onClick={() => setAccuracy(v)}
                      style={{
                        backgroundColor: accuracy === v ? COLORS.accent : COLORS.surfaceLight,
                        color: accuracy === v ? "#0a0a14" : COLORS.text,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                      className="px-4 py-2 text-xs tracking-wider flex-1"
                    >
                      {v.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  style={{ color: COLORS.muted, fontFamily: "'JetBrains Mono', monospace" }}
                  className="text-xs tracking-wider mb-1 block"
                >
                  PERFORMANCE QUALITY (1-5): {performance}
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={performance}
                  onChange={(e) => setPerformance(parseInt(e.target.value, 10))}
                  className="w-full"
                  style={{ accentColor: COLORS.accent }}
                />
                <div
                  style={{ color: COLORS.muted, fontFamily: "'JetBrains Mono', monospace" }}
                  className="text-xs mt-1 flex justify-between"
                >
                  <span>1 terrible</span>
                  <span>3 ok</span>
                  <span>5 great</span>
                </div>
              </div>
            </>
          )}

          <div>
            <label
              style={{ color: COLORS.muted, fontFamily: "'JetBrains Mono', monospace" }}
              className="text-xs tracking-wider mb-1 block"
            >
              SLEEP QUALITY LAST NIGHT (1-5, OPTIONAL)
            </label>
            <input
              type="number"
              min="1"
              max="5"
              value={sleepQuality}
              onChange={(e) => setSleepQuality(e.target.value)}
              placeholder="skip if unsure"
              style={{
                backgroundColor: COLORS.surfaceLight,
                color: COLORS.text,
                border: `1px solid ${COLORS.border}`,
              }}
              className="w-full p-2"
            />
          </div>

          <div>
            <label
              style={{ color: COLORS.muted, fontFamily: "'JetBrains Mono', monospace" }}
              className="text-xs tracking-wider mb-1 block"
            >
              NOTES (OPTIONAL)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Songs, observations, how you felt..."
              rows={3}
              style={{
                backgroundColor: COLORS.surfaceLight,
                color: COLORS.text,
                border: `1px solid ${COLORS.border}`,
              }}
              className="w-full p-2 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={onCancel}
              style={{
                backgroundColor: "transparent",
                color: COLORS.text,
                border: `1px solid ${COLORS.border}`,
                fontFamily: "'JetBrains Mono', monospace",
              }}
              className="py-3 text-sm tracking-wider hover:bg-white hover:bg-opacity-5 transition-colors"
            >
              CANCEL
            </button>
            <button
              onClick={handleSubmit}
              disabled={!logDate}
              style={{
                backgroundColor: COLORS.accent,
                color: "#0a0a14",
                fontFamily: "'JetBrains Mono', monospace",
              }}
              className="py-3 text-sm tracking-wider hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Save size={14} />
              SAVE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HistoryView({ sessions, settings, volume, onLog }) {
  const [isLoggingPast, setIsLoggingPast] = useState(false);
  const recent = sessions.slice(-21).reverse();

  if (isLoggingPast) {
    return (
      <LogSessionForm
        defaultDate={todayISO()}
        editableDate={true}
        settings={settings}
        sessions={sessions}
        volume={volume}
        onCancel={() => setIsLoggingPast(false)}
        onSubmit={(data) => {
          onLog(data);
          setIsLoggingPast(false);
        }}
      />
    );
  }

  return (
    <div className="px-6">
      <div className="flex items-center justify-between mb-4">
        <h3
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            color: COLORS.text,
            letterSpacing: "0.05em",
          }}
          className="text-2xl"
        >
          RECENT SESSIONS
        </h3>
        <button
          onClick={() => setIsLoggingPast(true)}
          style={{
            backgroundColor: "transparent",
            color: COLORS.text,
            border: `1px solid ${COLORS.border}`,
            fontFamily: "'JetBrains Mono', monospace",
          }}
          className="px-3 py-2 text-xs tracking-wider hover:bg-white hover:bg-opacity-5 transition-colors"
        >
          + LOG PAST DAY
        </button>
      </div>

      {recent.length === 0 ? (
        <div
          style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}` }}
          className="p-8 text-center"
        >
          <p style={{ color: COLORS.muted }}>No sessions logged yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {recent.map((s) => {
            const config = DAY_TYPES[s.actualDayType];
            const Icon = config.icon;
            return (
              <div
                key={s.date}
                style={{
                  backgroundColor: COLORS.surface,
                  borderLeft: `3px solid ${config.accent}`,
                }}
                className="p-3 flex items-center gap-4"
              >
                <div
                  style={{ fontFamily: "'JetBrains Mono', monospace", color: COLORS.muted }}
                  className="text-xs tracking-wider w-20"
                >
                  {formatDate(s.date).toUpperCase()}
                </div>
                <Icon size={16} style={{ color: config.accent }} />
                <div style={{ color: COLORS.text }} className="text-sm flex-1">
                  {config.name}
                  {!s.completed && (
                    <span
                      style={{ color: COLORS.muted, fontFamily: "'JetBrains Mono', monospace" }}
                      className="text-xs ml-2"
                    >
                      [SKIPPED]
                    </span>
                  )}
                  {s.scheduledDayType !== s.actualDayType && (
                    <span
                      style={{ color: COLORS.muted, fontFamily: "'JetBrains Mono', monospace" }}
                      className="text-xs ml-2"
                    >
                      [SWAPPED FROM {DAY_TYPES[s.scheduledDayType].short}]
                    </span>
                  )}
                </div>
                <div className="flex gap-4 text-xs" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {s.postSessionRPE != null && (
                    <span style={{ color: COLORS.muted }}>
                      RPE <span style={{ color: COLORS.text }}>{s.postSessionRPE}</span>
                    </span>
                  )}
                  {s.wipeoutMinutes != null && (
                    <span style={{ color: COLORS.muted }}>
                      WO{" "}
                      <span
                        style={{
                          color:
                            s.wipeoutMinutes > 30
                              ? "#fbbf24"
                              : s.wipeoutMinutes > 15
                              ? COLORS.text
                              : "#4ade80",
                        }}
                      >
                        {s.wipeoutMinutes}m
                      </span>
                    </span>
                  )}
                  {s.performanceQuality != null && (
                    <span style={{ color: COLORS.muted }}>
                      PQ <span style={{ color: COLORS.text }}>{s.performanceQuality}/5</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InsightsView({ sessions, insights, settings }) {
  const chartData = useMemo(() => {
    return sessions
      .filter((s) => s.completed && s.wipeoutMinutes != null)
      .slice(-14)
      .map((s) => ({
        date: s.date.slice(5),
        wipeout: s.wipeoutMinutes,
        rpe: s.postSessionRPE,
      }));
  }, [sessions]);

  const statusColor = {
    "warming-up": COLORS.muted,
    good: "#4ade80",
    neutral: COLORS.text,
    warning: "#fbbf24",
    deload: "#ff3e9d",
    progress: "#3ee5ff",
  }[insights.status];

  return (
    <div className="px-6 space-y-4">
      <div
        style={{
          backgroundColor: COLORS.surface,
          borderLeft: `3px solid ${statusColor}`,
        }}
        className="p-5"
      >
        <div className="flex items-start gap-3">
          {insights.status === "deload" && (
            <AlertTriangle size={20} style={{ color: statusColor }} className="mt-1" />
          )}
          {insights.status === "progress" && (
            <TrendingUp size={20} style={{ color: statusColor }} className="mt-1" />
          )}
          <div className="flex-1">
            <h3
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                color: COLORS.text,
                letterSpacing: "0.05em",
              }}
              className="text-2xl"
            >
              {insights.status.toUpperCase().replace("-", " ")}
            </h3>
            <p style={{ color: COLORS.text }} className="text-sm mt-2 opacity-90">
              {insights.message}
            </p>
            <p
              style={{ color: statusColor, fontFamily: "'JetBrains Mono', monospace" }}
              className="text-sm mt-3"
            >
              ▸ {insights.recommendation}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div
          style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}` }}
          className="p-4"
        >
          <div
            style={{ color: COLORS.muted, fontFamily: "'JetBrains Mono', monospace" }}
            className="text-xs tracking-wider mb-1"
          >
            AVG WIPEOUT
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", color: COLORS.text }} className="text-2xl">
            {insights.avgWipeout != null ? `${Math.round(insights.avgWipeout)}m` : "—"}
          </div>
        </div>
        <div
          style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}` }}
          className="p-4"
        >
          <div
            style={{ color: COLORS.muted, fontFamily: "'JetBrains Mono', monospace" }}
            className="text-xs tracking-wider mb-1"
          >
            TREND
          </div>
          <div className="flex items-center gap-2">
            {insights.trend === "improving" && (
              <>
                <TrendingDown size={20} style={{ color: "#4ade80" }} />
                <span style={{ color: "#4ade80" }} className="text-sm">Improving</span>
              </>
            )}
            {insights.trend === "worsening" && (
              <>
                <TrendingUp size={20} style={{ color: "#fbbf24" }} />
                <span style={{ color: "#fbbf24" }} className="text-sm">Worsening</span>
              </>
            )}
            {insights.trend === "neutral" && (
              <>
                <Minus size={20} style={{ color: COLORS.muted }} />
                <span style={{ color: COLORS.text }} className="text-sm">Stable</span>
              </>
            )}
          </div>
        </div>
        <div
          style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}` }}
          className="p-4"
        >
          <div
            style={{ color: COLORS.muted, fontFamily: "'JetBrains Mono', monospace" }}
            className="text-xs tracking-wider mb-1"
          >
            LEVEL
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", color: COLORS.text }} className="text-2xl">
            {settings.volumeLevel}
          </div>
          <div style={{ color: COLORS.muted, fontFamily: "'JetBrains Mono', monospace" }} className="text-xs">
            {VOLUME_LEVELS[settings.volumeLevel].label}
          </div>
        </div>
      </div>

      {chartData.length > 0 && (
        <div
          style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}` }}
          className="p-5"
        >
          <h4
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              color: COLORS.text,
              letterSpacing: "0.05em",
            }}
            className="text-xl mb-3"
          >
            WIPEOUT TRACE
          </h4>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <XAxis
                dataKey="date"
                tick={{ fill: COLORS.muted, fontSize: 10, fontFamily: "monospace" }}
                stroke={COLORS.border}
              />
              <YAxis
                tick={{ fill: COLORS.muted, fontSize: 10, fontFamily: "monospace" }}
                stroke={COLORS.border}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: COLORS.surfaceLight,
                  border: `1px solid ${COLORS.border}`,
                  color: COLORS.text,
                }}
              />
              <ReferenceLine y={30} stroke="#fbbf24" strokeDasharray="3 3" />
              <ReferenceLine y={15} stroke="#4ade80" strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey="wipeout"
                stroke={COLORS.accent}
                strokeWidth={2}
                dot={{ fill: COLORS.accent, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <div
            style={{ color: COLORS.muted, fontFamily: "'JetBrains Mono', monospace" }}
            className="text-xs mt-2"
          >
            Green line = good recovery (&le;15m) · Amber line = warning threshold (30m)
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsView({ settings, onUpdate, sessions, onResetData, onImportData }) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [exportText, setExportText] = useState("");
  const [exportCopied, setExportCopied] = useState(false);
  const [importText, setImportText] = useState("");
  const [importStatus, setImportStatus] = useState(null);
  const [confirmImport, setConfirmImport] = useState(false);

  const handleExport = async () => {
    const data = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      sessions,
      settings,
    };
    const json = JSON.stringify(data, null, 2);
    setExportText(json);
    setExportCopied(false);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(json);
        setExportCopied(true);
      }
    } catch {
      // Clipboard not available — user can copy from textarea
    }
  };

  const handleImport = () => {
    setImportStatus(null);
    try {
      const data = JSON.parse(importText);
      if (!Array.isArray(data.sessions)) {
        setImportStatus({ ok: false, msg: "Invalid format: 'sessions' must be an array" });
        return;
      }
      if (!data.settings || typeof data.settings !== "object") {
        setImportStatus({ ok: false, msg: "Invalid format: 'settings' is missing" });
        return;
      }
      onImportData(data);
      setImportStatus({ ok: true, msg: `Imported ${data.sessions.length} session${data.sessions.length !== 1 ? "s" : ""}` });
      setImportText("");
      setConfirmImport(false);
    } catch (e) {
      setImportStatus({ ok: false, msg: `Parse error: ${e.message}` });
    }
  };

  return (
    <div className="px-6 space-y-4">
      <div
        style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}` }}
        className="p-5"
      >
        <h3
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            color: COLORS.text,
            letterSpacing: "0.05em",
          }}
          className="text-2xl mb-3"
        >
          VOLUME LEVEL
        </h3>
        <div className="grid grid-cols-5 gap-2 mb-3">
          {[1, 2, 3, 4, 5].map((level) => (
            <button
              key={level}
              onClick={() => onUpdate({ ...settings, volumeLevel: level })}
              style={{
                backgroundColor: settings.volumeLevel === level ? COLORS.accent : COLORS.surfaceLight,
                color: settings.volumeLevel === level ? "#0a0a14" : COLORS.text,
                fontFamily: "'JetBrains Mono', monospace",
              }}
              className="py-3 text-sm"
            >
              {level}
            </button>
          ))}
        </div>
        <div style={{ color: COLORS.muted, fontFamily: "'JetBrains Mono', monospace" }} className="text-xs">
          LEVEL {settings.volumeLevel}: {VOLUME_LEVELS[settings.volumeLevel].label} · Peak {VOLUME_LEVELS[settings.volumeLevel].peak.songs} songs · Stamina {VOLUME_LEVELS[settings.volumeLevel].stamina}min · Technique {VOLUME_LEVELS[settings.volumeLevel].technique}min
        </div>
      </div>

      <div
        style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}` }}
        className="p-5"
      >
        <h3
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            color: COLORS.text,
            letterSpacing: "0.05em",
          }}
          className="text-2xl mb-3"
        >
          WEEKLY SCHEDULE
        </h3>
        <div className="space-y-2">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => {
            const dayType = settings.schedule[i];
            const config = DAY_TYPES[dayType];
            return (
              <div key={day} className="flex items-center gap-3">
                <div
                  style={{ color: COLORS.muted, fontFamily: "'JetBrains Mono', monospace" }}
                  className="text-xs tracking-wider w-12"
                >
                  {day.toUpperCase()}
                </div>
                <select
                  value={dayType}
                  onChange={(e) => {
                    const newSchedule = [...settings.schedule];
                    newSchedule[i] = e.target.value;
                    onUpdate({ ...settings, schedule: newSchedule });
                  }}
                  style={{
                    backgroundColor: COLORS.surfaceLight,
                    color: COLORS.text,
                    border: `1px solid ${COLORS.border}`,
                    borderLeft: `3px solid ${config.accent}`,
                  }}
                  className="flex-1 p-2"
                >
                  <option value="peak">Peak</option>
                  <option value="stamina">Stamina</option>
                  <option value="technique">Technique</option>
                  <option value="upperLift">Upper Lift</option>
                  <option value="lowerLift">Lower Lift</option>
                  <option value="rest">Rest</option>
                </select>
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}` }}
        className="p-5"
      >
        <h3
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            color: COLORS.text,
            letterSpacing: "0.05em",
          }}
          className="text-2xl mb-2"
        >
          BACKUP & RESTORE
        </h3>
        <p style={{ color: COLORS.muted }} className="text-sm mb-4">
          In-browser storage isn't fully reliable across sessions and updates. Export
          your data periodically and save it somewhere safe (a text file, password
          manager note, etc.). {sessions.length} session
          {sessions.length !== 1 ? "s" : ""} currently stored.
        </p>

        <div className="mb-5">
          <div style={{ color: COLORS.muted, fontFamily: "'JetBrains Mono', monospace" }} className="text-xs tracking-wider mb-2">
            EXPORT
          </div>
          <button
            onClick={handleExport}
            style={{
              backgroundColor: COLORS.accent2,
              color: "#0a0a14",
              fontFamily: "'JetBrains Mono', monospace",
            }}
            className="px-4 py-2 text-xs tracking-wider hover:opacity-90 transition-opacity"
          >
            GENERATE EXPORT
          </button>
          {exportText && (
            <div className="mt-3">
              {exportCopied && (
                <p style={{ color: "#4ade80", fontFamily: "'JetBrains Mono', monospace" }} className="text-xs mb-2">
                  ✓ COPIED TO CLIPBOARD
                </p>
              )}
              <textarea
                readOnly
                value={exportText}
                rows={6}
                onClick={(e) => e.target.select()}
                style={{
                  backgroundColor: COLORS.surfaceLight,
                  color: COLORS.text,
                  border: `1px solid ${COLORS.border}`,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
                className="w-full p-2 text-xs resize-none"
              />
              <p style={{ color: COLORS.muted, fontFamily: "'JetBrains Mono', monospace" }} className="text-xs mt-1">
                Click textarea to select all, then copy.
              </p>
            </div>
          )}
        </div>

        <div>
          <div style={{ color: COLORS.muted, fontFamily: "'JetBrains Mono', monospace" }} className="text-xs tracking-wider mb-2">
            IMPORT
          </div>
          <textarea
            value={importText}
            onChange={(e) => { setImportText(e.target.value); setImportStatus(null); setConfirmImport(false); }}
            placeholder="Paste exported JSON here..."
            rows={6}
            style={{
              backgroundColor: COLORS.surfaceLight,
              color: COLORS.text,
              border: `1px solid ${COLORS.border}`,
              fontFamily: "'JetBrains Mono', monospace",
            }}
            className="w-full p-2 text-xs resize-none mb-2"
          />
          {!confirmImport ? (
            <button
              onClick={() => setConfirmImport(true)}
              disabled={!importText.trim()}
              style={{
                backgroundColor: importText.trim() ? COLORS.accent2 : COLORS.surfaceLight,
                color: importText.trim() ? "#0a0a14" : COLORS.muted,
                fontFamily: "'JetBrains Mono', monospace",
                cursor: importText.trim() ? "pointer" : "not-allowed",
              }}
              className="px-4 py-2 text-xs tracking-wider transition-opacity"
            >
              RESTORE FROM JSON
            </button>
          ) : (
            <div>
              <p style={{ color: "#fbbf24", fontFamily: "'JetBrains Mono', monospace" }} className="text-xs mb-2 flex items-center gap-2">
                <AlertTriangle size={12} />
                This will replace all current data ({sessions.length} session{sessions.length !== 1 ? "s" : ""}).
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleImport}
                  style={{ backgroundColor: "#ff3e9d", color: "#0a0a14", fontFamily: "'JetBrains Mono', monospace" }}
                  className="px-4 py-2 text-xs tracking-wider"
                >
                  CONFIRM RESTORE
                </button>
                <button
                  onClick={() => setConfirmImport(false)}
                  style={{ backgroundColor: "transparent", color: COLORS.muted, border: `1px solid ${COLORS.border}`, fontFamily: "'JetBrains Mono', monospace" }}
                  className="px-4 py-2 text-xs tracking-wider"
                >
                  CANCEL
                </button>
              </div>
            </div>
          )}
          {importStatus && (
            <p style={{ color: importStatus.ok ? "#4ade80" : "#fbbf24", fontFamily: "'JetBrains Mono', monospace" }} className="text-xs mt-2">
              {importStatus.ok ? "✓ " : "✗ "}{importStatus.msg}
            </p>
          )}
        </div>
      </div>

      <div
        style={{ backgroundColor: COLORS.surface, border: `1px solid ${COLORS.border}` }}
        className="p-5"
      >
        <h3
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            color: COLORS.text,
            letterSpacing: "0.05em",
          }}
          className="text-2xl mb-2"
        >
          RESET
        </h3>
        <p style={{ color: COLORS.muted }} className="text-sm mb-3">
          Wipe all sessions and restore default settings.
        </p>
        {!confirmReset ? (
          <button
            onClick={() => setConfirmReset(true)}
            style={{
              backgroundColor: "transparent",
              color: COLORS.muted,
              border: `1px solid ${COLORS.border}`,
              fontFamily: "'JetBrains Mono', monospace",
            }}
            className="px-4 py-2 text-xs tracking-wider hover:text-white"
          >
            RESET ALL DATA
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => { onResetData(); setConfirmReset(false); }}
              style={{ backgroundColor: "#ff3e9d", color: "#0a0a14", fontFamily: "'JetBrains Mono', monospace" }}
              className="px-4 py-2 text-xs tracking-wider"
            >
              CONFIRM RESET
            </button>
            <button
              onClick={() => setConfirmReset(false)}
              style={{ backgroundColor: "transparent", color: COLORS.muted, border: `1px solid ${COLORS.border}`, fontFamily: "'JetBrains Mono', monospace" }}
              className="px-4 py-2 text-xs tracking-wider"
            >
              CANCEL
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================

export default function App() {
  const [view, setView] = useState("today");
  const [sessions, setSessions] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const [s, st] = await Promise.all([
        STORAGE.getSessions(),
        STORAGE.getSettings(),
      ]);
      setSessions(s);
      setSettings(st);
      setLoaded(true);
    })();
  }, []);

  const todaySession = useMemo(
    () => sessions.find((s) => s.date === todayISO()),
    [sessions]
  );

  const volume = VOLUME_LEVELS[settings.volumeLevel];

  const insights = useMemo(
    () => computeInsights(sessions, settings),
    [sessions, settings]
  );

  const handleLog = async (data) => {
    const sessionDate = data.date || todayISO();
    const newSession = {
      ...data,
      date: sessionDate,
      volumeLevel: settings.volumeLevel,
    };
    const updated = sessions.filter((s) => s.date !== sessionDate);
    updated.push(newSession);
    updated.sort((a, b) => a.date.localeCompare(b.date));
    setSessions(updated);
    await STORAGE.saveSessions(updated);
  };

  // Swapping affects today only; a null type clears the swap. The weekly
  // schedule is never touched.
  const handleSwapDay = (newType) => {
    const overrides = { ...settings.overrides };
    if (newType === null) delete overrides[todayISO()];
    else overrides[todayISO()] = newType;
    return handleUpdateSettings({ ...settings, overrides });
  };

  const handleUndo = async () => {
    const updated = sessions.filter((s) => s.date !== todayISO());
    setSessions(updated);
    await STORAGE.saveSessions(updated);
  };

  const handleUpdateSettings = async (newSettings) => {
    setSettings(newSettings);
    await STORAGE.saveSettings(newSettings);
  };

  const handleResetData = async () => {
    setSessions([]);
    setSettings(DEFAULT_SETTINGS);
    await STORAGE.saveSessions([]);
    await STORAGE.saveSettings(DEFAULT_SETTINGS);
  };

  const handleImportData = async (data) => {
    const importedSessions = data.sessions || [];
    const importedSettings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
    setSessions(importedSessions);
    setSettings(importedSettings);
    await STORAGE.saveSessions(importedSessions);
    await STORAGE.saveSettings(importedSettings);
  };

  if (!loaded) {
    return (
      <div
        style={{ backgroundColor: COLORS.bg, color: COLORS.muted, minHeight: "100vh" }}
        className="flex items-center justify-center"
      >
        <span style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-xs">
          LOADING...
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: COLORS.bg,
        color: COLORS.text,
        minHeight: "100vh",
        fontFamily: "'Manrope', sans-serif",
      }}
    >
      <Header view={view} setView={setView} />

      <div className="pb-12 max-w-2xl mx-auto">
        {view === "today" && (
          <TodayView
            todaySession={todaySession}
            settings={settings}
            volume={volume}
            onLog={handleLog}
            onSwapDay={handleSwapDay}
            onUndo={handleUndo}
          />
        )}
        {view === "history" && (
          <HistoryView
            sessions={sessions}
            settings={settings}
            volume={volume}
            onLog={handleLog}
          />
        )}
        {view === "insights" && (
          <InsightsView sessions={sessions} insights={insights} settings={settings} />
        )}
        {view === "settings" && (
          <SettingsView
            settings={settings}
            onUpdate={handleUpdateSettings}
            sessions={sessions}
            onResetData={handleResetData}
            onImportData={handleImportData}
          />
        )}
      </div>
    </div>
  );
}

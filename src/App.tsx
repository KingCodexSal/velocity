import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Minus,
  Music,
  Settings,
  Home,
  CheckCircle,
  Search,
  Square,
  Loader2,
  List,
  Pause,
  PlayCircle,
  Clock,
  HardDrive,
  Shield,
  Zap,
  Folder,
  Moon,
  Sun,
  Type,
  Video,
  AlertTriangle,
  FileSearch,
} from "lucide-react";

// --- TYPESCRIPT FIX: DECLARE ELECTRON INTERFACE ---
declare global {
  interface Window {
    electron: {
      invoke: (channel: string, ...args: any[]) => Promise<any>;
      send: (channel: string, ...args: any[]) => void;
      on: (channel: string, func: (...args: any[]) => void) => void;
    };
  }
}

export default function App() {
  const [tab, setTab] = useState("home");
  const [url, setUrl] = useState("");
  const [darkMode, setDarkMode] = useState(() =>
    JSON.parse(localStorage.getItem("v_dark") || "false"),
  );
  const [savePath, setSavePath] = useState(
    () => localStorage.getItem("v_path") || "",
  );
  const [isPrivate, setIsPrivate] = useState(() =>
    JSON.parse(localStorage.getItem("v_priv") || "false"),
  );
  const [getSubtitle, setGetSubtitle] = useState(() =>
    JSON.parse(localStorage.getItem("v_subs") || "false"),
  );
  const [historySearch, setHistorySearch] = useState("");

  const [status, setStatus] = useState<"idle" | "searching" | "ready">("idle");
  const [video, setVideo] = useState<any>(null);
  const [isAudioOnly, setIsAudioOnly] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);

  const [tasks, setTasks] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("v_history_vfinal") || "[]");
    } catch {
      return [];
    }
  });
  const [showQueue, setShowQueue] = useState(false);

  useEffect(() => {
    localStorage.setItem("v_dark", JSON.stringify(darkMode));
    localStorage.setItem("v_path", savePath);
    localStorage.setItem("v_priv", JSON.stringify(isPrivate));
    localStorage.setItem("v_subs", JSON.stringify(getSubtitle));
  }, [darkMode, savePath, isPrivate, getSubtitle]);

  useEffect(() => {
    if (!isPrivate)
      localStorage.setItem("v_history_vfinal", JSON.stringify(history));
  }, [history, isPrivate]);

  useEffect(() => {
    window.electron.on("download-progress", ({ id, progress, size }: any) => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, progress, size: size || t.size } : t,
        ),
      );
    });

    window.electron.on(
      "download-complete",
      ({ id, success, finalSize, folder, filename }: any) => {
        setTasks((prev) => {
          const item = prev.find((t) => t.id === id);
          if (item && success && !isPrivate) {
            setHistory((h) => {
              const absPath = folder + "\\" + filename;
              // Prevent duplicate entries
              if (h.some((x) => x.fullPath === absPath)) return h;

              return [
                {
                  ...item,
                  id: Date.now(),
                  size: finalSize || item.size,
                  time:
                    new Date().toLocaleDateString() +
                    " " +
                    new Date().toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    }),
                  fullPath: absPath,
                  folder: folder, // Store the folder used
                },
                ...h,
              ];
            });
          }
          return prev.filter((t) => t.id !== id);
        });
      },
    );
  }, [isPrivate]);

  const handleFetch = async () => {
    if (!url) return;
    setStatus("searching");
    setAppError(null);
    try {
      const info = await window.electron.invoke("fetch-info", url);
      setVideo({ ...info, url, selectedRes: info.formats[0] });
      setStatus("ready");
    } catch (e: any) {
      setStatus("idle");
      setAppError("Link not working. Try copying the link again.");
      setTimeout(() => setAppError(null), 6000);
    }
  };

  const startDownload = (resumeTask?: any) => {
    const id = resumeTask
      ? resumeTask.id
      : Math.random().toString(36).substr(2, 9);
    const meta = resumeTask
      ? resumeTask.meta
      : {
          url: video.url,
          height: video.selectedRes.height,
          isAudio: isAudioOnly,
          title: video.title,
        };

    if (!resumeTask) {
      // New download
      setTasks((prev) => [
        {
          id,
          title: meta.title,
          progress: 0,
          status: "downloading",
          meta,
          size: "",
        },
        ...prev,
      ]);
    } else {
      // Resuming existing download
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: "downloading" } : t)),
      );
    }

    window.electron.invoke("start-download", {
      id,
      ...meta,
      savePath,
      subtitle: getSubtitle,
    });

    if (!resumeTask) {
      setStatus("idle");
      setVideo(null);
      setUrl("");
      setShowQueue(true);
    }
  };

  const controlTask = (id: string, action: string) => {
    if (action === "resume") {
      // Find the task data we already have
      const task = tasks.find((t) => t.id === id);
      if (task) {
        // Re-run startDownload using the saved meta-data
        // This restarts the engine, and --continue picks up the .part file
        startDownload(task);
      }
    } else {
      // Tell Electron to kill the process
      window.electron.invoke("process-control", { id, action });

      if (action === "cancel") {
        setTasks((prev) => prev.filter((t) => t.id !== id));
      } else if (action === "pause") {
        // Keep it in the list but mark it as paused
        setTasks((prev) =>
          prev.map((t) => (t.id === id ? { ...t, status: "paused" } : t)),
        );
      }
    }
  };

  const revealFile = async (item: any) => {
    const res = await window.electron.invoke("open-file-location", {
      fullPath: item.fullPath,
    });
    if (!res.success) {
      setAppError(res.error);
      setTimeout(() => setAppError(null), 6000);
    }
  };

  const filteredHistory = history.filter((item) =>
    item.title?.toLowerCase().includes(historySearch.toLowerCase()),
  );

  return (
    <div
      className={`flex h-screen bg-transparent overflow-hidden select-none relative transition-all duration-500 ${darkMode ? "dark text-white" : "light text-slate-900"}`}
    >
      <div className="velocity-bg" />

      {/* Sidebar */}
      <nav
        className={`w-20 border-r flex flex-col items-center py-8 gap-8 z-50 ${darkMode ? "border-white/5 bg-black/40" : "border-black/5 bg-white/70"}`}
      >
        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-velocity shadow-lg shadow-velocity/20">
          <Zap size={24} fill="currentColor" className="text-white" />
        </div>
        <NavIcon
          icon={<Home size={22} />}
          active={tab === "home"}
          onClick={() => setTab("home")}
        />
        <NavIcon
          icon={<Clock size={22} />}
          active={tab === "history"}
          onClick={() => setTab("history")}
        />
        <NavIcon
          icon={<Settings size={22} />}
          active={tab === "settings"}
          onClick={() => setTab("settings")}
        />
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="mt-auto p-3 hover:bg-black/5 rounded-xl transition-all"
        >
          {darkMode ? (
            <Sun size={20} className="text-yellow-500" />
          ) : (
            <Moon size={20} className="text-velocity" />
          )}
        </button>
      </nav>

      {/* Error Message */}
      <AnimatePresence>
        {appError && (
          <motion.div
            initial={{ y: -100 }}
            animate={{ y: 24 }}
            exit={{ y: -100 }}
            className="fixed top-0 left-0 right-0 z-[150] flex justify-center px-4 pointer-events-none"
          >
            <div className="glass bg-rose-500/10 border border-rose-500/50 p-4 rounded-xl flex items-center gap-4 shadow-2xl max-w-lg pointer-events-auto">
              <AlertTriangle className="text-rose-500" />
              <p className="text-[11px] font-black leading-tight uppercase tracking-widest">
                {appError}
              </p>
              <button
                onClick={() => setAppError(null)}
                className="p-1 hover:bg-black/10 rounded transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col relative bg-transparent">
        <header className="h-14 flex justify-end items-center px-6 drag-region relative z-[110]">
          <div className="flex gap-2 no-drag">
            <button
              onClick={() => window.electron.send("minimize-app")}
              className={`p-2 rounded-lg transition-all ${darkMode ? "hover:bg-white/10" : "hover:bg-black/5"}`}
            >
              <Minus size={18} />
            </button>
            <button
              onClick={() => window.electron.send("maximize-app")}
              className={`p-2 rounded-lg transition-all ${darkMode ? "hover:bg-white/10" : "hover:bg-black/5"}`}
            >
              <Square size={14} />
            </button>
            <button
              onClick={() => window.electron.send("close-app")}
              className="p-2 hover:bg-rose-500/20 text-rose-500 rounded-lg transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="flex-1 p-10 overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="wait">
            {tab === "home" && (
              <motion.div
                key="h"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="max-w-4xl mx-auto h-full flex flex-col justify-center"
              >
                {status !== "ready" ? (
                  <div className="text-center w-full max-w-xl mx-auto">
                    <h1 className="text-8xl font-black italic tracking-tighter uppercase mb-4">
                      Velocity
                    </h1>
                    <p
                      className={`opacity-40 text-[10px] font-bold uppercase tracking-[0.5em] mb-12 ${darkMode ? "text-white" : "text-black"}`}
                    >
                      Easy Media Downloader
                    </p>
                    <div
                      className={`flex glass rounded-xl p-2 w-full border ${darkMode ? "border-white/10" : "border-black/10"} shadow-2xl`}
                    >
                      <input
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleFetch()}
                        placeholder="Paste your video link here..."
                        className={`flex-1 bg-transparent px-6 py-4 outline-none font-bold text-sm italic ${darkMode ? "placeholder:text-white/20" : "placeholder:text-black/20"}`}
                      />
                      <button
                        onClick={handleFetch}
                        className="bg-velocity text-white px-10 rounded-lg font-black text-xs uppercase hover:scale-105 active:scale-95 transition-all"
                      >
                        {status === "searching" ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          "Check Link"
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <motion.div
                    layoutId="card"
                    className={`glass rounded-xl overflow-hidden shadow-3xl flex flex-col md:flex-row w-full border ${darkMode ? "border-white/10" : "border-black/10"}`}
                  >
                    <div className="md:w-1/2 p-8 border-b md:border-b-0 md:border-r border-white/5 flex flex-col justify-center bg-black/[0.03]">
                      <img
                        src={video.thumbnail}
                        className="aspect-video rounded-lg object-cover shadow-2xl mb-6 border border-black/5"
                      />
                      <h3
                        className={`text-xl font-black italic line-clamp-2 uppercase leading-none mb-6 ${darkMode ? "text-white" : "text-slate-900"}`}
                      >
                        {video.title}
                      </h3>
                      <button
                        onClick={() => setStatus("idle")}
                        className="text-[10px] font-bold text-velocity uppercase tracking-widest self-start hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="md:w-1/2 p-10 flex flex-col justify-center gap-8 bg-black/[0.01]">
                      <div className="flex justify-between items-center px-2">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-widest opacity-40 italic ${darkMode ? "text-white" : "text-black"}`}
                        >
                          Video Quality
                        </span>
                        <div className="flex bg-black/5 p-1 rounded-lg border border-black/5">
                          <button
                            onClick={() => setIsAudioOnly(false)}
                            className={`p-2 rounded-md transition-all ${!isAudioOnly ? "bg-velocity text-white shadow-md" : "text-slate-400"}`}
                          >
                            <Video size={16} />
                          </button>
                          <button
                            onClick={() => setIsAudioOnly(true)}
                            className={`p-2 rounded-md transition-all ${isAudioOnly ? "bg-velocity text-white shadow-md" : "text-slate-400"}`}
                          >
                            <Music size={16} />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                        {!isAudioOnly ? (
                          video.formats.map((f: any) => (
                            <button
                              key={f.id}
                              onClick={() =>
                                setVideo({ ...video, selectedRes: f })
                              }
                              className={`p-4 rounded-xl border text-[10px] font-black transition-all ${
                                video.selectedRes?.id === f.id
                                  ? "bg-velocity text-white border-velocity shadow-lg"
                                  : "bg-black/5 border-black/5 text-slate-400 hover:bg-black/10"
                              }`}
                            >
                              {f.res}
                            </button>
                          ))
                        ) : (
                          <div className="col-span-2 p-10 text-center border-2 border-dashed border-black/10 rounded-xl italic text-[10px] uppercase font-bold opacity-30 tracking-widest">
                            Audio Mode Only
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => startDownload()}
                        className="w-full h-16 bg-velocity text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-2xl"
                      >
                        Start Download
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {tab === "history" && (
              <motion.div
                key="hist"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-4xl mx-auto py-6 w-full"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 px-2">
                  <h2 className="text-5xl font-black italic uppercase tracking-tighter leading-none">
                    History.
                  </h2>
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                      <Search
                        className={`absolute left-3 top-1/2 -translate-y-1/2 ${darkMode ? "text-white/20" : "text-black/20"}`}
                        size={14}
                      />
                      <input
                        value={historySearch}
                        onChange={(e) => setHistorySearch(e.target.value)}
                        placeholder="Search your files..."
                        className={`w-full pl-10 pr-4 py-2 glass rounded-lg text-[10px] font-bold uppercase tracking-widest outline-none border border-black/5 focus:border-velocity transition-all ${darkMode ? "text-white" : "text-slate-900"}`}
                      />
                    </div>
                    <button
                      onClick={() => setHistory([])}
                      className="text-[10px] font-bold text-rose-500 uppercase tracking-widest px-4 py-2 hover:bg-rose-500/10 rounded-lg transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
                <div className="space-y-2 pb-20">
                  {filteredHistory.length === 0 ? (
                    <div className="py-20 text-center opacity-10 uppercase tracking-[1em]">
                      No files found
                    </div>
                  ) : (
                    filteredHistory.map((item) => (
                      <div
                        key={item.id}
                        className={`glass p-5 rounded-xl flex items-center justify-between border ${darkMode ? "border-white/10" : "border-black/5"} group transition-all`}
                      >
                        <div className="flex items-center gap-5 truncate">
                          <div className="w-10 h-10 bg-velocity/10 rounded-lg flex items-center justify-center text-velocity shadow-inner">
                            <CheckCircle size={18} />
                          </div>
                          <div className="truncate pr-8">
                            <p
                              className={`text-sm font-bold truncate italic ${darkMode ? "text-white" : "text-slate-900"}`}
                            >
                              {item?.title}
                            </p>
                            <div className="flex gap-4 text-[9px] font-mono opacity-40 uppercase font-bold tabular-nums tracking-wider leading-none">
                              <span>{item?.time}</span>
                              <span>{item?.size || "Done"}</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => revealFile(item)}
                          className="px-5 py-2 bg-velocity text-white rounded-lg font-bold text-[9px] uppercase transition-all opacity-0 group-hover:opacity-100 flex items-center gap-2"
                        >
                          <FileSearch size={14} /> Open Folder
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {tab === "settings" && (
              <motion.div
                key="s"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-3xl mx-auto py-10 w-full"
              >
                <h2 className="text-4xl font-black italic mb-10 tracking-tighter uppercase underline decoration-velocity decoration-4 underline-offset-8">
                  Settings
                </h2>
                <div className="space-y-4">
                  <div className="glass p-8 rounded-xl space-y-4 shadow-xl">
                    <label className="text-velocity font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                      <Folder size={14} /> Save Folder
                    </label>
                    <div className="flex gap-2">
                      <div
                        className={`flex-1 bg-black/5 px-5 py-4 rounded-lg border border-black/5 text-xs font-mono truncate italic opacity-60 ${darkMode ? "text-white" : "text-slate-900"}`}
                      >
                        {savePath || "Using System Downloads"}
                      </div>
                      <button
                        onClick={async () => {
                          const p =
                            await window.electron.invoke("select-folder");
                          if (p) setSavePath(p);
                        }}
                        className="bg-velocity text-white px-8 rounded-lg font-black text-[10px] uppercase shadow-lg"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                  <div className="glass p-8 rounded-xl flex justify-between items-center shadow-md">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-rose-500/10 rounded-lg flex items-center justify-center text-rose-500">
                        <Shield size={20} />
                      </div>
                      <div>
                        <p
                          className={`text-sm font-bold italic ${darkMode ? "text-white" : "text-slate-900"}`}
                        >
                          Incognito Mode
                        </p>
                        <p className="text-[9px] opacity-30 uppercase font-bold tracking-widest">
                          Don't save history
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsPrivate(!isPrivate)}
                      className={`w-12 h-6 rounded-full relative transition-all ${isPrivate ? "bg-rose-500 shadow-lg" : "bg-slate-300"}`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isPrivate ? "right-1" : "left-1"}`}
                      />
                    </button>
                  </div>
                  <div className="glass p-8 rounded-xl flex justify-between items-center border-indigo-500/20 shadow-md">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-600/10 rounded-lg flex items-center justify-center text-indigo-600">
                        <Type size={20} />
                      </div>
                      <div>
                        <p
                          className={`text-sm font-bold italic ${darkMode ? "text-white" : "text-slate-900"}`}
                        >
                          Attach Subtitles
                        </p>
                        <p className="text-[9px] opacity-30 uppercase font-bold tracking-widest">
                          Add captions to video
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setGetSubtitle(!getSubtitle)}
                      className={`w-12 h-6 rounded-full relative transition-all ${getSubtitle ? "bg-indigo-600 shadow-lg" : "bg-slate-300"}`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${getSubtitle ? "right-1" : "left-1"}`}
                      />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Live Downloads Drawer */}
        <AnimatePresence>
          {showQueue && (
            <motion.div
              initial={{ x: 400 }}
              animate={{ x: 0 }}
              exit={{ x: 400 }}
              className={`fixed top-14 right-0 h-[calc(100%-3.5rem)] w-96 z-[100] border-l shadow-2xl flex flex-col ${darkMode ? "bg-[#0a0a0c]/95 border-white/10" : "bg-white/95 border-black/10"}`}
            >
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/5 backdrop-blur-xl">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-velocity italic">
                  Active Downloads
                </span>
                <button onClick={() => setShowQueue(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {tasks.map((task) => (
                  <motion.div
                    layout
                    key={task.id}
                    className={`p-4 rounded-xl border space-y-4 shadow-xl ${darkMode ? "bg-white/[0.03] border-white/5" : "bg-black/[0.03] border-black/10"}`}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 truncate pr-2">
                        <p
                          className={`text-[11px] font-bold truncate italic mb-1 ${darkMode ? "text-white" : "text-slate-900"}`}
                        >
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 text-[9px] font-bold opacity-30 uppercase tracking-widest leading-none">
                          <HardDrive size={10} />{" "}
                          {task.size || "Calculating..."}
                        </div>
                      </div>
                      <div className="flex gap-1 no-drag">
                        <motion.button
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() =>
                            controlTask(
                              task.id,
                              task.status === "paused" ? "resume" : "pause",
                            )
                          }
                          className="p-2 hover:bg-black/5 rounded transition-colors"
                        >
                          {task.status === "paused" ? (
                            <PlayCircle
                              size={18}
                              className="text-velocity animate-pulse"
                            />
                          ) : (
                            <Pause
                              size={18}
                              className={
                                darkMode ? "text-white" : "text-slate-900"
                              }
                            />
                          )}
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => controlTask(task.id, "cancel")}
                          className="p-2 hover:bg-rose-500/10 text-rose-500 rounded transition-colors"
                        >
                          <X size={18} />
                        </motion.button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1 bg-black/5 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-velocity shadow-[0_0_15px_#ff4500]"
                          initial={{ width: 0 }}
                          animate={{ width: `${task.progress}%` }}
                          transition={{ duration: 0.8 }}
                        />
                      </div>
                      <span className="text-[10px] font-mono w-10 text-right opacity-40 font-bold tabular-nums">
                        {Math.round(task.progress)}%
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowQueue(true)}
          className="fixed bottom-8 right-8 w-16 h-16 bg-velocity text-white rounded-xl flex items-center justify-center shadow-3xl shadow-velocity/30 z-50"
        >
          <List size={28} />
          {tasks.length > 0 && (
            <span className="absolute -top-1 -right-1 w-6 h-6 bg-white text-black rounded-full text-[10px] font-black flex items-center justify-center shadow-2xl border-4 border-[#fff]">
              {tasks.length}
            </span>
          )}
        </motion.button>
      </main>
    </div>
  );
}

function NavIcon({ icon, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-xl transition-all ${active ? "bg-velocity text-white shadow-xl scale-110" : "opacity-40 hover:opacity-100"}`}
    >
      {icon}
    </button>
  );
}

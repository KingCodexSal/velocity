const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const path = require("path");
const { spawn, exec } = require("child_process");
const os = require("os");
const fs = require("fs");

let mainWindow;

// --- CRITICAL PATHING FIX ---
const isDev = !app.isPackaged;

// In Production, the 'resources' folder is next to the 'app.asar' file
const binPath = isDev
  ? path.join(process.cwd(), "resources", "bin")
  : path.join(process.resourcesPath, "bin");

const YTDLP = path.join(binPath, "yt-dlp.exe");
const FFMPEG = path.join(binPath, "ffmpeg.exe");

const activeProcesses = new Map();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1250,
    height: 850,
    frame: false,
    transparent: true,
    show: false, // Wait until ready to prevent "not opening" feeling
    icon: path.join(__dirname, "../resources/icon.png"),
    webPreferences: {
      // PRELOAD PATH FIX: Points to the current folder where main.cjs is
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    // PACKAGED PATH FIX: Goes up one level from /electron/ to find /dist/
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Log errors if the window fails to load
  mainWindow.webContents.on(
    "did-fail-load",
    (event, errorCode, errorDescription) => {
      console.error("Failed to load:", errorCode, errorDescription);
    },
  );
}

app.whenReady().then(createWindow);

// --- ALL HANDLERS (Registered before any logic) ---
ipcMain.handle("process-control", async (e, { id, action }) => {
  const data = activeProcesses.get(id);
  if (!data) return false;
  data.isManualStop = true;
  if (action === "cancel" || action === "pause") {
    exec(`taskkill /F /T /PID ${data.proc.pid}`, () => {
      if (action === "cancel") {
        activeProcesses.delete(id);
        setTimeout(() => {
          try {
            const files = fs.readdirSync(data.folder);
            files.forEach((f) => {
              if (f.endsWith(".part") || f.endsWith(".ytdl"))
                fs.unlinkSync(path.join(data.folder, f));
            });
          } catch (err) {}
        }, 1500);
      }
    });
  }
  return true;
});

ipcMain.handle("open-file-location", async (e, { fullPath }) => {
  if (fs.existsSync(fullPath)) {
    shell.showItemInFolder(fullPath);
    return { success: true };
  }
  return { success: false, error: "File not found." };
});

ipcMain.handle("fetch-info", async (e, url) => {
  return new Promise((res, rej) => {
    const args = [
      "--ffmpeg-location",
      FFMPEG,
      "--dump-json",
      "--no-playlist",
      "--no-check-certificates",
      "--user-agent",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      url,
    ];
    const proc = spawn(YTDLP, args, { windowsHide: true });
    let out = "",
      err = "";
    proc.stdout.on("data", (d) => (out += d.toString()));
    proc.stderr.on("data", (d) => (err += d.toString()));

    proc.on("close", (code) => {
      if (code !== 0) return rej(err.trim());
      try {
        const m = JSON.parse(out.substring(out.indexOf("{")));

        // --- STRENGTHENED FILTERING ---
        const seenHeights = new Set();
        const formats = (m.formats || [])
          .filter(
            (f) =>
              f.vcodec !== "none" && // Must have video
              f.height && // Must have a height
              f.height >= 144 && // No tiny junk
              !f.format_note?.includes("storyboard"), // No preview images
          )
          .sort((a, b) => b.height - a.height) // Highest resolution first
          .filter((f) => {
            if (seenHeights.has(f.height)) return false;
            seenHeights.add(f.height);
            return true;
          })
          .slice(0, 5) // Limit to top 5 options only
          .map((f) => ({
            id: f.format_id,
            res: `${f.height}p`,
            height: f.height,
          }));

        res({ title: m.title, thumbnail: m.thumbnail, formats });
      } catch (err) {
        rej("Data Parsing Error");
      }
    });
  });
});

ipcMain.handle(
  "start-download",
  async (e, { id, url, height, savePath, isAudio, subtitle }) => {
    let folder = savePath || path.join(os.homedir(), "Downloads", "Velocity");
    if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
    const tag = isAudio ? "[Audio]" : `[${height}p]`;
    const formatStr = isAudio
      ? "bestaudio/best"
      : `bestvideo[height<=${height}]+bestaudio/best`;
    const args = [
      "--ffmpeg-location",
      FFMPEG,
      "--newline",
      "--continue",
      "--no-check-certificates",
      "-o",
      path.join(folder, `%(title)s ${tag}.%(ext)s`),
      "-f",
      formatStr,
      "--merge-output-format",
      "mp4",
      "--user-agent",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      url,
    ];
    if (subtitle) args.push("--write-auto-subs", "--embed-subs");
    const proc = spawn(YTDLP, args, { windowsHide: true });
    activeProcesses.set(id, {
      proc,
      folder,
      lockedSize: "",
      isManualStop: false,
      tag,
    });
    let lastProgress = 0;
    proc.stdout.on("data", (d) => {
      const data = activeProcesses.get(id);
      if (!data) return;
      const str = d.toString();
      const sMatch = str.match(/of\s+(\d+\.\d+)(MiB|GiB|KiB)/i);
      const pMatch = str.match(/(\d+\.\d+)%/);
      if (sMatch && !data.lockedSize)
        data.lockedSize = sMatch[1] + str.match(/(?:MiB|GiB|KiB)/i)[0];
      if (pMatch) {
        const raw = parseFloat(pMatch[1]);
        let smooth = raw < lastProgress ? 96 : raw * 0.96;
        if (smooth > lastProgress) {
          lastProgress = smooth;
          e.sender.send("download-progress", {
            id,
            progress: smooth,
            size: data.lockedSize,
          });
        }
      }
    });
    proc.on("close", (code) => {
      const data = activeProcesses.get(id);
      if (data && !data.isManualStop) {
        const finalSize = data.lockedSize;
        const downloadFolder = data.folder;
        const files = fs.readdirSync(downloadFolder);
        const actualFile = files.find(
          (f) =>
            f.includes(data.tag) &&
            !f.endsWith(".part") &&
            !f.endsWith(".ytdl"),
        );
        activeProcesses.delete(id);
        e.sender.send("download-complete", {
          id,
          success: code === 0,
          finalSize,
          folder: downloadFolder,
          filename: actualFile,
        });
      }
    });
  },
);

ipcMain.handle("select-folder", async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
  });
  return res.filePaths[0];
});

ipcMain.on("close-app", () => app.quit());
ipcMain.on("minimize-app", () => mainWindow.minimize());
ipcMain.on("maximize-app", () =>
  mainWindow.isMaximized() ? mainWindow.restore() : mainWindow.maximize(),
);

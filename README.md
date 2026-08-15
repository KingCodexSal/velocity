# ⚡ Velocity

A modern desktop media downloader built with React, TypeScript, and Electron.

Velocity provides a clean interface for downloading online media while giving users control over format, quality, download location, and download management.

## ✨ Features

- 🎬 Video and audio downloads
- 🎚️ Quality and format selection
- 📥 Download queue management
- 📊 Real-time download progress
- ⏸️ Pause and resume downloads
- ❌ Cancel active downloads
- 📜 Download history
- 🔤 Subtitle support
- 📁 Custom download locations
- 🔎 Media information preview
- 🌙 Dark mode
- 🖥️ Native desktop experience
- ⚙️ FFmpeg-powered media processing

## 🖥️ Screenshots

>
<img width="1919" height="1006" alt="image" src="https://github.com/user-attachments/assets/068b3def-d237-491a-8438-b88fb16641b5" />
<img width="1919" height="1004" alt="image" src="https://github.com/user-attachments/assets/4dde7c56-cdd5-4554-9a21-ba8246df3142" />
<img width="1919" height="1004" alt="image" src="https://github.com/user-attachments/assets/2ea6b5c6-6789-4120-98b6-2045f76fd2fe" />
<img width="1918" height="997" alt="image" src="https://github.com/user-attachments/assets/842f1f47-221a-436e-a71b-431a95688d49" />
<img width="1919" height="992" alt="image" src="https://github.com/user-attachments/assets/6c53510d-d88d-4f24-9f33-7acc735c47e2" />
<img width="1918" height="999" alt="image" src="https://github.com/user-attachments/assets/476d4c96-a241-4855-b9cf-03d917034662" />


## 🛠️ Tech Stack

- **React** — UI development
- **TypeScript** — Type safety
- **Electron** — Desktop application framework
- **Zustand** — State management
- **Tailwind CSS** — Styling
- **Framer Motion** — UI animations
- **Electron Builder** — Application packaging
- **FFmpeg** — Media processing
- **yt-dlp** — Media downloading

## 🏗️ Architecture

Velocity uses Electron's main and renderer processes to separate the desktop functionality from the user interface.

The React renderer communicates with Electron through a preload/IPC layer, allowing the application to perform desktop operations without exposing Node.js directly to the renderer.

### Main technologies

```text
React
   │
   ▼
Renderer Process
   │
   │ IPC
   ▼
Preload Layer
   │
   ▼
Electron Main Process
   │
   ├── yt-dlp
   ├── FFmpeg
   └── File System

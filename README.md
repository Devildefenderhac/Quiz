# 🏆 Engineers' Day Tech Quiz Application

An interactive, high-performance, presentation-ready Tech Quiz web application built for **Engineers’ Day 2026** at **Sandip University (School of Computer Science & Engineering)**.

Designed for high-engagement quiz competitions, live operator control, flexible PDF & text imports, randomized non-repeating question allocation, and automated timer/round management.

---

## 👨‍💻 Developer Credit
**Developer**: Suchit Kumar  
**Event**: Engineers' Day Celebration 2026  
**Institution**: School of Computer Science & Engineering, Sandip University  

---

## 🌟 Key Features

### 1. 📄 Smart Multi-Format Question Importer
- **Universal Question Parser**: Automatically detects and parses questions in multiple formats from uploaded PDFs or raw copied text.
- **Drag & Drop PDF Upload**: Upload question papers directly via drag-and-drop or file picker with instant backend PDF parsing.
- **Direct Copy-Paste Option**: Dedicated paste areas with single-click import buttons for rapid question loading without needing files.

#### Supported Question Formats:
```text
1. What is the capital of France?
A) Paris
B) London
C) Berlin
D) Madrid
Answer: A

2. Which SI unit measures electric current?
A. Volt
B. Ohm
C. Ampere
D. Watt
Ans: C
```
*(Also supports pipe-delimited format: `Question | Option A | Option B | Option C | Option D | Answer Letter`)*

---

### 2. 🔀 Randomized Non-Repeating Question Distribution & Auto-Persistence
- **Zero Duplicates Across Sets**: Upload a pool of questions (e.g., 50 questions) and allocate custom amounts to Set A, Set B, Set C, and Final Round with 100% mathematical guarantee of no overlapping questions across sets.
- **💾 Automatic Storage (`localStorage`)**: All uploaded and configured questions are automatically stored in browser storage and persist across page refreshes.
- **🗑️ Clean Overwrite of Sets**: Adding new questions cleanly replaces old questions in the target sets so previous questions never mix with new uploads.
- **🔄 Reset to Defaults**: Dedicated `🗑️ RESET ALL TO DEFAULT QUESTIONS` button in the Operator Panel to wipe custom storage and restore starter questions at any time.
- **Fisher-Yates Randomization**: Questions are randomly shuffled so sets never receive sequential or predictable batches.
- **🔀 Toggleable Randomizer**: Enable or disable random shuffle directly within the Import Wizard.
- **⚖️ Divide Equally**: Automatically distributes question pools evenly across Set A, Set B, Set C & Final Round without duplicates.
- **★ Copy to All Sets**: Loads the entire pool into all four sets simultaneously with independent random ordering.
- **🎯 Assign to Specific Set**: Instantly loads questions into **Set A**, **Set B**, **Set C**, or the **Final Round**.
- **🔢 Custom Distribution**: Specify exact question numbers for each round.
- **📑 Per-Set Mode**: Manage each set individually with its own PDF dropzone or paste area.

---

### 3. ⏱️ Live Quiz Competition Flow & Visual FX
- **👁️ Standby Ready Screen**: Questions are hidden until the operator reveals them so participants cannot peek early.
- **⚡ Auto-Start Timer**: Clicking **"SEE QUESTION"** reveals the options and automatically starts the 60-second countdown timer.
- **🎯 Instant Answer Feedback**:
  - Immediate visual feedback (green bounce for correct, red shake for wrong).
  - Web Audio API sound effects (correct chime / buzzer).
- **⏩ 10-Second Auto-Advance**: Automatically transitions to the next question after 10 seconds, with an animated progress bar and instant skip button.
- **🎛️ Interactive Top Navigation**: Switch between Set A, Set B, Set C, and Final Round at any moment.
- **🌌 Dynamic Engineering Formula Backdrops**: Floating engineering formulas, math equations (E = mc², Maxwell equations, Ohm's law, Fourier transform, etc.) and tech symbols carefully positioned in negative spaces for a rich aesthetic without overlapping content.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite
- **Styling**: Modern CSS3 (CSS Variables, Flexbox, CSS Grid, Glassmorphism, Micro-animations)
- **Audio**: Web Audio API (real-time synthesizer sound generation)
- **Backend / PDF Service**: Node.js, Express, `pdf-parse`, `multer`

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/Devildefenderhac/Quiz.git
cd Quiz
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run the development server
```bash
npm start
```
*Or run Vite and server concurrently:*
```bash
npm run dev
```

### 4. Open in browser
Visit **`http://localhost:5175`** (or your local port shown in the terminal).

---

## 📂 Project Structure

```
Quiz/
├── server/
│   └── index.js          # Express server with PDF text extraction API
├── src/
│   ├── main.jsx          # React Application & state management
│   └── styles.css        # Theme styles, layout & animations
├── index.html            # HTML entry point
├── package.json          # Dependencies & npm scripts
├── vite.config.js        # Vite configuration
└── README.md             # Project documentation
```

---

## 📜 License & Credits
Developed by **Suchit Kumar** for Sandip University Engineers' Day 2026. Free to use and modify for educational events.

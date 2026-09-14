import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import './styles.css';

// Set up PDF.js worker for client-side extraction (works offline, locally & on GitHub Pages)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

async function extractTextFromPdf(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const items = textContent.items.filter(item => 'str' in item && item.str.length > 0);
      
      // Sort items by vertical position (top to bottom), then horizontal (left to right)
      items.sort((a, b) => {
        const yDiff = b.transform[5] - a.transform[5];
        if (Math.abs(yDiff) > 4) return yDiff;
        return a.transform[4] - b.transform[4];
      });

      let lastY = null;
      let pageText = '';
      for (const item of items) {
        if (lastY !== null && Math.abs(item.transform[5] - lastY) > 4) {
          pageText += '\n';
        } else if (pageText && !pageText.endsWith('\n') && !pageText.endsWith(' ')) {
          pageText += ' ';
        }
        pageText += item.str;
        if (item.hasEOL) pageText += '\n';
        lastY = item.transform[5];
      }
      fullText += pageText + '\n\n';
    }
    if (fullText.trim()) return fullText;
  } catch (err) {
    console.warn('Client-side PDF extraction failed, attempting backend fallback:', err);
  }

  // Fallback to backend API if available
  try {
    const fd = new FormData();
    fd.append('file', file);
    const response = await fetch('/api/import-pdf', { method: 'POST', body: fd });
    const raw = await response.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error('PDF could not be parsed. You can also copy and paste the question text directly.');
    }
    if (!response.ok) throw new Error(data.error || 'The PDF could not be read.');
    return data.text;
  } catch (backendErr) {
    throw new Error('PDF extraction failed. Please ensure the PDF has selectable text or copy and paste the text directly.');
  }
}

const q = (question, options, answer) => ({ question, options, answer });
const initialRounds = {
  A: [q('Which engineer is known as the Father of Indian Engineering?', ['Dr. A. P. J. Abdul Kalam', 'Sir M. Visvesvaraya', 'C. V. Raman', 'Vikram Sarabhai'], 1), q('What does CPU stand for?', ['Central Processing Unit', 'Computer Primary Unit', 'Central Program Utility', 'Core Processing Utility'], 0)],
  B: [q('Which bridge type uses cables to carry its load?', ['Beam bridge', 'Suspension bridge', 'Arch bridge', 'Truss bridge'], 1), q('Which SI unit measures electric current?', ['Volt', 'Ohm', 'Ampere', 'Watt'], 2)],
  C: [q('HTML is mainly used to create what?', ['Database tables', 'Web page structure', 'Computer hardware', 'Mobile signals'], 1), q('What does CAD stand for?', ['Computer Aided Design', 'Central Analysis Device', 'Code and Data', 'Creative Art Design'], 0)],
  FINAL: [q('Which of these is a renewable source of energy?', ['Coal', 'Natural gas', 'Solar energy', 'Petroleum'], 2)]
};
const letters = ['A', 'B', 'C', 'D'];
const blank = () => q('', ['', '', '', ''], 0);
const STORAGE_KEY = 'quiz_rounds_2026';
const getStoredRounds = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.A) && Array.isArray(parsed.B) && Array.isArray(parsed.C) && Array.isArray(parsed.FINAL)) {
        return parsed;
      }
    }
  } catch { }
  return initialRounds;
};
function shuffle(array) { const arr = [...array]; for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
const assetUrl = file => {
  const base = import.meta.env.BASE_URL || './';
  return base.endsWith('/') ? base + file : base + '/' + file;
};

let questionAudio = null;
function getQuestionAudio() {
  if (!questionAudio && typeof Audio !== 'undefined') {
    questionAudio = new Audio(assetUrl('when_come_question.mpeg'));
    questionAudio.preload = 'auto';
  }
  return questionAudio;
}
function playQuestionSound() {
  try {
    const a = getQuestionAudio();
    if (a) {
      a.currentTime = 0;
      a.play().catch(() => { });
    }
  } catch { }
}
function stopQuestionSound() {
  try {
    const a = getQuestionAudio();
    if (a) {
      a.pause();
      a.currentTime = 0;
    }
  } catch { }
}
let timerAudio = null;
function getTimerAudio() {
  if (!timerAudio && typeof Audio !== 'undefined') {
    timerAudio = new Audio(assetUrl('timer.mpeg'));
    timerAudio.preload = 'auto';
    timerAudio.loop = true;
  }
  return timerAudio;
}
function playTimerSound() {
  try {
    const a = getTimerAudio();
    if (a && a.paused) {
      a.play().catch(() => { });
    }
  } catch { }
}
function pauseTimerSound() {
  try {
    const a = getTimerAudio();
    if (a && !a.paused) {
      a.pause();
    }
  } catch { }
}
function stopTimerSound() {
  try {
    const a = getTimerAudio();
    if (a) {
      a.pause();
      a.currentTime = 0;
    }
  } catch { }
}

let trueAudio = null;
function getTrueAudio() {
  if (!trueAudio && typeof Audio !== 'undefined') {
    trueAudio = new Audio(assetUrl('true_answer.mpeg'));
    trueAudio.preload = 'auto';
  }
  return trueAudio;
}
function playTrueSound() {
  try {
    const a = getTrueAudio();
    if (a) {
      a.currentTime = 0;
      a.play().catch(() => { });
    }
  } catch { }
}
function stopTrueSound() {
  try {
    const a = getTrueAudio();
    if (a) {
      a.pause();
      a.currentTime = 0;
    }
  } catch { }
}

let wrongAudio = null;
function getWrongAudio() {
  if (!wrongAudio && typeof Audio !== 'undefined') {
    wrongAudio = new Audio(assetUrl('wrong_answer.mpeg'));
    wrongAudio.preload = 'auto';
  }
  return wrongAudio;
}
function playWrongSound() {
  try {
    const a = getWrongAudio();
    if (a) {
      a.currentTime = 0;
      a.play().catch(() => { });
    }
  } catch { }
}
function stopWrongSound() {
  try {
    const a = getWrongAudio();
    if (a) {
      a.pause();
      a.currentTime = 0;
    }
  } catch { }
}

let completeAudio = null;
function getCompleteAudio() {
  if (!completeAudio && typeof Audio !== 'undefined') {
    completeAudio = new Audio(assetUrl('complete_the_set.mpeg'));
    completeAudio.preload = 'auto';
  }
  return completeAudio;
}
function playCompleteSound() {
  try {
    const a = getCompleteAudio();
    if (a) {
      a.currentTime = 0;
      a.play().catch(() => { });
    }
  } catch { }
}
function stopCompleteSound() {
  try {
    const a = getCompleteAudio();
    if (a) {
      a.pause();
      a.currentTime = 0;
    }
  } catch { }
}

function stopAllSounds() {
  stopQuestionSound();
  stopTimerSound();
  stopTrueSound();
  stopWrongSound();
  stopCompleteSound();
}

function tone(kind) { try { const a = new AudioContext(), o = a.createOscillator(), g = a.createGain(); o.type = kind === 'correct' ? 'sine' : 'sawtooth'; o.frequency.value = kind === 'correct' ? 620 : 160; g.gain.value = .08; o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + .45); } catch { } }
function parseQuizText(text) {
  if (!text || typeof text !== 'string') return [];

  const rawLines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // 1. Check pipe-delimited format (Question | OptA | OptB | OptC | OptD | AnsLetter)
  const pipes = rawLines.map(x => x.split('|').map(y => y.trim())).filter(x => x.length >= 6);
  if (pipes.length >= 1 && pipes.length === rawLines.length) {
    return pipes.map(x => q(x[0], [x[1], x[2], x[3], x[4]], Math.max(0, letters.indexOf((x[5] || 'A').toUpperCase()))));
  }

  // 2. Pre-process lines to separate inline options like A) ... B) ... or (A) ... (B) ...
  const normalizedLines = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    
    const inlineOptRegex = /(?:^|\s+)(?:\(?([A-Da-d]|[1-4])[\).:-]|\[([A-Da-d]|[1-4])\]|\b([A-Da-d])\s*[.):-])\s+/g;
    const matches = [...line.matchAll(inlineOptRegex)];
    if (matches.length >= 2) {
      for (let m = 0; m < matches.length; m++) {
        const start = matches[m].index;
        if (m === 0 && start > 0) {
          const preText = line.slice(0, start).trim();
          if (preText) normalizedLines.push(preText);
        }
        const end = m + 1 < matches.length ? matches[m + 1].index : line.length;
        const part = line.slice(start, end).trim();
        if (part) normalizedLines.push(part);
      }
    } else {
      normalizedLines.push(line);
    }
  }

  const isAnswer = line => /^(?:Ans(?:wer)?|Correct(?:\s*Option|\s*Answer)?|Key|Option)\s*(?:is|:|-|=|\.)?\s*(.+)/i.test(line);
  const isOption = line => /^(?:\(?([A-Da-d])\s*[.):-]|\[([A-Da-d])\]|\(([A-Da-d])\)|([A-Da-d])\s*[.):-])\s*(.+)/i.test(line);
  const isQuestion = line => /^(?:Q(?:uestion)?\s*[\d.]*\s*[:.-]?|\(?\d+\s*[.):-]|\[\d+\])\s+\S+/i.test(line) && !isAnswer(line) && !isOption(line);

  const questions = [];
  let currentQ = null;

  for (let i = 0; i < normalizedLines.length; i++) {
    const line = normalizedLines[i];

    if (isAnswer(line)) {
      if (currentQ) {
        const match = line.match(/^(?:Ans(?:wer)?|Correct(?:\s*Option|\s*Answer)?|Key|Option)\s*(?:is|:|-|=|\.)?\s*(.+)/i);
        const ansVal = match ? match[1].trim() : '';
        const letterMatch = ansVal.match(/\b([A-Da-d]|[1-4])\b/i);
        if (letterMatch) {
          const char = letterMatch[1].toUpperCase();
          if ('ABCD'.includes(char)) currentQ.answer = 'ABCD'.indexOf(char);
          else if ('1234'.includes(char)) currentQ.answer = parseInt(char, 10) - 1;
        } else {
          const matchIndex = currentQ.options.findIndex(opt => opt && ansVal.toLowerCase().includes(opt.toLowerCase()));
          if (matchIndex >= 0) currentQ.answer = matchIndex;
        }
      }
      continue;
    }

    if (isOption(line)) {
      if (currentQ) {
        const optMatch = line.match(/^(?:\(?([A-Da-d])\s*[.):-]|\[([A-Da-d])\]|\(([A-Da-d])\)|([A-Da-d])\s*[.):-])\s*(.+)/i);
        if (optMatch) {
          const marker = (optMatch[1] || optMatch[2] || optMatch[3] || optMatch[4]).toUpperCase();
          let optText = optMatch[5].trim();
          
          const trailingAns = optText.match(/\s+(?:Ans(?:wer)?|Correct|Key)\s*[:.-]?\s*([A-Da-d]|[1-4])/i);
          if (trailingAns) {
            const char = trailingAns[1].toUpperCase();
            if ('ABCD'.includes(char)) currentQ.answer = 'ABCD'.indexOf(char);
            else if ('1234'.includes(char)) currentQ.answer = parseInt(char, 10) - 1;
            optText = optText.replace(/\s+(?:Ans(?:wer)?|Correct|Key)\s*[:.-]?\s*([A-Da-d]|[1-4])/i, '').trim();
          }

          const idx = 'ABCD'.indexOf(marker);
          if (idx >= 0 && idx < 4) {
            currentQ.options[idx] = optText;
          }
        }
      }
      continue;
    }

    if (isQuestion(line)) {
      if (currentQ && currentQ.options.filter(Boolean).length >= 2) {
        questions.push(currentQ);
      }
      const qText = line.replace(/^(?:Q(?:uestion)?\s*[\d.]*\s*[:.-]?\s*|\(?\d+\s*[.):-]\s*|\[\d+\]\s*)/i, '').trim();
      currentQ = { question: qText, options: ['', '', '', ''], answer: 0 };
      continue;
    }

    // Check for unnumbered question header before option A
    if (!currentQ || currentQ.options.filter(Boolean).length >= 2) {
      const nextLine = normalizedLines[i + 1];
      if (nextLine && isOption(nextLine)) {
        if (currentQ && currentQ.options.filter(Boolean).length >= 2) {
          questions.push(currentQ);
        }
        currentQ = { question: line, options: ['', '', '', ''], answer: 0 };
        continue;
      }
    }

    if (currentQ) {
      if (currentQ.options.every(o => !o)) {
        currentQ.question += ' ' + line;
      }
    }
  }

  if (currentQ && currentQ.options.filter(Boolean).length >= 2) {
    questions.push(currentQ);
  }

  return questions.map(x => q(x.question, x.options, x.answer));
}

function App() {
  const [rounds, setRounds] = useState(getStoredRounds); const [round, setRound] = useState(null);
  const [indexes, setIndexes] = useState({ A: 0, B: 0, C: 0, FINAL: 0 }); const [seconds, setSeconds] = useState(60); const [running, setRunning] = useState(false); const [selected, setSelected] = useState(null); const [revealed, setRevealed] = useState(false); const [questionVisible, setQuestionVisible] = useState(false); const [autoNextCountdown, setAutoNextCountdown] = useState(null); const [completed, setCompleted] = useState(false); const [sound, setSound] = useState(true); const [panel, setPanel] = useState(false); const [target, setTarget] = useState('A'); const [edit, setEdit] = useState(blank()); const [pendingImport, setPendingImport] = useState(null); const [counts, setCounts] = useState({ A: '', B: '', C: '', FINAL: '' });
  const [uploadMode, setUploadMode] = useState('single'); const [perSetData, setPerSetData] = useState({ A: null, B: null, C: null, FINAL: null });
  const questions = round ? rounds[round] : []; const index = round ? indexes[round] : 0; const current = questions[index] || blank();
  const reset = () => { setSeconds(60); setRunning(false); setSelected(null); setRevealed(false); setQuestionVisible(false); setAutoNextCountdown(null); stopAllSounds(); };
  const openRound = key => { setRound(key); setTarget(key); setPanel(false); setCompleted(false); reset(); };
  const showQuestion = () => { setQuestionVisible(true); setSeconds(60); setRunning(true); setSelected(null); setRevealed(false); setAutoNextCountdown(null); stopAllSounds(); if (sound) playQuestionSound(); };
  const nextQuestion = () => {
    if (!questions.length) return;
    stopAllSounds();
    if (index >= questions.length - 1) {
      setCompleted(true);
      if (sound) playCompleteSound();
    } else {
      setIndexes(all => ({ ...all, [round]: all[round] + 1 }));
      reset();
    }
  };
  const replayCurrentSet = () => {
    if (!round) return;
    stopAllSounds();
    setIndexes(all => ({ ...all, [round]: 0 }));
    setCompleted(false);
    reset();
  };
  const roundOrder = ['A', 'B', 'C', 'FINAL'];
  const curPos = round ? roundOrder.indexOf(round) : -1;
  const nextRound = curPos >= 0 && curPos < roundOrder.length - 1 ? roundOrder[curPos + 1] : null;

  const selectOption = n => {
    if (!revealed) {
      setSelected(n);
      setRevealed(true);
      setRunning(false);
      stopQuestionSound();
      stopTimerSound();
      const isCorrect = n === current.answer;
      if (sound) {
        if (isCorrect) playTrueSound();
        else playWrongSound();
      }
      setAutoNextCountdown(10);
    }
  };
  const toggleSound = () => { if (sound) { stopAllSounds(); } setSound(!sound); };
  const resetToDefault = () => {
    if (window.confirm('Reset all questions to default starter questions? Any custom uploaded questions will be deleted.')) {
      try { localStorage.removeItem(STORAGE_KEY); } catch { }
      setRounds(initialRounds);
      setIndexes({ A: 0, B: 0, C: 0, FINAL: 0 });
      setCompleted(false);
      reset();
      alert('Questions reset to default starter questions.');
    }
  };
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rounds));
    } catch { }
  }, [rounds]);
  useEffect(() => { if (!running || revealed || seconds <= 0) return; const id = setInterval(() => setSeconds(s => s - 1), 1000); return () => clearInterval(id); }, [running, revealed, seconds]);
  useEffect(() => {
    if (running && questionVisible && !revealed && seconds > 0 && sound && !completed) {
      playTimerSound();
    } else {
      pauseTimerSound();
    }
  }, [running, questionVisible, revealed, seconds, sound, completed]);
  useEffect(() => {
    if (seconds === 0 && questionVisible && !revealed) {
      setRunning(false);
      setRevealed(true);
      stopQuestionSound();
      stopTimerSound();
      if (sound) playWrongSound();
      setAutoNextCountdown(10);
    }
  }, [seconds, sound, questionVisible, revealed]);
  useEffect(() => {
    if (completed && sound) {
      playCompleteSound();
    }
  }, [completed, sound]);
  useEffect(() => { if (autoNextCountdown === null) return; if (autoNextCountdown <= 0) { nextQuestion(); return; } const id = setTimeout(() => { setAutoNextCountdown(c => (c !== null ? c - 1 : null)); }, 1000); return () => clearTimeout(id); }, [autoNextCountdown]);

  const outcome = useMemo(() => { if (!revealed) return ''; if (selected === null) return 'timeup'; return selected === current.answer ? 'correct' : 'wrong'; }, [revealed, selected, current.answer]);
  const questionKey = question => question.question.trim().toLowerCase().replace(/\s+/g, ' ');
  const add = () => { if (!edit.question.trim() || edit.options.some(x => !x.trim())) return; const key = questionKey(edit); if (Object.values(rounds).flat().some(item => questionKey(item) === key)) return alert('This question already exists in another set.'); setRounds(all => ({ ...all, [target]: [...all[target], { ...edit, options: [...edit.options] }] })); setEdit(blank()); };
  const load = text => { const rows = text.split(/\r?\n/).filter(Boolean).map(x => x.split('|').map(y => y.trim())).filter(x => x.length >= 6); const unique = []; const seen = new Set(); rows.map(x => q(x[0], x.slice(1, 5), Math.max(0, letters.indexOf(x[5].toUpperCase())))).forEach(item => { const key = questionKey(item); if (!seen.has(key)) { seen.add(key); unique.push(item); } }); if (!unique.length) return alert('No valid questions found.'); const split = { A: [], B: [], C: [], FINAL: [] }; shuffle(unique).forEach((item, i) => split[['A', 'B', 'C', 'FINAL'][i % 4]].push(item)); setRounds(split); setIndexes({ A: 0, B: 0, C: 0, FINAL: 0 }); if (round) reset(); alert(`${unique.length} unique questions randomly divided across all four sets.`); };
  const importPdf = async file => {
    if (!file) return;
    try {
      const text = await extractTextFromPdf(file);
      const seen = new Set();
      const list = parseQuizText(text).filter(item => {
        const key = questionKey(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      if (!list.length) throw new Error('No questions found. Ensure your PDF has numbered questions (1. 2. 3.) with A/B/C/D options.');
      setCounts({ A: '', B: '', C: '', FINAL: '' });
      setPendingImport(list);
    } catch (e) {
      alert(e.message || 'Unable to read PDF. Paste copied text instead.');
    }
  };
  const finishImport = (mode, chosenSet, doShuffle = true) => { const list = pendingImport; if (!list) return; const pool = doShuffle ? shuffle(list) : list; let split = { A: [], B: [], C: [], FINAL: [] }; if (mode === 'equal') pool.forEach((item, i) => split[['A', 'B', 'C', 'FINAL'][i % 4]].push(item)); if (mode === 'all_sets') split = { A: doShuffle ? shuffle(list) : [...list], B: doShuffle ? shuffle(list) : [...list], C: doShuffle ? shuffle(list) : [...list], FINAL: doShuffle ? shuffle(list) : [...list] }; if (mode === 'selected') { const s = chosenSet || target || 'A'; split = { ...rounds, [s]: pool }; } if (mode === 'custom') { const numbers = Object.fromEntries(Object.entries(counts).map(([key, value]) => [key, Number(value || 0)])); const total = Object.values(numbers).reduce((a, b) => a + b, 0); if (Object.values(numbers).some(x => !Number.isInteger(x) || x < 0) || total > list.length || total === 0) return alert(`Enter valid counts up to ${list.length} questions.`); let at = 0; Object.keys(split).forEach(key => { split[key] = pool.slice(at, at + numbers[key]); at += numbers[key] }); } setRounds(split); setIndexes({ A: 0, B: 0, C: 0, FINAL: 0 }); if (round) reset(); setPendingImport(null); };
  const importPerSetPdf = async (file, setName) => {
    if (!file) return;
    try {
      const text = await extractTextFromPdf(file);
      const seen = new Set();
      const list = parseQuizText(text).filter(item => {
        const key = questionKey(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      if (!list.length) throw new Error('No questions found. Ensure your PDF has numbered questions (1. 2. 3.) with A/B/C/D options.');
      setPerSetData(all => ({ ...all, [setName]: { fileName: file.name, questions: list, mode: 'all', count: '' } }));
    } catch (e) {
      alert(e.message || 'Unable to read PDF.');
    }
  };
  const updatePerSetData = (setName, updates) => { setPerSetData(all => ({ ...all, [setName]: all[setName] ? { ...all[setName], ...updates } : null })); };
  const applyPerSet = (setName) => { const data = perSetData[setName]; if (!data) return; let list = data.questions; if (data.mode === 'custom') { const n = Number(data.count); if (!Number.isInteger(n) || n <= 0 || n > list.length) return alert(`Enter a count between 1 and ${list.length}.`); list = shuffle(list).slice(0, n); } else { list = shuffle(list); } setRounds(all => ({ ...all, [setName]: list })); setIndexes(all => ({ ...all, [setName]: 0 })); if (round === setName) { setCompleted(false); reset(); } setPerSetData(all => ({ ...all, [setName]: null })); };
  const clearPerSet = (setName) => { setPerSetData(all => ({ ...all, [setName]: null })); };
  const pasteImport = (text) => { if (!text.trim()) return; const seen = new Set(); const list = parseQuizText(text).filter(item => { const key = questionKey(item); if (seen.has(key)) return false; seen.add(key); return true; }); if (!list.length) return alert('No questions found. Use numbered questions (1. 2.) with A/B/C/D options.'); setCounts({ A: '', B: '', C: '', FINAL: '' }); setPendingImport(list); };
  const pastePerSet = (text, setName) => { if (!text.trim()) return; const seen = new Set(); const list = parseQuizText(text).filter(item => { const key = questionKey(item); if (seen.has(key)) return false; seen.add(key); return true; }); if (!list.length) return alert('No questions found. Use numbered questions (1. 2.) with A/B/C/D options.'); setPerSetData(all => ({ ...all, [setName]: { fileName: 'Pasted text', questions: list, mode: 'all', count: '' } })); };
  return <main><div className="floating-symbols"><span>🤖</span><span>🧠</span><span>🛡️</span><span>💻</span><span>📡</span><span>☁️</span><span>🌐</span><span>⚡</span><span>⚙️</span><span>💾</span><span>🖥️</span><span>🔒</span><span>🔌</span><span>🔋</span><span>🛰️</span><span>📱</span><span>⌨️</span><span>🔍</span><span>🔐</span><span>🚀</span><span>🛡️</span><span>💻</span><span>🤖</span><span className="formula">E=mc²</span><span className="formula">F=ma</span><span className="formula">V=IR</span><span className="formula">a²+b²=c²</span><span className="formula">H₂O</span><span className="formula">O₃</span><span className="formula">sin²θ+cos²θ=1</span><span className="formula">F=G(m₁m₂)/r²</span><span className="formula">P=IV</span><span className="formula">CO₂</span><span className="formula">Δy/Δx</span><span className="formula">c=λν</span><span className="formula">∇⋅D=ρ</span><span className="formula">ΔS≥0</span><span className="formula">x=(-b±√D)/2a</span><span className="formula">pH=-log[H⁺]</span><span>⚛️</span><span>🧬</span><span>🔬</span><span>🔭</span><span className="formula">πr²</span><span className="formula">∫eˣdx</span><span className="formula">v=u+at</span><span className="formula">F=kx</span></div><div className="ambient grid-left" /><div className="ambient grid-right" /><Header panel={panel} toggle={() => { setTarget(round || target); setPanel(!panel); }} />{panel && <Operator target={target} setTarget={setTarget} edit={edit} setEdit={setEdit} add={add} load={load} importPdf={importPdf} close={() => setPanel(false)} uploadMode={uploadMode} setUploadMode={setUploadMode} importPerSetPdf={importPerSetPdf} perSetData={perSetData} updatePerSetData={updatePerSetData} applyPerSet={applyPerSet} clearPerSet={clearPerSet} pasteImport={pasteImport} pastePerSet={pastePerSet} resetToDefault={resetToDefault} />} {pendingImport && <ImportWizard questions={pendingImport} target={target} counts={counts} setCounts={setCounts} apply={finishImport} cancel={() => setPendingImport(null)} />} {!round ? <Dashboard rounds={rounds} open={openRound} /> : <Quiz round={round} questions={questions} index={index} current={current} seconds={seconds} running={running} selected={selected} revealed={revealed} questionVisible={questionVisible} autoNextCountdown={autoNextCountdown} completed={completed} nextRound={nextRound} replay={replayCurrentSet} replaySound={() => { stopAllSounds(); if (sound) playCompleteSound(); }} showQuestion={showQuestion} outcome={outcome} sound={sound} back={() => { setRound(null); setCompleted(false); reset(); }} changeRound={openRound} select={selectOption} reset={reset} next={nextQuestion} start={() => setRunning(!running)} setSound={toggleSound} />}<Footer /></main>;
}
function SandipLionLogo({ size = 52 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="sandip-lion-svg">
      {/* Outer Circle Ring */}
      <circle cx="50" cy="50" r="47" stroke="#1c1c1c" strokeWidth="2.8" fill="#ffffff" />
      <circle cx="50" cy="50" r="43.5" stroke="#1c1c1c" strokeWidth="1.2" fill="none" />

      {/* 28 Radiating Sunburst Rays */}
      {Array.from({ length: 28 }).map((_, i) => {
        const angle = (i * 360) / 28;
        return (
          <polygon
            key={i}
            points="48.5,7 51.5,7 50.8,22 49.2,22"
            fill="#1c1c1c"
            transform={`rotate(${angle} 50 50)`}
          />
        );
      })}

      {/* Inner Black Badge Circle */}
      <circle cx="50" cy="50" r="28" fill="#1c1c1c" stroke="#1c1c1c" strokeWidth="1" />

      {/* Stylized Lion Face */}
      {/* Ears */}
      <polygon points="34,35 37,27 42,34" fill="#ffffff" />
      <polygon points="66,35 63,27 58,34" fill="#ffffff" />
      <polygon points="36,34 37,29 40,34" fill="#1c1c1c" />
      <polygon points="64,34 63,29 60,34" fill="#1c1c1c" />

      {/* Forehead / Brow */}
      <polygon points="37,36 43,32 50,34 57,32 63,36 57,44 50,41 43,44" fill="#ffffff" />

      {/* Nose Bridge */}
      <polygon points="46,41 50,38 54,41 52.5,51 47.5,51" fill="#ffffff" />
      <polygon points="41.5,41 44.5,44 39.5,45" fill="#1c1c1c" />
      <polygon points="58.5,41 55.5,44 60.5,45" fill="#1c1c1c" />

      {/* Cheeks / Mane */}
      <polygon points="31,43 38,44 36,53 29,49" fill="#ffffff" />
      <polygon points="69,43 62,44 64,53 71,49" fill="#ffffff" />

      {/* Muzzle & Nose */}
      <polygon points="45,51 55,51 50,56" fill="#1c1c1c" />
      <polygon points="42,54 50,52 58,54 55,62 50,65 45,62" fill="#ffffff" />
      <path d="M 50 56 L 50 61 M 47 60 Q 50 63 53 60" stroke="#1c1c1c" strokeWidth="1.5" strokeLinecap="round" />

      {/* Chin / Beard */}
      <polygon points="45,65 55,65 50,71" fill="#ffffff" />
    </svg>
  );
}

function SandipBrandLogo() {
  return (
    <div className="sandip-brand-container">
      <SandipLionLogo size={68} />
      <div className="sandip-text-block">
        <div className="sandip-title-row">
          <span className="sandip-name">SANDIP</span>
          <span className="sandip-sub">UNIVERSITY</span>
        </div>
        <div className="sandip-accredit-row">
          <div className="ugc-badge">
            <span className="ugc-title">UGC</span>
            <span className="ugc-sub">Recognised</span>
          </div>
          <div className="accredit-divider" />
          <div className="naac-badge">
            <span className="naac-label">NAAC<br />GRADE</span>
            <span className="naac-grade-circle">A</span>
          </div>
        </div>
        <div className="ugc-black-box">
          Under Section 2(f) & 12(B) of UGC
        </div>
      </div>
    </div>
  );
}

function Header({ panel, toggle }) {
  return (
    <header className="main-header">
      <div className="main-header-inner">
        <SandipBrandLogo />
        <div className="event-title">
          <div className="event-title-main">
            <span>ENGINEERS’ DAY</span>
            <strong>2026</strong>
          </div>
          <small>CELEBRATING INNOVATION · HONORING ENGINEERS · SHAPING TOMORROW</small>
        </div>
        <button className="operator-btn" onClick={toggle} title="Open Operator Settings Panel">
          <span className="operator-icon">⚙</span>
          <span className="operator-label">OPERATOR PANEL</span>
        </button>
      </div>
    </header>
  );
}

function Operator({ target, setTarget, edit, setEdit, add, load, importPdf, close, uploadMode, setUploadMode, importPerSetPdf, perSetData, updatePerSetData, applyPerSet, clearPerSet, pasteImport, pastePerSet, resetToDefault }) {
  const [singleText, setSingleText] = useState('');
  const [perSetTexts, setPerSetTexts] = useState({ A: '', B: '', C: '', FINAL: '' });
  const handleSinglePaste = () => {
    if (!singleText.trim()) return alert('Please paste questions first.');
    pasteImport(singleText);
    setSingleText('');
  };
  const handlePerSetPaste = (name) => {
    const text = perSetTexts[name];
    if (!text || !text.trim()) return alert('Please paste questions first.');
    pastePerSet(text, name);
    setPerSetTexts(prev => ({ ...prev, [name]: '' }));
  };

  return (
    <div className="operator-drawer-backdrop" onClick={close}>
      <aside className="control-panel anim-drawer-in" onClick={e => e.stopPropagation()}>
        <div className="panel-header">
          <div className="panel-title-row">
            <div className="panel-title-wrap">
              <span className="panel-kicker">ADMINISTRATION</span>
              <h2>UPLOAD QUESTIONS</h2>
            </div>
            <button className="panel-close-btn" onClick={close} title="Close Panel">✕</button>
          </div>

          <div className="upload-tabs-container">
            <button
              className={`upload-tab-btn ${uploadMode === 'single' ? 'active' : ''}`}
              onClick={() => setUploadMode('single')}
            >
              <span className="tab-icon">📄</span>
              <span className="tab-text">SINGLE PDF / BULK</span>
            </button>
            <button
              className={`upload-tab-btn ${uploadMode === 'perSet' ? 'active' : ''}`}
              onClick={() => setUploadMode('perSet')}
            >
              <span className="tab-icon">📑</span>
              <span className="tab-text">PER-SET PDFs</span>
            </button>
          </div>
        </div>

        <div className="panel-body">
          {uploadMode === 'single' ? (
            <>
              <UploadZone label="Drop Single Question PDF" icon="📄" onFile={importPdf} />
              <div className="upload-divider"><span>OR PASTE QUESTIONS DIRECTLY</span></div>
              <textarea
                className="paste-area"
                placeholder={"1. What is CPU?\nA) Central Processing Unit\nB) Computer Personal Unit\nC) Central Process Unit\nD) Control Processing Unit\nAnswer: A\n\n2. Next Question..."}
                value={singleText}
                onChange={e => setSingleText(e.target.value)}
              />
              <button className="paste-submit-btn" onClick={handleSinglePaste}>
                📥 IMPORT PASTED QUESTIONS →
              </button>
              <div className="upload-format-hint">
                <b>SUPPORTED QUESTION FORMAT</b>
                <small>Numbered questions (1. 2. 3.) with A/B/C/D choices &amp; Answer line, or pipe-delimited (|) text.</small>
              </div>
            </>
          ) : (
            <>
              <div className="per-set-grid">
                {['A', 'B', 'C', 'FINAL'].map(name => (
                  <div className="per-set-item" key={name}>
                    <UploadZone
                      label={name === 'FINAL' ? 'CHAMPIONSHIP FINAL' : `SET ${name}`}
                      icon={name === 'FINAL' ? '★' : name}
                      onFile={file => importPerSetPdf(file, name)}
                      fileInfo={perSetData[name]?.fileName}
                      onClear={() => clearPerSet(name)}
                    />
                    {perSetData[name] ? (
                      <div className="mini-wizard">
                        <span>{perSetData[name].questions.length} questions parsed</span>
                        <div className="mini-wizard-options">
                          <button className={perSetData[name].mode === 'all' ? 'active' : ''} onClick={() => updatePerSetData(name, { mode: 'all' })}>USE ALL</button>
                          <button className={perSetData[name].mode === 'custom' ? 'active' : ''} onClick={() => updatePerSetData(name, { mode: 'custom' })}>CUSTOM</button>
                        </div>
                        {perSetData[name].mode === 'custom' && (
                          <input type="number" min="1" max={perSetData[name].questions.length} placeholder={`Max ${perSetData[name].questions.length}`} value={perSetData[name].count} onChange={e => updatePerSetData(name, { count: e.target.value })} />
                        )}
                        <button className="apply-set" onClick={() => applyPerSet(name)}>APPLY TO SET →</button>
                      </div>
                    ) : (
                      <div className="per-set-paste-box">
                        <textarea
                          className="paste-area paste-area-small"
                          placeholder={`Paste questions for ${name === 'FINAL' ? 'Final' : `Set ${name}`}...`}
                          value={perSetTexts[name]}
                          onChange={e => setPerSetTexts(prev => ({ ...prev, [name]: e.target.value }))}
                        />
                        <button className="paste-submit-btn-small" onClick={() => handlePerSetPaste(name)}>
                          📥 IMPORT TO {name === 'FINAL' ? 'FINAL' : `SET ${name}`}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <small className="panel-hint">Upload or paste questions for each set individually.</small>
            </>
          )}

          <div className="reset-section">
            <button className="reset-default-btn" onClick={resetToDefault}>
              🗑️ RESET ALL SETS TO DEFAULT QUESTIONS
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function ImportWizard({ questions, target, counts, setCounts, apply, cancel }) {
  const [selectedSet, setSelectedSet] = useState(target || 'A');
  const [randomize, setRandomize] = useState(true);
  const total = Object.values(counts).reduce((sum, value) => sum + Number(value || 0), 0);

  return (
    <div className="import-overlay">
      <section className="import-wizard anim-slide-in">
        <button className="wizard-close" onClick={cancel} title="Close wizard">×</button>
        <span className="wizard-kicker">IMPORT WIZARD</span>
        <h2>{questions.length} QUESTIONS DISCOVERED</h2>
        <p className="wizard-copy">Select how you want to distribute these questions. Questions will be automatically partitioned without repeats.</p>

        <label className="wizard-shuffle-toggle">
          <input type="checkbox" checked={randomize} onChange={e => setRandomize(e.target.checked)} />
          <span>🔀 <b>Shuffle &amp; Randomize question sequence</b> (Zero duplicates across sets)</span>
        </label>

        <div className="import-actions">
          <button className="import-choice primary" onClick={() => apply('equal', null, randomize)}>
            <b>⚖</b>
            <span>
              DIVIDE EQUALLY
              <small>Split questions across A, B, C &amp; Final (~{Math.floor(questions.length / 4)} each)</small>
            </span>
          </button>
          <button className="import-choice" onClick={() => apply('all_sets', null, randomize)}>
            <b>★</b>
            <span>
              COPY TO ALL SETS
              <small>Load all {questions.length} questions into every set</small>
            </span>
          </button>
        </div>

        <div className="single-set-picker">
          <div className="picker-header">
            <b>🎯 LOAD ALL INTO A SPECIFIC SET</b>
            <small>Select the target set below:</small>
          </div>
          <div className="set-buttons-row">
            {['A', 'B', 'C', 'FINAL'].map(name => (
              <button key={name} className="set-select-btn" onClick={() => { setSelectedSet(name); apply('selected', name, randomize); }}>
                <b>{name === 'FINAL' ? '★' : name}</b>
                <span>{name === 'FINAL' ? 'FINAL ROUND' : `SET ${name}`}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="custom-distribution">
          <div>
            <b>🔢 CUSTOM DISTRIBUTION PER SET</b>
            <small>Allocate specific question counts for each set from the pool</small>
          </div>
          <div className="count-inputs">
            {['A', 'B', 'C', 'FINAL'].map(name => (
              <label key={name}>
                {name === 'FINAL' ? 'FINAL ROUND' : `SET ${name}`}
                <input type="number" min="0" max={questions.length} placeholder="0" value={counts[name]} onChange={e => setCounts({ ...counts, [name]: e.target.value })} />
              </label>
            ))}
          </div>
          <div className="count-footer">
            <span>{total} / {questions.length} questions allocated</span>
            <button onClick={() => apply('custom', null, randomize)}>APPLY DISTRIBUTION →</button>
          </div>
        </div>
      </section>
    </div>
  );
}

function Dashboard({ rounds, open }) {
  return (
    <div className="dashboard-container">
      <section className="dashboard-heading">
        <span className="dashboard-kicker">TECH QUIZ IN ENGINEERING DAY</span>
        <h1>SELECT COMPETITION ROUND</h1>
        <p>Choose a quiz round below to begin live stage presentation and countdown.</p>
      </section>

      <section className="set-dashboard">
        {['A', 'B', 'C', 'FINAL'].map((r, i) => (
          <article className={`set-card set-card-${r.toLowerCase()}`} key={r}>
            <div className="set-card-top">
              <div className="set-number">{r === 'FINAL' ? '★' : `0${i + 1}`}</div>
              <span className="set-category">{r === 'FINAL' ? 'CHAMPIONSHIP' : 'ROUND'}</span>
            </div>
            <h2>{r === 'FINAL' ? 'FINAL ROUND' : `SET ${r}`}</h2>
            <div className="set-meta">
              <span className="set-pill">{rounds[r].length} Question{rounds[r].length !== 1 ? 's' : ''}</span>
              <span className="set-status">Ready</span>
            </div>
            <button className="set-start-btn" onClick={() => open(r)}>
              LAUNCH {r === 'FINAL' ? 'FINAL' : `SET ${r}`} →
            </button>
          </article>
        ))}
      </section>
    </div>
  );
}

function Quiz(p) {
  const isLast = p.index === p.questions.length - 1;

  return (
    <div className="quiz-stage-container">
      <section className="rounds-nav">
        <button className="back-dashboard-btn" onClick={p.back}>
          ← ALL ROUNDS
        </button>
        <div className="round-tabs-wrap">
          {['A', 'B', 'C', 'FINAL'].map(r => (
            <button
              type="button"
              className={p.round === r ? 'round-tab active' : 'round-tab'}
              key={r}
              onClick={() => p.changeRound(r)}
            >
              <span className="round-tab-icon">{r === 'FINAL' ? '★' : r}</span>
              <span className="round-tab-label">{r === 'FINAL' ? 'FINAL ROUND' : `SET ${r}`}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="statusbar">
        <div className="status-live-indicator">
          <span className="live-dot anim-pulse"></span>
          <span className="live-text">STAGE LIVE</span>
          <span className="live-round-badge">{p.round === 'FINAL' ? 'CHAMPIONSHIP FINAL' : `SET ${p.round}`}</span>
        </div>

        <div className="status-progress-info">
          <span className="q-index-label">QUESTION</span>
          <span className="q-numbers">
            <b>{String(Math.min(p.index + 1, p.questions.length)).padStart(2, '0')}</b>
            <span className="q-total"> / {String(p.questions.length).padStart(2, '0')}</span>
          </span>
        </div>

        <button className={`sound-toggle-btn ${p.sound ? 'on' : 'off'}`} onClick={() => p.setSound(!p.sound)}>
          {p.sound ? '🔊 SOUND ON' : '🔇 SOUND OFF'}
        </button>
      </section>

      {p.completed ? (
        <section className="quiz-card complete-card anim-slide-in">
          <div className="complete-kicker">✦ SANDIP UNIVERSITY · ENGINEERS’ DAY 2026 ✦</div>
          <div className="complete-trophy anim-trophy">🏆</div>
          <h1 className="complete-title">{p.round === 'FINAL' ? 'CHAMPIONSHIP ROUND COMPLETED!' : `SET ${p.round} COMPLETED!`}</h1>
          <p className="complete-desc">
            All <b>{p.questions.length} questions</b> in {p.round === 'FINAL' ? 'the Championship Final' : `Set ${p.round}`} have been completed successfully!
          </p>
          <div className="complete-stats">
            <div className="complete-stat-item">
              <b>{p.questions.length}</b>
              <span>Questions Finished</span>
            </div>
            <div className="complete-stat-item">
              <b>{p.round === 'FINAL' ? 'FINAL' : `SET ${p.round}`}</b>
              <span>Completed Round</span>
            </div>
            <div className="complete-stat-item">
              <b style={{ color: '#2a9d4a' }}>100%</b>
              <span>Round Completion</span>
            </div>
          </div>
          <div className="complete-actions">
            {p.nextRound ? (
              <button className="complete-btn primary" onClick={() => p.changeRound(p.nextRound)}>
                ▶ PROCEED TO {p.nextRound === 'FINAL' ? '★ FINAL ROUND' : `SET ${p.nextRound}`} →
              </button>
            ) : (
              <button className="complete-btn primary" onClick={p.back}>
                🏆 ALL ROUNDS CONCLUDED · RETURN TO DASHBOARD →
              </button>
            )}
            <button className="complete-btn secondary" onClick={p.replay}>
              ↺ REPLAY SET {p.round === 'FINAL' ? 'FINAL' : p.round}
            </button>
            <button className="complete-btn outline" onClick={p.back}>
              ⊞ ALL ROUNDS
            </button>
          </div>
          {p.sound && (
            <button className="complete-btn sound-btn" onClick={p.replaySound}>
              🔊 REPLAY CELEBRATION SOUND
            </button>
          )}
        </section>
      ) : !p.questionVisible ? (
        <section className="quiz-card standby-card anim-slide-in">
          <div className="standby-top-bar">
            <span className="standby-round-name">{p.round === 'FINAL' ? 'CHAMPIONSHIP ROUND' : `SET ${p.round}`}</span>
            <span className="standby-q-count">QUESTION {String(p.index + 1).padStart(2, '0')} OF {String(p.questions.length).padStart(2, '0')}</span>
          </div>
          <div className="standby-body">
            <div className="standby-icon-wrap anim-pulse">⚡</div>
            <h3>READY FOR QUESTION {p.index + 1}?</h3>
            <p>Click below to reveal the question and start the 60-second countdown timer.</p>
            <button className="see-question-btn" onClick={p.showQuestion}>
              👁️ SEE QUESTION &amp; START TIMER ▶
            </button>
          </div>
          <div className="standby-footer">
            <span>⏱️ 60s per question · Interactive audience stage mode</span>
            <button className="standby-skip-btn" onClick={p.next}>
              {isLast ? 'COMPLETE SET →' : 'SKIP QUESTION →'}
            </button>
          </div>
        </section>
      ) : (
        <section className="quiz-card active-card anim-slide-in">
          <div className="question-header-row">
            <div className="q-badge-info">
              <span className="q-round-tag">{p.round === 'FINAL' ? '★ FINAL ROUND' : `SET ${p.round}`}</span>
              <span className="q-step-tag">QUESTION {String(p.index + 1).padStart(2, '0')}</span>
            </div>

            <div className={`timer-badge ${p.seconds <= 10 ? 'danger anim-pulse-danger' : ''}`}>
              <span className="timer-icon">⏱</span>
              <span className="timer-value">00:{String(p.seconds).padStart(2, '0')}</span>
            </div>
          </div>

          <div className="question-content-box">
            <h1 className="question-text">{p.current.question || 'Add questions using the operator panel'}</h1>
          </div>

          <div className="options-grid">
            {p.current.options.map((x, i) => {
              const correct = p.revealed && i === p.current.answer;
              const wrong = p.revealed && i === p.selected && i !== p.current.answer;
              const isSelected = p.selected === i;
              return (
                <button
                  key={i}
                  className={`option-card ${isSelected ? 'chosen' : ''} ${correct ? 'right anim-pop' : ''} ${wrong ? 'wrong anim-shake' : ''}`}
                  onClick={() => p.select(i)}
                  disabled={p.revealed}
                >
                  <div className="option-letter-badge">{letters[i]}</div>
                  <div className="option-text">{x || `Option ${letters[i]}`}</div>
                  {correct && <div className="option-verdict-pill right">✓ CORRECT</div>}
                  {wrong && <div className="option-verdict-pill wrong">✕ INCORRECT</div>}
                </button>
              );
            })}
          </div>

          {p.revealed && (
            <div className={`result-bar ${p.outcome || 'timeup'} anim-fade-in`}>
              <div className="result-status-wrap">
                <span className="result-icon">
                  {p.outcome === 'correct' ? '✓' : p.outcome === 'wrong' ? '✕' : '⏱'}
                </span>
                <span className="result-message">
                  {p.outcome === 'correct'
                    ? 'CORRECT ANSWER!'
                    : p.outcome === 'wrong'
                      ? `INCORRECT — CORRECT ANSWER IS (${letters[p.current.answer]})`
                      : `TIME IS UP — CORRECT ANSWER IS (${letters[p.current.answer]})`}
                </span>
              </div>

              {p.autoNextCountdown !== null && (
                <div className="auto-advance-module">
                  <div className="auto-text">
                    {isLast ? 'Finishing Set in ' : 'Next in '}<b>{p.autoNextCountdown}s</b>
                  </div>
                  <div className="auto-track">
                    <div className="auto-fill-bar"></div>
                  </div>
                  <button className="auto-advance-btn" onClick={p.next}>
                    {isLast ? 'FINISH SET 🏆' : 'NEXT NOW ⏭️'}
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {p.questionVisible && !p.completed && (
        <section className="quiz-controls-bar">
          <button className="control-btn secondary-btn" onClick={p.reset}>
            ↻ RESET / HIDE
          </button>
          <button className={`control-btn ${p.running ? 'pause-btn' : 'start-btn'}`} onClick={p.start}>
            {p.running ? '⏸ PAUSE TIMER' : '▶ RESUME TIMER'}
          </button>
          <button className="control-btn next-btn" onClick={p.next}>
            {isLast ? '🏆 FINISH SET →' : 'NEXT QUESTION →'}
          </button>
        </section>
      )}
    </div>
  );
}

function Footer() {
  return (
    <footer className="quiz-footer">
      <div className="footer-col footer-left">
        <span className="footer-date">📅 15 SEPTEMBER 2026</span>
        <span className="footer-sub">ENGINEERS’ DAY CELEBRATION</span>
        <span className="footer-dev" style={{ marginTop: '8px', fontSize: '11px', color: '#ffb74d', letterSpacing: '1px', fontWeight: 'bold' }}>Developer - Suchit Kumar</span>
      </div>
      <div className="footer-col footer-center">
        <span className="footer-motto">ENGINEERING <i>THE FUTURE.</i></span>
        <span className="footer-motto-sub">INNOVATION &bull; TECHNOLOGY &bull; LEADERSHIP</span>
      </div>
      <div className="footer-col footer-right">
        <span className="footer-dept">SCHOOL OF COMPUTER SCIENCE &amp; ENGINEERING</span>
        <span className="footer-univ">SANDIP UNIVERSITY · UGC &amp; NAAC ‘A’ ACCREDITED</span>
      </div>
    </footer>
  );
}

function UploadZone({ label, icon, onFile, fileInfo, onClear }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);
  const handleDrop = e => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f && (f.type === 'application/pdf' || f.name.endsWith('.pdf'))) onFile(f);
    else alert('Please upload a PDF file.');
  };
  return (
    <div
      className={`upload-zone${dragOver ? ' drag-over' : ''}${fileInfo ? ' has-file' : ''}`}
      onDrop={handleDrop}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onClick={() => !fileInfo && inputRef.current?.click()}
    >
      {fileInfo ? (
        <div className="file-info">
          <span className="file-icon">📄</span>
          <span className="file-name">{fileInfo}</span>
          <button className="file-clear" onClick={e => { e.stopPropagation(); onClear(); }} title="Remove file">✕</button>
        </div>
      ) : (
        <>
          <div className="upload-icon">{icon}</div>
          <span className="upload-label">{label}</span>
          <small>Drag &amp; drop PDF or click to browse</small>
        </>
      )}
      <input ref={inputRef} type="file" accept="application/pdf" hidden onChange={e => { if (e.target.files?.[0]) onFile(e.target.files[0]); e.target.value = ''; }} />
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<App />);
}


let questions = [];
let currentQ = 0;
let score = { correct: 0, wrong: 0 };
let answers = [];
let answered = false;

// ─── Theme toggle ─────────────────────────────────────────────
function toggleTheme() {
  const html = document.documentElement;
  const btn = document.getElementById('themeToggle');
  if (html.dataset.theme === 'dark') {
    html.removeAttribute('data-theme');
    btn.textContent = '🌙 DARK';
  } else {
    html.dataset.theme = 'dark';
    btn.textContent = '☀️ LIGHT';
  }
}

// ─── File handling ───────────────────────────────────────────
const fileInput = document.getElementById('fileInput');
const uploadZone = document.getElementById('uploadZone');

uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) processFile(file);
});

fileInput.addEventListener('change', e => {
  if (e.target.files[0]) processFile(e.target.files[0]);
});

function processFile(file) {
  setLoading(20, 'READING FILE...');
  hideError();
  const reader = new FileReader();
  const isCSV = file.name.toLowerCase().endsWith('.csv');

  reader.onload = e => {
    try {
      setLoading(60, 'PARSING DATA...');
      let wb;
      if (isCSV) {
        wb = XLSX.read(e.target.result, { type: 'string' });
      } else {
        wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
      }
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      const parsed = [];
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const q = String(row[0] || '').trim();
        const a = String(row[1] || '').trim();
        const b = String(row[2] || '').trim();
        const c = String(row[3] || '').trim();
        const d = String(row[4] || '').trim();
        const ans = String(row[5] || '').trim().toUpperCase();
        if (q && (a || b) && ['A','B','C','D'].includes(ans)) {
          parsed.push({ question: q, options: [a, b, c, d], answer: ans });
        }
      }

      if (parsed.length === 0) {
        showError('NO VALID QUESTIONS FOUND.\nCHECK YOUR FILE FORMAT!');
        setLoading(0, 'LOADING...');
        return;
      }

      questions = parsed;
      setLoading(100, 'READY!');
      document.getElementById('fileInfo').style.display = 'block';
      document.getElementById('fileName').textContent = file.name.toUpperCase();
      document.getElementById('questionCount').textContent = questions.length;
      document.getElementById('startBtn').disabled = false;

    } catch(err) {
      showError('ERROR READING FILE: ' + err.message);
      setLoading(0, 'LOADING...');
    }
  };

  reader.onerror = () => { showError('FAILED TO READ FILE.'); setLoading(0, 'LOADING...'); };

  if (isCSV) {
    reader.readAsText(file);
  } else {
    reader.readAsArrayBuffer(file);
  }
}

// ─── Quiz logic ───────────────────────────────────────────────
function startQuiz() {
  currentQ = 0;
  score = { correct: 0, wrong: 0 };
  answers = [];
  showScreen('screenQuiz');
  loadQuestion();
}

function loadQuestion() {
  answered = false;
  const q = questions[currentQ];
  const total = questions.length;

  // Progress
  const pct = Math.round((currentQ / total) * 100);
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressText').textContent = (currentQ + 1) + ' / ' + total;
  document.getElementById('scoreCorrect').textContent = score.correct;
  document.getElementById('scoreWrong').textContent = score.wrong;

  // Loading bar
  setLoading(pct, 'QUESTION ' + (currentQ+1) + ' OF ' + total);

  // Question
  document.getElementById('questionNum').textContent = 'QUESTION ' + (currentQ+1);
  document.getElementById('questionText').textContent = q.question;

  // Options
  const labels = ['A','B','C','D'];
  const grid = document.getElementById('optionsGrid');
  grid.innerHTML = '';
  q.options.forEach((opt, i) => {
    if (!opt) return;
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerHTML = `<span class="opt-label">${labels[i]}</span>${opt}`;
    btn.dataset.choice = labels[i];
    btn.onclick = () => selectAnswer(labels[i]);
    grid.appendChild(btn);
  });

  // Hide feedback & next
  const fb = document.getElementById('feedbackBox');
  fb.className = 'feedback-box';
  fb.style.display = 'none';
  document.getElementById('nextBtn').style.display = 'none';
}

function selectAnswer(choice) {
  if (answered) return;
  answered = true;

  const q = questions[currentQ];
  const isCorrect = choice === q.answer;
  const labels = ['A','B','C','D'];

  // Update score
  if (isCorrect) score.correct++; else score.wrong++;
  answers.push({ q: q.question, chosen: choice, correct: q.answer, isCorrect });

  // Style buttons
  const btns = document.querySelectorAll('.option-btn');
  btns.forEach(btn => {
    btn.disabled = true;
    const c = btn.dataset.choice;
    if (c === q.answer) {
      if (c === choice) btn.classList.add('correct');
      else btn.classList.add('reveal');
    } else if (c === choice && !isCorrect) {
      btn.classList.add('wrong');
    }
  });

  // Feedback
  const fb = document.getElementById('feedbackBox');
  if (isCorrect) {
    fb.className = 'feedback-box correct-fb show';
    const msgs = ['✨ PERFECT!', '🌸 CORRECT!', '💫 NICE ONE!', '⭐ GREAT JOB!'];
    fb.innerHTML = msgs[Math.floor(Math.random()*msgs.length)] + ' THE ANSWER IS ' + q.answer + '.';
  } else {
    fb.className = 'feedback-box wrong-fb show';
    fb.innerHTML = '💔 WRONG! THE CORRECT ANSWER IS ' + q.answer + '.';
  }
  fb.style.display = 'block';

  // Update score display
  document.getElementById('scoreCorrect').textContent = score.correct;
  document.getElementById('scoreWrong').textContent = score.wrong;

  // Next button
  const nextBtn = document.getElementById('nextBtn');
  nextBtn.style.display = 'inline-block';
  if (currentQ === questions.length - 1) {
    nextBtn.textContent = 'FINISH ✦';
  } else {
    nextBtn.textContent = 'NEXT ▶';
  }
}

function nextQuestion() {
  currentQ++;
  if (currentQ >= questions.length) {
    showResults();
  } else {
    loadQuestion();
  }
}

function showResults() {
  showScreen('screenResults');

  const total = questions.length;
  const correct = score.correct;
  const wrong = score.wrong;
  const pct = Math.round((correct / total) * 100);

  document.getElementById('rTotal').textContent = total;
  document.getElementById('rCorrect').textContent = correct;
  document.getElementById('rWrong').textContent = wrong;
  document.getElementById('percentLabel').textContent = pct + '% SCORE';

  // Animated bar
  setTimeout(() => {
    document.getElementById('percentBar').style.width = pct + '%';
  }, 100);

  // Grade
  let grade = '💔';
  if (pct === 100) grade = '👑';
  else if (pct >= 80) grade = '🌟';
  else if (pct >= 60) grade = '🌸';
  else if (pct >= 40) grade = '🌼';
  document.getElementById('gradeBadge').textContent = grade;

  setLoading(100, 'QUIZ COMPLETE!');

  // Review list
  const reviewList = document.getElementById('reviewList');
  reviewList.innerHTML = '';
  answers.forEach((a, i) => {
    const div = document.createElement('div');
    div.className = 'review-item ' + (a.isCorrect ? 'r-correct' : 'r-wrong');
    div.innerHTML = `
      <div class="review-q">${i+1}. ${a.q}</div>
      <div class="review-detail">
        ${a.isCorrect ? '✔ CORRECT' : '✘ WRONG'} — YOUR ANSWER: ${a.chosen} | CORRECT: ${a.correct}
      </div>
    `;
    reviewList.appendChild(div);
  });
}

function restartQuiz() {
  startQuiz();
}

function newFile() {
  questions = [];
  answers = [];
  score = { correct: 0, wrong: 0 };
  currentQ = 0;
  document.getElementById('fileInfo').style.display = 'none';
  document.getElementById('startBtn').disabled = true;
  document.getElementById('fileName').textContent = '';
  document.getElementById('questionCount').textContent = '';
  fileInput.value = '';
  setLoading(0, 'LOADING...');
  hideError();
  showScreen('screenUpload');
}

// ─── Helpers ──────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function setLoading(pct, label) {
  document.getElementById('loadingBar').style.width = pct + '%';
  document.getElementById('loadingLabel').textContent = label;
}

function showError(msg) {
  const el = document.getElementById('errorMsg');
  el.textContent = msg;
  el.style.display = 'block';
}

function hideError() {
  document.getElementById('errorMsg').style.display = 'none';
}
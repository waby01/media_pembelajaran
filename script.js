// ==========================================
// GLOBAL STATE & DATA STORAGE
// ==========================================
let currentScore = 0;
let currentQuestionIndex = 0;
let userApiKey = localStorage.getItem('gemini_api_key') || '';
let indonesianVoice = null;

let databaseData = null;
let fullQuizBank = [];
let activeQuizList = []; // 10 Soal Acak
let detailData = {};

// SYSTEM INSTRUCTION GEMINI AI - NEII (TANPA DATABASE MANUAL)
const systemInstruction = `Kamu adalah Neii, maskot kucing pintar, imut, dan ramah yang bertugas sebagai asisten pembelajaran interaktif siswa SD/MIN Kelas 1.

TOPIK UTAMA KAMU: Bab "Bunyi Apa?" (Bahasa Indonesia Kelas 1 SD).

TUGAS DAN ATURAN KAMU:
1. Jawab SEMUA pertanyaan siswa seputar bunyi, suara hewan, suara fenomena alam, suara alat musik, suara benda buatan manusia, cara telinga mendengar, serta sifat bunyi (keras/pelan) menggunakan pengetahuan sains yang kamu miliki.
2. Gaya Bahasa: Gunakan bahasa anak-anak kelas 1 SD/MIN yang sangat ramah, ceria, imut, penuh semangat, dan mudah dipahami.
3. Selalu sapa siswa dengan sebutan hangat seperti "Adik-adik", "Sahabat Neii", atau "Teman Pintar".
4. Gunakan tiruan suara lucu jika relevan (contoh: "Tik-tik-tik!", "Kukukuruyuk!", "Pripit-pripit!", "Tin-tin!", "Jreng-jreng!").
5. Sisipkan emoji yang lucu dan berwarna-warni di setiap jawaban (🐱, 🐶, 🌧️, 🔔, 🎵).
6. Jika siswa bertanya hal di luar materi sekolah/bunyi, ingatkan secara halus dan imut untuk kembali belajar seputar bunyi dan suara bersama Neii!`;

// ==========================================
// TAB SWITCHER (ATTACHED TO WINDOW)
// ==========================================
window.switchTab = function (tabName) {
  console.log("Berpindah ke tab:", tabName);
  const tabs = ['materi', 'kuis', 'ai'];
  tabs.forEach(tab => {
    const content = document.getElementById(`content-${tab}`);
    const btn = document.getElementById(`tab-${tab}`);
    if (content && btn) {
      if (tab === tabName) {
        content.classList.remove('hidden');
        content.classList.add('block');
        btn.classList.add('text-teal-700', 'border-b-4', 'border-teal-600', 'bg-teal-50');
        btn.classList.remove('text-gray-500');
      } else {
        content.classList.add('hidden');
        content.classList.remove('block');
        btn.classList.remove('text-teal-700', 'border-b-4', 'border-teal-600', 'bg-teal-50');
        btn.classList.add('text-gray-500');
      }
    }
  });
};

// ==========================================
// FETCH DATABASE & SHUFFLE QUIZ (10 SOAL)
// ==========================================
async function loadDatabase() {
  try {
    const response = await fetch('database.json');
    databaseData = await response.json();

    detailData = databaseData.materi_detail || {};
    fullQuizBank = databaseData.kuis_bank || [];

    // Pilih 10 soal acak dari 25 bank soal
    activeQuizList = shuffleArray([...fullQuizBank]).slice(0, 10);

    console.log("Database.json loaded successfully!");
    loadQuestion();
  } catch (error) {
    console.error("Gagal memuat database.json:", error);
  }
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// ==========================================
// INDONESIAN VOICE LOCKER
// ==========================================
function initIndonesianVoice() {
  if ('speechSynthesis' in window) {
    const voices = window.speechSynthesis.getVoices();
    indonesianVoice = voices.find(v => v.lang.toLowerCase().includes('id') || v.lang.toLowerCase().includes('indonesia'));
  }
}

if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = initIndonesianVoice;
  initIndonesianVoice();
}

window.speakText = function (text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 0.85;
    utterance.pitch = 1.1;

    if (!indonesianVoice) initIndonesianVoice();
    if (indonesianVoice) {
      utterance.voice = indonesianVoice;
    }

    window.speechSynthesis.speak(utterance);
  } else {
    alert('Maaf, fitur suara tidak didukung di browser ini.');
  }
};

// ==========================================
// MODAL DETAIL FUNCTIONS
// ==========================================
let activeModalText = "";

window.openDetail = function (key) {
  const data = detailData[key];
  if (!data) return;

  document.getElementById('modal-icon').innerHTML = data.icon;
  document.getElementById('modal-badge').innerHTML = data.badge;
  document.getElementById('modal-badge').className = `text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded ${data.badgeColor}`;
  document.getElementById('modal-title').innerText = data.title;
  document.getElementById('modal-body').innerHTML = data.content;

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = data.content;
  activeModalText = `${data.title}. ${tempDiv.innerText || tempDiv.textContent}`;

  document.getElementById('detail-modal').classList.remove('hidden');
};

window.closeDetail = function () {
  document.getElementById('detail-modal').classList.add('hidden');
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
};

window.readModalText = function () {
  if (activeModalText) window.speakText(activeModalText);
};

// ==========================================
// QUIZ FUNCTIONS (10 SOAL ACAK & EFEK KEMBANG API)
// ==========================================
window.nextQuestion = function () {
  currentQuestionIndex++;
  loadQuestion();
};

window.resetQuiz = function () {
  currentScore = 0;
  currentQuestionIndex = 0;
  activeQuizList = shuffleArray([...fullQuizBank]).slice(0, 10);
  const scoreDisplay = document.getElementById('score-display');
  if (scoreDisplay) scoreDisplay.innerText = '0';
  loadQuestion();
};

function loadQuestion() {
  const questionNumberEl = document.getElementById('question-number');
  const questionTextEl = document.getElementById('question-text');
  const optionsContainer = document.getElementById('options-container');

  if (!questionNumberEl || !questionTextEl || !optionsContainer || activeQuizList.length === 0) return;

  const currentQuiz = activeQuizList[currentQuestionIndex];
  questionNumberEl.innerText = `Pertanyaan ${currentQuestionIndex + 1} dari ${activeQuizList.length}`;
  questionTextEl.innerText = currentQuiz.question;

  optionsContainer.innerHTML = '';

  currentQuiz.options.forEach((option, index) => {
    const btn = document.createElement('button');
    btn.className = 'w-full text-left p-3.5 rounded-xl border border-gray-200 hover:border-teal-500 hover:bg-teal-50 font-medium text-gray-700 transition flex justify-between items-center';
    btn.innerHTML = `<span>${String.fromCharCode(65 + index)}. ${option}</span> <i class="fa-regular fa-circle text-gray-300"></i>`;
    btn.onclick = () => selectOption(index, btn);
    optionsContainer.appendChild(btn);
  });

  const feedbackBox = document.getElementById('feedback-box');
  const nextBtn = document.getElementById('next-btn');
  if (feedbackBox) feedbackBox.classList.add('hidden');
  if (nextBtn) nextBtn.classList.add('hidden');
}

function selectOption(selectedIndex, btnElement) {
  const currentQuiz = activeQuizList[currentQuestionIndex];
  const optionsContainer = document.getElementById('options-container');
  const buttons = optionsContainer ? optionsContainer.children : [];
  const feedbackBox = document.getElementById('feedback-box');
  const scoreDisplay = document.getElementById('score-display');
  const nextBtn = document.getElementById('next-btn');

  // Matikan semua tombol biar gak bisa diklik berulang kali
  for (let i = 0; i < buttons.length; i++) {
    buttons[i].disabled = true;
    buttons[i].classList.add('opacity-75', 'cursor-not-allowed');
  }

  if (selectedIndex === currentQuiz.answer) {
    // 🟢 JIKA BENAR: Tombol berubah hijau & Timbul
    btnElement.className = 'w-full text-left p-3.5 rounded-xl border-2 border-emerald-500 bg-emerald-50 font-bold text-emerald-800 flex justify-between items-center shadow-md transform scale-[1.02] transition';
    btnElement.innerHTML = `<span>${btnElement.innerText}</span> <i class="fa-solid fa-circle-check text-emerald-600 text-xl"></i>`;

    currentScore += Math.round(100 / activeQuizList.length);
    if (scoreDisplay) scoreDisplay.innerText = currentScore;

    if (feedbackBox) {
      feedbackBox.className = 'p-4 rounded-xl mb-4 font-semibold text-sm bg-emerald-100 text-emerald-900 border border-emerald-200';
      feedbackBox.innerHTML = `🎉 **Benar Banget!** ${currentQuiz.explanation}`;
    }

    // 🎆 EFEK KEMBANG API MERIAH (Tengah, Kiri, Kanan)
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d']
      });
      setTimeout(() => confetti({ particleCount: 70, angle: 60, spread: 55, origin: { x: 0, y: 0.7 } }), 200);
      setTimeout(() => confetti({ particleCount: 70, angle: 120, spread: 55, origin: { x: 1, y: 0.7 } }), 400);
    }
  } else {
    // 🔴 JIKA SALAH: Tombol yang dipilih jadi merah
    btnElement.className = 'w-full text-left p-3.5 rounded-xl border-2 border-rose-500 bg-rose-50 font-bold text-rose-800 flex justify-between items-center';
    btnElement.innerHTML = `<span>${btnElement.innerText}</span> <i class="fa-solid fa-circle-xmark text-rose-600 text-lg"></i>`;

    // ✨ KOREKSI OTOMATIS: Tombol jawaban benar nyala hijau & kedap-kedip
    const correctBtn = buttons[currentQuiz.answer];
    correctBtn.className = 'w-full text-left p-3.5 rounded-xl border-2 border-emerald-500 bg-emerald-100 font-bold text-emerald-800 flex justify-between items-center animate-pulse shadow-md';
    correctBtn.innerHTML = `<span>${correctBtn.innerText} (Ini Jawaban Benar)</span> <i class="fa-solid fa-circle-check text-emerald-600 text-xl"></i>`;

    if (feedbackBox) {
      feedbackBox.className = 'p-4 rounded-xl mb-4 font-semibold text-sm bg-rose-100 text-rose-900 border border-rose-200';
      feedbackBox.innerHTML = `😅 **Hampir Benar!** Jawaban yang tepat adalah: **${currentQuiz.options[currentQuiz.answer]}**. ${currentQuiz.explanation}`;
    }
  }

  if (feedbackBox) feedbackBox.classList.remove('hidden');

  if (nextBtn) {
    if (currentQuestionIndex < activeQuizList.length - 1) {
      nextBtn.innerText = 'Lanjut Pertanyaan ➡️';
      nextBtn.onclick = window.nextQuestion;
    } else {
      nextBtn.innerText = '🎉 Kuis Selesai! Main Ulang (Soal Baru)';
      nextBtn.onclick = window.resetQuiz;
    }
    nextBtn.classList.remove('hidden');
  }
}

// ==========================================
// GEMINI AI CHATBOT LOGIC - NEII
// ==========================================
window.saveApiKey = function () {
  const apiKeyInput = document.getElementById('api-key-input');
  const key = apiKeyInput ? apiKeyInput.value.trim() : '';
  if (key) {
    userApiKey = key;
    localStorage.setItem('gemini_api_key', key);
    alert('API Key berhasil disimpan di browser!');
  } else {
    alert('Harap masukkan Gemini API Key terlebih dahulu!');
  }
};

window.handleKeyPress = function (e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    window.sendMessage();
  }
};

window.sendMessage = async function () {
  const inputEl = document.getElementById('chat-input');
  const userText = inputEl ? inputEl.value.trim() : '';
  if (!userText) return;

  if (!userApiKey) {
    alert('Harap masukkan Gemini API Key terlebih dahulu di pojok kanan atas tab AI!');
    return;
  }

  appendMessage('user', userText);
  if (inputEl) inputEl.value = '';

  const loadingId = appendLoading();

  // Daftar model v1beta yang valid
  const modelsToTry = [
    "gemini-3.8-flash"
  ];

  let aiReply = null;
  let lastErrorMsg = "";

  for (let modelName of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=AQ.Ab8RN6Kq-IKoZhWW_pcltCnPgQ1i6MuJ8J4KO7-CH5BeaoxMtw`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemInstruction}\n\nPertanyaan Siswa: ${userText}` }]
            }
          ]
        })
      });

      const data = await response.json();

      if (response.ok && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0].text) {
        aiReply = data.candidates[0].content.parts[0].text;
        break;
      } else if (data.error) {
        console.warn(`Gagal di model ${modelName}:`, data.error.message);
        lastErrorMsg = data.error.message;
      }
    } catch (err) {
      console.warn(`Fetch error di model ${modelName}:`, err);
    }
  }

  removeMessage(loadingId);

  if (aiReply) {
    appendMessage('ai', aiReply);
  } else {
    appendMessage('ai', `Waduh, Kak Neii gagal konek nih 😅. Detail Error dari Google: **"${lastErrorMsg || 'API Key salah atau belum aktif'}"**. Coba periksa kembali API Key kamu di Google AI Studio ya!`);
  }
};

function appendMessage(sender, text) {
  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages) return;

  const msgDiv = document.createElement('div');

  if (sender === 'user') {
    msgDiv.className = 'flex items-start gap-2 max-w-[85%] ml-auto flex-row-reverse';
    msgDiv.innerHTML = `
      <div class="w-8 h-8 bg-teal-600 text-white rounded-full flex items-center justify-center text-xs flex-shrink-0 font-bold">Kamu</div>
      <div class="bg-teal-600 text-white p-3 rounded-2xl rounded-tr-none text-sm shadow-sm">${escapeHtml(text)}</div>
    `;
  } else {
    msgDiv.className = 'flex items-start gap-2 max-w-[85%]';
    msgDiv.innerHTML = `
      <div class="w-8 h-8 bg-amber-300 rounded-full flex items-center justify-center text-sm flex-shrink-0">🐱</div>
      <div class="bg-amber-50 text-gray-800 p-3 rounded-2xl rounded-tl-none border border-amber-100 text-sm shadow-sm">${formatMarkdown(text)}</div>
    `;
  }

  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendLoading() {
  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages) return '';

  const id = 'loading-' + Date.now();
  const msgDiv = document.createElement('div');
  msgDiv.id = id;
  msgDiv.className = 'flex items-start gap-2 max-w-[85%]';
  msgDiv.innerHTML = `
    <div class="w-8 h-8 bg-amber-300 rounded-full flex items-center justify-center text-sm flex-shrink-0">🐱</div>
    <div class="bg-amber-50 text-gray-500 p-3 rounded-2xl rounded-tl-none border border-amber-100 text-sm flex items-center gap-2">
      <i class="fa-solid fa-circle-notch animate-spin text-teal-600"></i> Kak Neii sedang berpikir...
    </div>
  `;
  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return id;
}

function removeMessage(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
}

function formatMarkdown(text) {
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
}

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
  initIndonesianVoice();
  loadDatabase();

  const apiKeyInput = document.getElementById('api-key-input');
  if (apiKeyInput && userApiKey) {
    apiKeyInput.value = userApiKey;
  }
});
/**
 * ÔN TẬP GDQP 11 - Ứng dụng trắc nghiệm trực tuyến B&W
 * Giữ nguyên thứ tự câu hỏi - Tráo ngẫu nhiên đáp án A, B, C, D
 * Đếm ngược 45 phút - Tối ưu di động
 */

(function () {
  'use strict';

  // Constants
  const TOTAL_TIME_SECONDS = 45 * 60; // 45 phút = 2700s
  const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

  // State
  let currentQuestions = [];
  let userAnswers = {}; // { questionId: selectedOptionIndex }
  let timerInterval = null;
  let timeRemaining = TOTAL_TIME_SECONDS;
  let isSubmitted = false;
  let currentFilter = 'all';

  // DOM Elements
  const timerDisplay = document.getElementById('timerDisplay');
  const timerBadge = document.getElementById('timerBadge');
  const progressSummary = document.getElementById('progressSummary');
  const progressBarFill = document.getElementById('progressBarFill');
  const bottomAnsweredCount = document.getElementById('bottomAnsweredCount');
  const questionsContainer = document.getElementById('questionsContainer');

  const btnToggleNav = document.getElementById('btnToggleNav');
  const questionDrawer = document.getElementById('questionDrawer');
  const drawerOverlay = document.getElementById('drawerOverlay');
  const btnCloseDrawer = document.getElementById('btnCloseDrawer');
  const drawerGrid = document.getElementById('drawerGrid');

  const btnNavSubmit = document.getElementById('btnNavSubmit');
  const btnBottomSubmit = document.getElementById('btnBottomSubmit');
  const confirmModal = document.getElementById('confirmModal');
  const modalMessage = document.getElementById('modalMessage');
  const btnModalCancel = document.getElementById('btnModalCancel');
  const btnModalConfirm = document.getElementById('btnModalConfirm');

  const examScreen = document.getElementById('examScreen');
  const resultsScreen = document.getElementById('resultsScreen');

  const resultScore = document.getElementById('resultScore');
  const resultHeadline = document.getElementById('resultHeadline');
  const resultPercentage = document.getElementById('resultPercentage');
  const resultCorrect = document.getElementById('resultCorrect');
  const resultWrong = document.getElementById('resultWrong');
  const resultUnanswered = document.getElementById('resultUnanswered');
  const resultTime = document.getElementById('resultTime');
  const reviewList = document.getElementById('reviewList');
  const filterButtons = document.querySelectorAll('.btn-filter');
  const filterWrongBtn = document.getElementById('filterWrongBtn');
  const filterCorrectBtn = document.getElementById('filterCorrectBtn');
  const btnRetake = document.getElementById('btnRetake');

  /**
   * Fisher-Yates Shuffle
   */
  function shuffleArray(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  /**
   * Format Seconds to MM:SS
   */
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  /**
   * Initialize or Retake Exam
   */
  function initExam() {
    isSubmitted = false;
    userAnswers = {};
    timeRemaining = TOTAL_TIME_SECONDS;
    currentFilter = 'all';

    // Clone questions while keeping original question order,
    // but randomly shuffle the 4 options for each question!
    currentQuestions = QUIZ_QUESTIONS.map(q => {
      return {
        ...q,
        options: shuffleArray(q.options)
      };
    });

    renderExam();
    renderDrawerGrid();
    updateProgressUI();

    // Start Timer
    clearInterval(timerInterval);
    updateTimerDisplay();
    timerInterval = setInterval(onTimerTick, 1000);

    // Switch view
    examScreen.classList.remove('hidden');
    resultsScreen.classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Timer Tick Handler
   */
  function onTimerTick() {
    if (isSubmitted) {
      clearInterval(timerInterval);
      return;
    }

    timeRemaining--;
    updateTimerDisplay();

    if (timeRemaining <= 0) {
      clearInterval(timerInterval);
      alert('Đã hết 45 phút làm bài! Hệ thống tự động nộp bài.');
      submitExam();
    }
  }

  function updateTimerDisplay() {
    timerDisplay.textContent = formatTime(timeRemaining);
    if (timeRemaining <= 300) { // under 5 minutes
      timerBadge.classList.add('warning');
    } else {
      timerBadge.classList.remove('warning');
    }
  }

  /**
   * Render Exam Questions grouped by Lesson
   */
  function renderExam() {
    questionsContainer.innerHTML = '';

    // Group by lesson
    const grouped = {};
    currentQuestions.forEach((q, idx) => {
      const lesson = q.lesson || 'Đề cương ôn tập';
      if (!grouped[lesson]) {
        grouped[lesson] = [];
      }
      grouped[lesson].push({ q, index: idx + 1 });
    });

    Object.keys(grouped).forEach(lessonName => {
      const section = document.createElement('section');
      section.className = 'lesson-section';

      const header = document.createElement('div');
      header.className = 'lesson-header';
      header.innerHTML = `<h2 class="lesson-title">${escapeHTML(lessonName)}</h2>`;
      section.appendChild(header);

      grouped[lessonName].forEach(({ q, index }) => {
        const card = document.createElement('article');
        card.className = 'question-card';
        card.id = `qCard_${q.id}`;

        let diagramHtml = '';
        if (q.image) {
          diagramHtml = `
            <div class="question-diagram-wrapper">
              <img src="${q.image}" alt="Sơ đồ minh họa câu hỏi" class="question-diagram-img" loading="lazy">
              <div class="diagram-caption">Sơ đồ xác định các vùng biển của Việt Nam</div>
            </div>
          `;
        }

        const optionsHtml = q.options.map((opt, optIdx) => {
          const letter = OPTION_LETTERS[optIdx];
          const isSelected = userAnswers[q.id] === optIdx;
          return `
            <button type="button" class="option-btn ${isSelected ? 'selected' : ''}" 
                    data-qid="${q.id}" data-optidx="${optIdx}" 
                    id="opt_${q.id}_${optIdx}"
                    aria-label="Chọn đáp án ${letter}">
              <span class="opt-letter">${letter}</span>
              <span class="opt-text">${escapeHTML(opt.text)}</span>
            </button>
          `;
        }).join('');

        card.innerHTML = `
          <div class="question-top">
            <div class="question-badges">
              <span class="q-index-badge">Câu ${index}</span>
              <span class="q-orig-badge">Đề gốc: Câu ${q.qNum}</span>
            </div>
            <span class="q-status-badge" id="qStatus_${q.id}">Chưa chọn</span>
          </div>

          <div class="question-text">${escapeHTML(q.question)}</div>
          ${diagramHtml}
          <div class="options-list" role="radiogroup">
            ${optionsHtml}
          </div>
        `;

        section.appendChild(card);
      });

      questionsContainer.appendChild(section);
    });

    // Attach click listeners to option buttons via delegation
    questionsContainer.addEventListener('click', handleOptionClick);
  }

  /**
   * Handle Option Selection
   */
  function handleOptionClick(e) {
    if (isSubmitted) return;

    const btn = e.target.closest('.option-btn');
    if (!btn) return;

    const qid = parseInt(btn.dataset.qid, 10);
    const optIdx = parseInt(btn.dataset.optidx, 10);

    // Update answer
    userAnswers[qid] = optIdx;

    // Update visual state for this question's options
    const card = document.getElementById(`qCard_${qid}`);
    if (card) {
      card.classList.add('has-answered');
      const optButtons = card.querySelectorAll('.option-btn');
      optButtons.forEach(b => {
        const curIdx = parseInt(b.dataset.optidx, 10);
        if (curIdx === optIdx) {
          b.classList.add('selected');
        } else {
          b.classList.remove('selected');
        }
      });

      const statusBadge = document.getElementById(`qStatus_${qid}`);
      if (statusBadge) {
        statusBadge.textContent = 'Đã chọn';
        statusBadge.classList.add('answered');
      }
    }

    // Update global progress & drawer button
    updateProgressUI();
    updateDrawerGridItem(qid);
  }

  /**
   * Update Progress UI
   */
  function updateProgressUI() {
    const total = currentQuestions.length;
    const answered = Object.keys(userAnswers).length;
    const pct = (answered / total) * 100;

    progressSummary.textContent = `${answered}/${total}`;
    bottomAnsweredCount.textContent = answered;
    progressBarFill.style.width = `${pct}%`;
  }

  /**
   * Render Question Quick Drawer
   */
  function renderDrawerGrid() {
    drawerGrid.innerHTML = '';
    currentQuestions.forEach((q, idx) => {
      const qIndex = idx + 1;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `btn-grid-q ${userAnswers[q.id] !== undefined ? 'answered' : ''}`;
      btn.id = `drawerBtn_${q.id}`;
      btn.textContent = qIndex;
      btn.title = `Chuyển tới Câu ${qIndex} (Đề gốc: Câu ${q.qNum})`;

      btn.addEventListener('click', () => {
        closeDrawer();
        const target = document.getElementById(`qCard_${q.id}`);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });

      drawerGrid.appendChild(btn);
    });
  }

  function updateDrawerGridItem(qid) {
    const btn = document.getElementById(`drawerBtn_${qid}`);
    if (btn) {
      btn.classList.add('answered');
    }
  }

  /**
   * Drawer Toggle Controls
   */
  function openDrawer() {
    questionDrawer.classList.add('open');
    drawerOverlay.classList.add('open');
    questionDrawer.setAttribute('aria-hidden', 'false');
  }

  function closeDrawer() {
    questionDrawer.classList.remove('open');
    drawerOverlay.classList.remove('open');
    questionDrawer.setAttribute('aria-hidden', 'true');
  }

  btnToggleNav.addEventListener('click', openDrawer);
  btnCloseDrawer.addEventListener('click', closeDrawer);
  drawerOverlay.addEventListener('click', closeDrawer);

  /**
   * Submit Confirmation Modal
   */
  function showSubmitConfirm() {
    if (isSubmitted) return;

    const total = currentQuestions.length;
    const answered = Object.keys(userAnswers).length;
    const unanswered = total - answered;

    if (unanswered > 0) {
      modalMessage.innerHTML = `
        Bạn đã trả lời <strong>${answered}/${total}</strong> câu hỏi.<br>
        Còn lại <strong style="color:#000;">${unanswered} câu chưa làm</strong>.<br><br>
        Bạn có chắc chắn muốn nộp bài để chấm điểm ngay bây giờ không?
      `;
    } else {
      modalMessage.innerHTML = `
        Tuyệt vời! Bạn đã hoàn thành toàn bộ <strong>${total}/${total}</strong> câu hỏi.<br><br>
        Bạn có muốn nộp bài để xem kết quả chi tiết?
      `;
    }

    confirmModal.classList.remove('hidden');
  }

  btnNavSubmit.addEventListener('click', showSubmitConfirm);
  btnBottomSubmit.addEventListener('click', showSubmitConfirm);

  btnModalCancel.addEventListener('click', () => {
    confirmModal.classList.add('hidden');
  });

  btnModalConfirm.addEventListener('click', () => {
    confirmModal.classList.add('hidden');
    submitExam();
  });

  /**
   * Calculate Score & Render Results
   */
  function submitExam() {
    isSubmitted = true;
    clearInterval(timerInterval);

    const total = currentQuestions.length;
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;

    const reviewData = [];

    currentQuestions.forEach((q, idx) => {
      const userOptIdx = userAnswers[q.id];
      const correctOptIdx = q.options.findIndex(opt => opt.isCorrect);

      const isUnanswered = userOptIdx === undefined;
      const isCorrect = !isUnanswered && userOptIdx === correctOptIdx;
      const isWrong = !isUnanswered && userOptIdx !== correctOptIdx;

      if (isCorrect) correctCount++;
      else if (isWrong) wrongCount++;
      else if (isUnanswered) unansweredCount++;

      reviewData.push({
        index: idx + 1,
        question: q,
        userOptIdx,
        correctOptIdx,
        isCorrect,
        isWrong,
        isUnanswered
      });
    });

    const elapsedSeconds = TOTAL_TIME_SECONDS - Math.max(0, timeRemaining);
    const scorePct = Math.round((correctCount / total) * 100);

    // Update Stats Display
    resultScore.textContent = correctCount;
    resultPercentage.textContent = `Độ chính xác: ${scorePct}%`;
    resultCorrect.textContent = correctCount;
    resultWrong.textContent = wrongCount;
    resultUnanswered.textContent = unansweredCount;
    resultTime.textContent = formatTime(elapsedSeconds);

    if (scorePct >= 80) {
      resultHeadline.textContent = 'Xuất Sắc! Bạn Đã Nắm Rất Vững Kiến Thức';
    } else if (scorePct >= 50) {
      resultHeadline.textContent = 'Khá Tốt! Hãy Ôn Lại Các Câu Làm Sai Nhé';
    } else {
      resultHeadline.textContent = 'Cần Cố Gắng Hơn! Hãy Đọc Kỹ Đáp Án Chuẩn';
    }

    filterWrongBtn.textContent = `Câu sai (${wrongCount})`;
    filterCorrectBtn.textContent = `Câu đúng (${correctCount})`;

    // Render Review List
    renderReviewList(reviewData);

    // Switch View
    examScreen.classList.add('hidden');
    resultsScreen.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Render Review Items
   */
  function renderReviewList(items) {
    reviewList.innerHTML = '';

    items.forEach(item => {
      const { index, question, userOptIdx, correctOptIdx, isCorrect, isWrong, isUnanswered } = item;

      const card = document.createElement('article');
      card.className = `review-item ${isCorrect ? 'is-correct' : 'is-wrong'}`;
      card.dataset.status = isCorrect ? 'correct' : (isWrong ? 'wrong' : 'unanswered');

      // Status badge
      let badgeHtml = '';
      if (isCorrect) {
        badgeHtml = '<span class="review-badge-status badge-correct">✓ Làm đúng</span>';
      } else if (isWrong) {
        badgeHtml = '<span class="review-badge-status badge-wrong">✕ Làm sai</span>';
      } else {
        badgeHtml = '<span class="review-badge-status badge-unanswered">○ Chưa làm</span>';
      }

      // Diagram if any
      let diagramHtml = '';
      if (question.image) {
        diagramHtml = `
          <div class="question-diagram-wrapper">
            <img src="${question.image}" alt="Sơ đồ minh họa câu hỏi" class="question-diagram-img" loading="lazy">
          </div>
        `;
      }

      // Render options with clear indicator
      const optionsHtml = question.options.map((opt, optIdx) => {
        const letter = OPTION_LETTERS[optIdx];
        const isUserChoice = userOptIdx === optIdx;
        const isActualCorrect = correctOptIdx === optIdx;

        let extraClass = '';
        let tagHtml = '';

        if (isActualCorrect) {
          extraClass = 'actual-correct';
          tagHtml = '<span class="review-opt-tag tag-correct">Đáp án chuẩn</span>';
        } else if (isUserChoice && !isActualCorrect) {
          extraClass = 'user-picked-wrong';
          tagHtml = '<span class="review-opt-tag tag-user">Lựa chọn của bạn (Sai)</span>';
        }

        return `
          <div class="review-option ${extraClass}">
            <span class="opt-letter">${letter}</span>
            <span class="opt-text">${escapeHTML(opt.text)}</span>
            ${tagHtml}
          </div>
        `;
      }).join('');

      let noteHtml = '';
      if (question.note) {
        noteHtml = `<div class="review-note">💡 ${escapeHTML(question.note)}</div>`;
      }

      card.innerHTML = `
        <div class="question-top">
          <div class="question-badges">
            <span class="q-index-badge">Câu ${index}</span>
            <span class="q-orig-badge">Đề gốc: Câu ${question.qNum}</span>
            <span class="tag">${escapeHTML(question.lesson)}</span>
          </div>
          ${badgeHtml}
        </div>

        <div class="question-text">${escapeHTML(question.question)}</div>
        ${diagramHtml}
        <div class="review-options">
          ${optionsHtml}
        </div>
        ${noteHtml}
      `;

      reviewList.appendChild(card);
    });

    applyReviewFilter(currentFilter);
  }

  /**
   * Review Filter
   */
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      applyReviewFilter(currentFilter);
    });
  });

  function applyReviewFilter(filter) {
    const items = reviewList.querySelectorAll('.review-item');
    items.forEach(item => {
      const status = item.dataset.status;
      if (filter === 'all') {
        item.classList.remove('hidden');
      } else if (filter === 'wrong') {
        if (status === 'wrong' || status === 'unanswered') {
          item.classList.remove('hidden');
        } else {
          item.classList.add('hidden');
        }
      } else if (filter === 'correct') {
        if (status === 'correct') {
          item.classList.remove('hidden');
        } else {
          item.classList.add('hidden');
        }
      }
    });
  }

  /**
   * Retake Button
   */
  btnRetake.addEventListener('click', () => {
    initExam();
  });

  /**
   * Helper: Escape HTML
   */
  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  // Kickoff
  initExam();

})();

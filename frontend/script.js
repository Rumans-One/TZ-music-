const form = document.getElementById('applicationForm');
const statusEl = document.getElementById('status');
const submitBtn = document.getElementById('submitBtn');
const phoneInput = document.getElementById('phone');
const styleSelect = document.getElementById('musicStyle');
const customStyleInput = document.getElementById('customStyle');

const PHONE_MAX_LEN = 18;

const validators = {
  name: (v) => (v.trim().length >= 2 ? '' : 'Введите имя (минимум 2 символа)'),
  phone: (v) => {
    const cleaned = v.trim();
    const digits = cleaned.replace(/\D/g, '').length;
    if (!cleaned) return 'Введите телефон';
    if (cleaned.length > PHONE_MAX_LEN) return `Телефон должен быть не длиннее ${PHONE_MAX_LEN} символов`;
    if (!/^\+?[0-9\s\-()]{10,18}$/.test(cleaned)) return 'Введите корректный телефон';
    if (digits < 10 || digits > 15) return 'Телефон должен содержать 10–15 цифр';
    return '';
  },
  musicStyle: (value) => {
    if (!value) return 'Выберите музыкальный стиль';
    if (value === 'Другое') {
      return customStyleInput.value.trim().length >= 2 ? '' : 'Введите свой жанр (минимум 2 символа)';
    }
    return '';
  },
  comment: (v) => (v.trim().length >= 10 ? '' : 'Комментарий должен быть не короче 10 символов')
};

function getField(field) {
  if (field === 'musicStyle') return styleSelect;
  return form.querySelector(`[name="${field}"]`);
}

function setError(field, text) {
  const errorEl = document.querySelector(`[data-error="${field}"]`);
  const fieldEl = getField(field);

  if (errorEl) errorEl.textContent = text;
  if (fieldEl) fieldEl.setAttribute('aria-invalid', text ? 'true' : 'false');

  if (field === 'musicStyle' && styleSelect.value === 'Другое') {
    customStyleInput.setAttribute('aria-invalid', text ? 'true' : 'false');
  } else {
    customStyleInput.setAttribute('aria-invalid', 'false');
  }
}

function clearErrors() {
  Object.keys(validators).forEach((field) => setError(field, ''));
}

function validateField(field, value) {
  const validate = validators[field];
  if (!validate) return true;
  const err = validate(value || '');
  setError(field, err);
  return !err;
}

function toggleCustomStyle() {
  const showCustom = styleSelect.value === 'Другое';
  customStyleInput.hidden = !showCustom;
  customStyleInput.required = showCustom;
  if (!showCustom) {
    customStyleInput.value = '';
    customStyleInput.setAttribute('aria-invalid', 'false');
  }
}

phoneInput.addEventListener('input', () => {
  if (phoneInput.value.length > PHONE_MAX_LEN) {
    phoneInput.value = phoneInput.value.slice(0, PHONE_MAX_LEN);
  }
  if (phoneInput.getAttribute('aria-invalid') === 'true') {
    validateField('phone', phoneInput.value);
  }
});

styleSelect.addEventListener('change', () => {
  toggleCustomStyle();
  validateField('musicStyle', styleSelect.value);
});

customStyleInput.addEventListener('input', () => {
  if (styleSelect.value === 'Другое') {
    validateField('musicStyle', styleSelect.value);
  }
});

Object.keys(validators).forEach((field) => {
  const input = getField(field);
  if (!input) return;

  input.addEventListener('blur', () => validateField(field, input.value));
  if (field !== 'phone' && field !== 'musicStyle') {
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true') {
        validateField(field, input.value);
      }
    });
  }
});

let audioCtx;
let ambientNodes;
let shimmerInterval;

function startAmbient() {
  if (ambientNodes) return;

  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const master = audioCtx.createGain();
  master.gain.value = 0.018;
  master.connect(audioCtx.destination);

  const lowPad = audioCtx.createOscillator();
  const warmPad = audioCtx.createOscillator();
  const airyPad = audioCtx.createOscillator();
  const slowLfo = audioCtx.createOscillator();
  const slowLfoGain = audioCtx.createGain();

  lowPad.type = 'sine';
  warmPad.type = 'sine';
  airyPad.type = 'triangle';
  slowLfo.type = 'sine';

  lowPad.frequency.value = 196.0;
  warmPad.frequency.value = 246.94;
  airyPad.frequency.value = 293.66;
  slowLfo.frequency.value = 0.07;
  slowLfoGain.gain.value = 4;

  slowLfo.connect(slowLfoGain);
  slowLfoGain.connect(airyPad.frequency);

  lowPad.connect(master);
  warmPad.connect(master);
  airyPad.connect(master);

  lowPad.start();
  warmPad.start();
  airyPad.start();
  slowLfo.start();

  shimmerInterval = window.setInterval(() => {
    if (!audioCtx || audioCtx.state !== 'running') return;

    const now = audioCtx.currentTime;
    const note = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    note.type = 'sine';
    note.frequency.value = [392.0, 440.0, 493.88][Math.floor(Math.random() * 3)];
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.012, now + 0.18);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

    note.connect(gain);
    gain.connect(master);

    note.start(now);
    note.stop(now + 1.45);
  }, 2400);

  ambientNodes = { master, lowPad, warmPad, airyPad, slowLfo };
}

function stopAmbient() {
  if (ambientNodes) {
    ambientNodes.lowPad.stop();
    ambientNodes.warmPad.stop();
    ambientNodes.airyPad.stop();
    ambientNodes.slowLfo.stop();
    ambientNodes = null;
  }

  if (shimmerInterval) {
    window.clearInterval(shimmerInterval);
    shimmerInterval = null;
  }
}

window.addEventListener(
  'pointerdown',
  () => {
    if (!ambientNodes) startAmbient();
  },
  { once: true }
);

window.addEventListener(
  'keydown',
  () => {
    if (!ambientNodes) startAmbient();
  },
  { once: true }
);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopAmbient();
});

toggleCustomStyle();

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();
  statusEl.textContent = '';
  statusEl.className = 'status';

  const formData = Object.fromEntries(new FormData(form).entries());
  formData.musicStyle = styleSelect.value === 'Другое' ? customStyleInput.value.trim() : styleSelect.value;

  const isValid = Object.entries(validators).every(([field]) => validateField(field, field === 'musicStyle' ? styleSelect.value : formData[field]));

  if (!isValid) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Отправка...';

  try {
    const response = await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.name,
        phone: formData.phone,
        musicStyle: formData.musicStyle,
        comment: formData.comment
      })
    });

    const data = await response.json();

    if (!response.ok) {
      if (data.errors) {
        Object.entries(data.errors).forEach(([field, errors]) => {
          setError(field, (errors || ['Ошибка']).join(', '));
        });
      }
      throw new Error(data.message || 'Не удалось отправить форму');
    }

    statusEl.textContent = 'Спасибо! Заявка отправлена, мы скоро свяжемся с вами.';
    statusEl.classList.add('success');
    form.reset();
    toggleCustomStyle();
    clearErrors();
  } catch (error) {
    statusEl.textContent = error.message;
    statusEl.classList.add('fail');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Отправить заявку';
  }
});

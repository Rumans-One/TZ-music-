const form = document.getElementById('applicationForm');
const statusEl = document.getElementById('status');
const submitBtn = document.getElementById('submitBtn');

const phoneInput = document.getElementById('phone');
const styleSelect = document.getElementById('musicStyle');
const customStyleInput = document.getElementById('customStyle');

const audioToggle = document.getElementById('audioToggle');
const ambientAudio = document.getElementById('ambientAudio');

const PHONE_MAX_LEN = 18;

const validators = {
  name: (v) => (v.trim().length >= 2 ? '' : 'Введите имя (минимум 2 символа)'),
  phone: (v) => {
    const cleaned = v.trim();
    const digits = cleaned.replace(/\D/g, '');

    if (!cleaned) return 'Введите телефон';
    if (cleaned.length > PHONE_MAX_LEN) return `Телефон должен быть не длиннее ${PHONE_MAX_LEN} символов`;
    if (!/^\+?[0-9\s\-()]{10,18}$/.test(cleaned)) return 'Введите корректный телефон';
    if (digits.length < 10 || digits.length > 15) return 'Телефон должен содержать 10–15 цифр';

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
  const isCustom = styleSelect.value === 'Другое';
  customStyleInput.hidden = !isCustom;
  customStyleInput.required = isCustom;

  if (!isCustom) {
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

let audioActivated = false;

function setAudioButtonState(isPlaying) {
  if (!audioToggle) return;
  audioToggle.textContent = isPlaying ? '⏸ Пауза вашей дорожки' : '▶ Включить вашу дорожку';
  audioToggle.setAttribute('aria-pressed', isPlaying ? 'true' : 'false');
}

async function startAudio() {
  if (!ambientAudio) return;

  ambientAudio.volume = 0.16;

  try {
    await ambientAudio.play();
    audioActivated = true;
    setAudioButtonState(true);
  } catch {
    setAudioButtonState(false);
  }
}

function stopAudio() {
  if (!ambientAudio) return;
  ambientAudio.pause();
  setAudioButtonState(false);
}

if (audioToggle && ambientAudio) {
  audioToggle.addEventListener('click', async () => {
    if (ambientAudio.paused) {
      await startAudio();
    } else {
      stopAudio();
    }
  });

  ambientAudio.addEventListener('ended', () => setAudioButtonState(false));

  const tryAutoStart = async () => {
    if (!audioActivated) {
      await startAudio();
    }
  };

  window.addEventListener('pointerdown', tryAutoStart, { once: true });
  window.addEventListener('keydown', tryAutoStart, { once: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopAudio();
    }
  });

  setAudioButtonState(false);
}

toggleCustomStyle();

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  clearErrors();
  statusEl.textContent = '';
  statusEl.className = 'status';

  const formData = Object.fromEntries(new FormData(form).entries());
  formData.musicStyle = styleSelect.value === 'Другое' ? customStyleInput.value.trim() : styleSelect.value;

  const isValid = Object.entries(validators).every(([field]) => {
    const value = field === 'musicStyle' ? styleSelect.value : formData[field];
    return validateField(field, value);
  });

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

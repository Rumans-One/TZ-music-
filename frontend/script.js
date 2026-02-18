const form = document.getElementById('applicationForm');
const statusEl = document.getElementById('status');

const validators = {
  name: (v) => (v.trim().length >= 2 ? '' : 'Введите имя (минимум 2 символа)'),
  phone: (v) => (/^\+?[0-9\s\-()]{10,20}$/.test(v.trim()) ? '' : 'Введите корректный телефон'),
  musicStyle: (v) => (v.trim().length >= 2 ? '' : 'Укажите музыкальный стиль'),
  comment: (v) => (v.trim().length >= 10 ? '' : 'Комментарий должен быть не короче 10 символов')
};

function setError(field, text) {
  const el = document.querySelector(`[data-error="${field}"]`);
  if (el) el.textContent = text;
}

function clearErrors() {
  document.querySelectorAll('.error').forEach((el) => (el.textContent = ''));
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();
  statusEl.textContent = '';
  statusEl.className = 'status';

  const formData = Object.fromEntries(new FormData(form).entries());
  let isValid = true;

  Object.entries(validators).forEach(([field, validate]) => {
    const err = validate(formData[field] || '');
    if (err) {
      isValid = false;
      setError(field, err);
    }
  });

  if (!isValid) return;

  try {
    const response = await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
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
  } catch (error) {
    statusEl.textContent = error.message;
    statusEl.classList.add('fail');
  }
});

// Formulario público de reservas: horas disponibles + envío con mensajes claros.
const form = document.querySelector<HTMLFormElement>('[data-booking-form]');
if (form) {
  const date = form.querySelector<HTMLInputElement>('[data-bk-date]')!;
  const party = form.querySelector<HTMLSelectElement>('[data-bk-party]')!;
  const time = form.querySelector<HTMLSelectElement>('[data-bk-time]')!;
  const hint = form.querySelector<HTMLElement>('[data-bk-hint]')!;
  const errorBox = form.querySelector<HTMLElement>('[data-bk-error]')!;
  const submit = form.querySelector<HTMLButtonElement>('[data-bk-submit]')!;
  const ok = document.querySelector<HTMLElement>('[data-bk-ok]')!;
  let seq = 0;

  const showError = (msg: string, field?: string) => {
    errorBox.textContent = msg;
    errorBox.hidden = !msg;
    form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
    if (field) {
      const el = form.querySelector<HTMLElement>(`[name="${field}"]`);
      el?.setAttribute('aria-invalid', 'true');
    }
  };

  async function loadSlots() {
    const d = date.value;
    const mine = ++seq;
    time.innerHTML = '';
    if (!d) { time.disabled = true; time.append(new Option('Elige primero una fecha', '')); hint.textContent = ''; return; }
    time.disabled = true;
    time.append(new Option('Cargando horas…', ''));
    try {
      const r = await fetch(`/api/disponibilidad?fecha=${encodeURIComponent(d)}&personas=${encodeURIComponent(party.value)}`, { headers: { accept: 'application/json' } });
      const data = await r.json();
      if (mine !== seq) return;
      time.innerHTML = '';
      if (!data.ok || !data.services?.length) {
        time.append(new Option('Sin horas disponibles', ''));
        hint.textContent = data.message ?? 'No hay horas disponibles ese día.';
        return;
      }
      let any = false;
      time.append(new Option('Elige una hora', ''));
      for (const s of data.services) {
        const g = document.createElement('optgroup');
        g.label = s.available ? s.label : `${s.label} · ${s.message}`;
        for (const slot of s.slots) {
          const o = new Option(slot.time, slot.time);
          o.disabled = !slot.available;
          if (slot.available) any = true;
          g.append(o);
        }
        time.append(g);
      }
      time.disabled = false;
      hint.textContent = any ? (data.message ?? '') : (data.message ?? 'No quedan plazas ese día para ese número de personas.');
    } catch {
      if (mine !== seq) return;
      time.innerHTML = '';
      time.append(new Option('No se pudieron cargar las horas', ''));
      hint.textContent = 'Revisa tu conexión e inténtalo de nuevo.';
    }
  }

  date.addEventListener('change', loadSlots);
  party.addEventListener('change', () => { if (date.value) loadSlots(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showError('');
    const fd = new FormData(form);
    const body: Record<string, string> = {};
    fd.forEach((v, k) => { body[k] = String(v); });
    if (!body.consent) { showError('Para reservar debes aceptar la política de privacidad.', 'consent'); return; }
    if (!body.date) { showError('Elige una fecha.', 'date'); return; }
    if (!body.time) { showError('Elige una hora de la lista.', 'time'); return; }
    submit.disabled = true;
    submit.textContent = 'Reservando…';
    try {
      const r = await fetch('/api/reservas', { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(body) });
      const data = await r.json().catch(() => ({}));
      if (r.ok && data.ok) {
        form.hidden = true;
        ok.hidden = false;
        ok.querySelector('[data-bk-ok-text]')!.textContent = data.summary ?? '';
        ok.querySelector('[data-bk-ref]')!.textContent = data.reference ?? '';
        ok.focus();
      } else {
        showError(data.message ?? 'No hemos podido registrar la reserva. Inténtalo de nuevo en unos minutos.', data.field);
        if (data.error === 'full' || data.error === 'blocked') loadSlots();
      }
    } catch {
      showError('No hay conexión. Inténtalo de nuevo en unos minutos.');
    } finally {
      submit.disabled = false;
      submit.textContent = 'Reservar';
    }
  });
}

// Subida directa a Supabase Storage con URL firmada (evita el límite de tamaño de las funciones de Vercel).
const RULES: Record<string, number> = {
  'image/jpeg': 10, 'image/png': 10, 'image/webp': 10, 'image/avif': 10, 'video/mp4': 50, 'video/webm': 50,
};

document.querySelectorAll<HTMLElement>('[data-uploader]').forEach((box) => {
  const input = box.querySelector<HTMLInputElement>('[data-file]')!;
  const btn = box.querySelector<HTMLButtonElement>('[data-upload]')!;
  const status = box.querySelector<HTMLElement>('[data-status]')!;
  const purpose = box.dataset.purpose!;
  const text = (key: string, fallback: string) => box.dataset[key] || fallback;
  const say = (msg: string, state: 'error' | 'ok' | 'busy') => { status.textContent = msg; status.dataset.state = state; };

  btn.addEventListener('click', async () => {
    const file = input.files?.[0];
    if (!file) return say(text('msgChoose', 'Elige un archivo primero.'), 'error');
    const allowVideo = purpose === 'gallery';
    const maxMb = RULES[file.type];
    if (!maxMb || (!allowVideo && file.type.startsWith('video/'))) {
      return say(allowVideo ? text('msgFormat', 'Formato no admitido. Sube fotos JPG, PNG, WebP o AVIF, o vídeos MP4 o WebM.') : text('msgFormat', 'Formato no admitido. Sube una foto JPG, PNG, WebP o AVIF.'), 'error');
    }
    if (file.size > maxMb * 1024 * 1024) return say(file.type.startsWith('video/') ? text('msgVideo', 'El vídeo pesa demasiado (máximo 50 MB).') : text('msgPhoto', 'La foto pesa demasiado (máximo 10 MB).'), 'error');
    btn.disabled = true;
    say(text('msgBusy', 'Subiendo…'), 'busy');
    try {
      const r1 = await fetch('/api/admin/upload-url', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ purpose, type: file.type, size: file.size, name: file.name }) });
      const d1 = await r1.json();
      if (!d1.ok) return say(d1.message, 'error');
      const r2 = await fetch(d1.signedUrl, { method: 'PUT', headers: { 'content-type': file.type, 'x-upsert': 'false' }, body: file });
      if (!r2.ok) return say(text('msgReject', 'El servidor de archivos rechazó la subida (tipo o tamaño no permitidos).'), 'error');
      const extra: Record<string, string> = {};
      box.querySelectorAll<HTMLInputElement>('[data-extra]').forEach((el) => { extra[el.name] = el.value; });
      const r3 = await fetch('/api/admin/media-complete', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ purpose, path: d1.path, menu_id: box.dataset.menuId, ...extra }) });
      const d3 = await r3.json();
      if (!d3.ok) return say(d3.message, 'error');
      say(text('msgOk', '¡Subido! Actualizando…'), 'ok');
      location.reload();
    } catch {
      say(text('msgOffline', 'Error de conexión durante la subida. Inténtalo de nuevo.'), 'error');
    } finally {
      btn.disabled = false;
    }
  });
});

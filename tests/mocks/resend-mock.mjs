// Servidor que imita la API de Resend (POST /emails) y guarda los emails para que las pruebas los inspeccionen.
// GET /__emails → lista; DELETE /__emails → vaciar. Nunca envía nada real.
import http from 'node:http';

export function startResendMock(port = Number(process.env.RESEND_MOCK_PORT ?? 4599)) {
  const emails = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const send = (code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
      if (req.method === 'POST' && req.url === '/emails') {
        if (!String(req.headers.authorization ?? '').startsWith('Bearer re_test_')) return send(401, { name: 'validation_error', message: 'mock: unexpected key', statusCode: 401 });
        const e = JSON.parse(body || '{}');
        const id = `mock_${emails.length + 1}_${Date.now()}`;
        emails.push({ id, ...e, at: new Date().toISOString() });
        return send(200, { id });
      }
      if (req.url === '/__emails' && req.method === 'GET') return send(200, emails);
      if (req.url === '/__emails' && req.method === 'DELETE') { emails.length = 0; return send(200, { ok: true }); }
      if (req.url === '/health') return send(200, { ok: true });
      send(404, { message: 'not found' });
    });
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve({ server, emails, port })));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { port } = await startResendMock();
  console.log(`Resend mock escuchando en http://127.0.0.1:${port}`);
}

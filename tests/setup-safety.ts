// Seguridad: las pruebas NUNCA usan la clave real de Resend ni la URL real de la API.
process.env.RESEND_API_KEY = 're_test_safety';
process.env.RESEND_BASE_URL = 'http://127.0.0.1:9'; // puerto cerrado: cualquier envío no simulado falla

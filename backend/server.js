// backend/server.js (ESM)
import 'dotenv/config';
import app from './src/app.js';

const PORT = process.env.PORT || 3001;

// Em testes, o Jest importa o app (NODE_ENV=test) e não precisa abrir porta
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
}

export default app;

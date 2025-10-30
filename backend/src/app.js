// backend/src/app.js (ESM)
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes/index.js';

// __dirname em ESM:
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// static uploads (precisa existir a pasta backend/uploads)
app.use('/uploads', express.static(path.resolve(__dirname, '..', 'uploads')));

// Prefixo único da API
app.use('/api', routes);

export default app;

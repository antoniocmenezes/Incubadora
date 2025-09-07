import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import router from './src/routes/index.js';
import path from 'path';

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api', router);

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`API rodando na porta ${port}`));

app.use('/uploads', express.static(path.resolve('uploads')));

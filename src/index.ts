import 'reflect-metadata'; // Importante para o FireORM
import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import './config/firebase.js'; // Inicializa Firebase e FireORM

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Importação das rotas
import apiRoutes from './routes/api.js';
app.use('/api', apiRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export default app;

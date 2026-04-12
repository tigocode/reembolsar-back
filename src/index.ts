import 'reflect-metadata'; // Importante para o FireORM
import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import './config/firebase.js'; // Inicializa Firebase e FireORM

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  next();
});

// Importação das rotas
import apiRoutes from './routes/api.js';
app.use('/api', apiRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Helper function to prevent Render from sleeping
function startKeepAlive(url: string) {
  console.log(`[Keep-Alive] Configurado para pingar ${url}/health a cada 14 min.`);
  setInterval(async () => {
    try {
      const response = await fetch(`${url}/health`);
      if (response.ok) {
        console.log(`[Keep-Alive] Ping executado com sucesso às ${new Date().toISOString()}`);
      } else {
        console.warn(`[Keep-Alive] Ping falhou: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`[Keep-Alive] Erro ao pingar:`, error instanceof Error ? error.message : error);
    }
  }, 14 * 60 * 1000); // 14 minutos
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  
  // Verifica se está rodando no Render em prod para manter acordado
  if (process.env.NODE_ENV === 'production' && process.env.RENDER_EXTERNAL_URL) {
    startKeepAlive(process.env.RENDER_EXTERNAL_URL);
  }
});

export default app;

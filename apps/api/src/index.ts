import express from 'express';
import { sessionsRouter } from './routes/sessions.js';
import { webhooksRouter } from './routes/webhooks.js';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.json());

app.use('/sessions', sessionsRouter);
app.use('/webhooks', webhooksRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});

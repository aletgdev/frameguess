import cors from 'cors';
import express from 'express';

export const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? false }));
app.use(express.json());

app.get('/health', (_request, response) => {
  response.json({ data: { status: 'ok' } });
});

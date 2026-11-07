import compression from 'compression';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import applications from './routes/applications';
import auth from './routes/auth';
import cases from './routes/cases';
import ideas from './routes/ideas';
import members from './routes/members';
import stats from './routes/stats';
import { HttpError } from './util';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1); // Render vb. ters vekil arkasında doğru IP için

  const origins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.use(helmet());
  app.use(compression());
  app.use(cors({ origin: origins, credentials: false }));
  app.use(express.json({ limit: '1mb' }));
  if (process.env.NODE_ENV !== 'test') app.use(morgan('tiny'));

  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.use('/api/auth', auth);
  app.use('/api/alliance-applications', applications);
  app.use('/api/members', members);
  app.use('/api/ideas', ideas);
  app.use('/api/cases', cases);
  app.use('/api/stats', stats);

  app.use('/api', (_req, res) => res.status(404).json({ success: false, error: 'Bulunamadı' }));

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ success: false, error: err.message });
    }
    if (err?.type === 'entity.parse.failed') {
      return res.status(400).json({ success: false, error: 'Geçersiz JSON' });
    }
    if (err?.code === '22P02') {
      return res.status(404).json({ success: false, error: 'Kayıt bulunamadı' }); // geçersiz uuid
    }
    if (err?.code === '23505') {
      return res.status(409).json({ success: false, error: 'Bu kayıt zaten var' });
    }
    console.error(err);
    res.status(500).json({ success: false, error: 'Sunucu hatası' });
  });

  return app;
}

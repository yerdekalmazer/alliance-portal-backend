import express, { Application, Request, Response, NextFunction } from 'express';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth';
import casesRoutes from './routes/cases';
import surveyRoutes from './routes/surveys';
import analyticsRoutes from './routes/analytics';
import ideaRoutes from './routes/ideas';
import questionBankRoutes from './routes/questionBank';
import applicationsRoutes from './routes/applications';
import uploadRoutes from './routes/upload';
import allianceApplicationsRoutes from './routes/allianceApplications';
import alliancePartnersRoutes from './routes/alliancePartners';
import caseProposalsRoutes from './routes/caseProposals';
import adaptiveTechnicalAssessmentRoutes from './routes/adaptiveTechnicalAssessment';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { authMiddleware } from './middleware/auth';
import { 
  securityHeaders, 
  sanitizeInput, 
  apiRateLimit, 
  authRateLimit, 
  uploadRateLimit,
  speedLimiter,
  validateContentType,
  requestSizeLimit
} from './middleware/security';

// Import Swagger
import { specs, swaggerUi } from './config/swagger';

// Load environment variables
dotenv.config();

const app: Application = express();

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// ---------------------------------------------
// CORS - MUST be before other middlewares/routes
// ---------------------------------------------
function normalizeOrigin(origin: string): string {
  const trimmed = origin.trim();
  // remove trailing slash and lowercase
  return trimmed.endsWith('/') ? trimmed.slice(0, -1).toLowerCase() : trimmed.toLowerCase();
}

const defaultDevOrigins = [
  'http://localhost:3000',
  'http://localhost:5173', // Vite default
  'http://localhost:5174', // Vite alternative
  'http://localhost:8080',
  'http://127.0.0.1:5173', // Alternative localhost
  'http://127.0.0.1:5174',
];

const allowedOriginsEnv = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(normalizeOrigin)
  : defaultDevOrigins.map(normalizeOrigin);

const allowedOriginsSet = new Set<string>(allowedOriginsEnv);

const isDevelopment = process.env.NODE_ENV === 'development';

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (isDevelopment && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      return callback(null, true);
    }
    const normalized = normalizeOrigin(origin);
    if (allowedOriginsSet.has(normalized)) {
      return callback(null, true);
    }
    console.warn(`CORS blocked origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Authorization'],
  optionsSuccessStatus: 204,
  preflightContinue: false,
};

app.use(cors(corsOptions));
// Explicitly handle preflight without using wildcard path-to-regexp token
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'OPTIONS') {
    const origin = (req.headers.origin as string) || '';
    // Mirror origin when allowed by corsOptions logic above (simple pass-through here for localhost dev)
    if (origin) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Vary', 'Origin');
    }
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    return res.sendStatus(204);
  }
  next();
});

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Security and performance middleware
app.use(securityHeaders);
app.use(sanitizeInput);
app.use(speedLimiter);

// Rate limiting - general API
app.use(apiRateLimit);

// (CORS moved above and initialized with explicit options)

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 service:
 *                   type: string
 *                   example: Alliance Portal Backend
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                 environment:
 *                   type: string
 *                   example: development
 */
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Alliance Portal Backend',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Swagger UI - support both /api/docs and /api-docs
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Alliance Portal API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true
  }
}));

// Alias for common URL pattern
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Alliance Portal API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true
  }
}));

// API routes with specific rate limiting
app.use('/api/auth', authRateLimit, validateContentType(['application/json']), authRoutes);
app.use('/api/upload', uploadRateLimit, uploadRoutes); // Auth middleware handled in routes
app.use('/api/cases', authMiddleware, casesRoutes);
app.use('/api/surveys', surveyRoutes); // Some survey endpoints might be public
app.use('/api/analytics', authMiddleware, analyticsRoutes);
app.use('/api/ideas', ideaRoutes); // Some idea endpoints might be public
app.use('/api/question-bank', questionBankRoutes);

/**
 * @swagger
 * /:
 *   get:
 *     summary: API root endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API information and available endpoints
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Alliance Portal Backend API
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                 documentation:
 *                   type: string
 *                   example: /api/docs
 *                 health:
 *                   type: string
 *                   example: /health
 */
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Alliance Portal Backend API',
    version: '1.0.0',
    documentation: '/api/docs',
    health: '/health'
  });
});

// Register API routes
app.use('/api/auth', authRoutes);
app.use('/api/cases', casesRoutes);
app.use('/api/surveys', surveyRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ideas', ideaRoutes);
app.use('/api/question-bank', questionBankRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/alliance-applications', allianceApplicationsRoutes);
app.use('/api/alliance-partners', alliancePartnersRoutes);
app.use('/api/case-proposals', caseProposalsRoutes);
app.use('/api/adaptive-technical-assessment', adaptiveTechnicalAssessmentRoutes);

// 404 handler
app.use(notFound);

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;

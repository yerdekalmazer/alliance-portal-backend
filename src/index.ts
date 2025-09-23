// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { checkDatabaseConnection } from './config/database';
import { websocketController } from './controllers/websocketController';
import { createServer } from 'http';

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

async function startServer() {
  try {
    // Check database connection
    console.log('🔗 Checking database connection...');
    const dbConnected = await checkDatabaseConnection();
    
    if (!dbConnected) {
      console.error('❌ Database connection failed');
      process.exit(1);
    }
    
    console.log('✅ Database connection successful');

    // Create HTTP server and initialize WebSocket
    const httpServer = createServer(app);
    
    // Initialize WebSocket
    websocketController.initialize(httpServer);

    // Start the server
    const server = httpServer.listen(PORT, () => {
      console.log('🚀 Alliance Portal Backend Server Started');
      console.log(`📡 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${NODE_ENV}`);
      console.log(`📋 Health check: http://localhost:${PORT}/health`);
      console.log(`🎯 API base URL: http://localhost:${PORT}/api`);
      console.log(`🔌 WebSocket enabled for real-time updates`);
      
      if (NODE_ENV === 'development') {
        console.log('🔧 Development mode - Hot reload enabled');
      }
    });

    // Graceful shutdown handling
    const gracefulShutdown = (signal: string) => {
      console.log(`\n📡 Received ${signal}. Shutting down gracefully...`);
      
      server.close(() => {
        console.log('✅ HTTP server closed');
        console.log('👋 Server shutdown complete');
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        console.error('❌ Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

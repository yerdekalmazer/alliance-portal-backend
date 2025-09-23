import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { supabaseAdmin } from '../config/database';

class WebSocketController {
  private io: SocketIOServer | null = null;
  private connectedUsers = new Map<string, string>(); // socketId -> userId

  // Initialize WebSocket server
  initialize(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? (process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : false)
          : ["http://localhost:3000", "http://localhost:5173", "http://localhost:3001"],
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.setupEventHandlers();
    console.log('🔌 WebSocket server initialized');
  }

  // Setup event handlers
  private setupEventHandlers() {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      console.log(`👤 User connected: ${socket.id}`);

      // Handle user authentication
      socket.on('authenticate', async (data) => {
        try {
          const { token, userId } = data;
          
          if (token && userId && supabaseAdmin) {
            // Verify token with Supabase
            const { data: user, error } = await supabaseAdmin.auth.getUser(token);
            
            if (!error && user) {
              this.connectedUsers.set(socket.id, userId);
              socket.join(`user:${userId}`);
              
              // Send confirmation
              socket.emit('authenticated', { 
                success: true, 
                message: 'Authentication successful' 
              });

              // Broadcast user online status
              this.broadcastUserStatus(userId, 'online');
              
              console.log(`✅ User authenticated: ${userId}`);
            } else {
              socket.emit('authentication_error', { 
                error: 'Invalid token' 
              });
            }
          } else {
            socket.emit('authentication_error', { 
              error: 'Authentication failed - missing requirements' 
            });
          }
        } catch (error) {
          console.error('Authentication error:', error);
          socket.emit('authentication_error', { 
            error: 'Authentication failed' 
          });
        }
      });

      // Handle dashboard subscription
      socket.on('subscribe:dashboard', () => {
        socket.join('dashboard');
        console.log(`📊 User subscribed to dashboard: ${socket.id}`);
      });

      // Handle case updates subscription
      socket.on('subscribe:cases', () => {
        socket.join('cases');
        console.log(`📁 User subscribed to cases: ${socket.id}`);
      });

      // Handle idea updates subscription
      socket.on('subscribe:ideas', () => {
        socket.join('ideas');
        console.log(`💡 User subscribed to ideas: ${socket.id}`);
      });

      // Handle user disconnection
      socket.on('disconnect', () => {
        const userId = this.connectedUsers.get(socket.id);
        if (userId) {
          this.connectedUsers.delete(socket.id);
          this.broadcastUserStatus(userId, 'offline');
          console.log(`👋 User disconnected: ${userId}`);
        }
      });
    });
  }

  // Broadcast real-time updates
  broadcastDashboardUpdate(data: any) {
    if (this.io) {
      this.io.to('dashboard').emit('dashboard:update', {
        type: 'stats_update',
        data,
        timestamp: new Date().toISOString()
      });
    }
  }

  broadcastCaseUpdate(action: string, caseData: any) {
    if (this.io) {
      this.io.to('cases').emit('case:update', {
        type: action, // 'created', 'updated', 'deleted'
        data: caseData,
        timestamp: new Date().toISOString()
      });
    }
  }

  broadcastIdeaUpdate(action: string, ideaData: any) {
    if (this.io) {
      this.io.to('ideas').emit('idea:update', {
        type: action, // 'created', 'updated', 'status_changed'
        data: ideaData,
        timestamp: new Date().toISOString()
      });
    }
  }

  broadcastUserUpdate(action: string, userData: any) {
    if (this.io) {
      this.io.emit('user:update', {
        type: action, // 'registered', 'role_changed', 'profile_updated'
        data: userData,
        timestamp: new Date().toISOString()
      });
    }
  }

  broadcastNotification(userId: string, notification: any) {
    if (this.io) {
      this.io.to(`user:${userId}`).emit('notification', {
        type: 'notification',
        data: notification,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Broadcast user status
  private broadcastUserStatus(userId: string, status: 'online' | 'offline') {
    if (this.io) {
      this.io.emit('user:status', {
        userId,
        status,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Send system-wide message
  broadcastSystemMessage(message: string, type: 'info' | 'warning' | 'error' = 'info') {
    if (this.io) {
      this.io.emit('system:message', {
        type,
        message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Get connected users count
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  // Get connected users
  getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers.values());
  }

  // Check if user is online
  isUserOnline(userId: string): boolean {
    return Array.from(this.connectedUsers.values()).includes(userId);
  }
}

export const websocketController = new WebSocketController();

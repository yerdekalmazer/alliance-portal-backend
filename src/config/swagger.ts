import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Alliance Portal Backend API',
      version: '1.0.0',
      description: 'Community-driven project development platform API',
      contact: {
        name: 'Alliance Portal Team',
        email: 'info@allianceportal.com'
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://api.allianceportal.com' 
          : `http://localhost:${process.env.PORT || 3001}`,
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Authorization header using the Bearer scheme. Example: "Authorization: Bearer {token}"'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['id', 'email', 'name', 'role'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'User unique identifier'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            name: {
              type: 'string',
              description: 'User full name'
            },
            role: {
              type: 'string',
              enum: ['admin', 'alliance', 'user'],
              description: 'User role in the system'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'User creation timestamp'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'User last update timestamp'
            }
          }
        },
        CaseScenario: {
          type: 'object',
          required: ['id', 'title', 'description', 'status'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Case unique identifier'
            },
            title: {
              type: 'string',
              description: 'Case title'
            },
            description: {
              type: 'string',
              description: 'Case description'
            },
            job_types: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Required job types for the case'
            },
            specializations: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Required specializations'
            },
            requirements: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Case requirements'
            },
            created_by: {
              type: 'string',
              format: 'uuid',
              description: 'User who created the case'
            },
            initial_threshold: {
              type: 'integer',
              minimum: 0,
              maximum: 100,
              description: 'Initial assessment threshold score'
            },
            target_team_count: {
              type: 'integer',
              minimum: 1,
              description: 'Target number of teams'
            },
            ideal_team_size: {
              type: 'integer',
              minimum: 1,
              description: 'Ideal team size'
            },
            status: {
              type: 'string',
              enum: ['active', 'completed', 'archived'],
              description: 'Case status'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Case creation timestamp'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Case last update timestamp'
            }
          }
        },
        ApiResponse: {
          type: 'object',
          required: ['success'],
          properties: {
            success: {
              type: 'boolean',
              description: 'Indicates if the request was successful'
            },
            data: {
              type: 'object',
              description: 'Response data (varies by endpoint)'
            },
            error: {
              type: 'string',
              description: 'Error message (only present when success is false)'
            },
            code: {
              type: 'string',
              description: 'Error code for programmatic handling'
            },
            message: {
              type: 'string',
              description: 'Human-readable message'
            },
            meta: {
              type: 'object',
              properties: {
                total: {
                  type: 'integer',
                  description: 'Total number of items'
                },
                page: {
                  type: 'integer',
                  description: 'Current page number'
                },
                limit: {
                  type: 'integer',
                  description: 'Items per page'
                },
                hasNext: {
                  type: 'boolean',
                  description: 'Whether there are more pages'
                },
                hasPrev: {
                  type: 'boolean',
                  description: 'Whether there are previous pages'
                }
              },
              description: 'Pagination metadata'
            }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            password: {
              type: 'string',
              minLength: 6,
              description: 'User password'
            }
          }
        },
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'name'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            password: {
              type: 'string',
              minLength: 6,
              description: 'User password'
            },
            name: {
              type: 'string',
              minLength: 2,
              description: 'User full name'
            },
            role: {
              type: 'string',
              enum: ['user', 'alliance'],
              default: 'user',
              description: 'User role (admin role requires special permissions)'
            }
          }
        },
        DashboardStats: {
          type: 'object',
          properties: {
            totalParticipants: {
              type: 'integer',
              description: 'Total number of participants'
            },
            activeCases: {
              type: 'integer',
              description: 'Number of active cases'
            },
            categoryDistribution: {
              type: 'object',
              properties: {
                yonlendirilebilirTeknik: {
                  type: 'integer'
                },
                takimLideri: {
                  type: 'integer'
                },
                yeniBaslayan: {
                  type: 'integer'
                },
                operasyonelYetenek: {
                  type: 'integer'
                }
              },
              description: 'Distribution of participants by category'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization'
      },
      {
        name: 'Cases',
        description: 'Project cases management'
      },
      {
        name: 'Surveys',
        description: 'Survey templates and responses'
      },
      {
        name: 'Analytics',
        description: 'Platform analytics and statistics'
      },
      {
        name: 'Ideas',
        description: 'Alliance partner idea submissions'
      },
      {
        name: 'Health',
        description: 'System health and status'
      }
    ]
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/app.ts'
  ]
};

export const specs = swaggerJsdoc(options);
export { swaggerUi };

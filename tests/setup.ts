// Test setup file - runs before all tests
import dotenv from 'dotenv';

// Load environment variables from .env for tests
dotenv.config();

// Set test environment
process.env.NODE_ENV = 'test';

// Global test timeout
jest.setTimeout(10000);

// Mock console methods to reduce noise during tests (optional)
global.console = {
    ...console,
    // Uncomment below to suppress logs during tests
    // log: jest.fn(),
    // debug: jest.fn(),
    // info: jest.fn(),
    // warn: jest.fn(),
    // error: jest.fn(),
};

// Add custom matchers or global test utilities here if needed

// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';

const BASE_URL = 'http://localhost:3001';
const API_URL = `${BASE_URL}/api`;

interface TestResult {
  endpoint: string;
  method: string;
  status: 'PASS' | 'FAIL';
  statusCode?: number;
  message: string;
  data?: any;
}

class SystemTester {
  private authToken: string | null = null;
  private results: TestResult[] = [];

  constructor() {
    console.log('🧪 Alliance Portal System Test Started');
    console.log('='.repeat(50));
  }

  private addResult(result: TestResult) {
    this.results.push(result);
    const emoji = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${emoji} ${result.method} ${result.endpoint} - ${result.message}`);
    if (result.data && typeof result.data === 'object') {
      console.log(`   Data: ${JSON.stringify(result.data).substring(0, 100)}...`);
    }
  }

  // Test 1: Health Check
  async testHealthCheck(): Promise<void> {
    try {
      const response = await axios.get(`${BASE_URL}/health`);
      this.addResult({
        endpoint: '/health',
        method: 'GET',
        status: 'PASS',
        statusCode: response.status,
        message: `Health check successful (${response.data.status})`,
        data: response.data
      });
    } catch (error: any) {
      this.addResult({
        endpoint: '/health',
        method: 'GET',
        status: 'FAIL',
        statusCode: error.response?.status,
        message: `Health check failed: ${error.message}`
      });
    }
  }

  // Test 2: CORS Preflight
  async testCORSPreflight(): Promise<void> {
    try {
      const response = await axios.options(`${API_URL}/ideas`, {
        headers: {
          'Origin': 'http://localhost:5173',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });
      
      const corsHeaders = {
        'access-control-allow-origin': response.headers['access-control-allow-origin'],
        'access-control-allow-methods': response.headers['access-control-allow-methods'],
        'access-control-allow-headers': response.headers['access-control-allow-headers']
      };

      this.addResult({
        endpoint: '/api/ideas',
        method: 'OPTIONS',
        status: 'PASS',
        statusCode: response.status,
        message: 'CORS preflight successful',
        data: corsHeaders
      });
    } catch (error: any) {
      this.addResult({
        endpoint: '/api/ideas',
        method: 'OPTIONS',
        status: 'FAIL',
        statusCode: error.response?.status,
        message: `CORS preflight failed: ${error.message}`
      });
    }
  }

  // Test 3: Authentication - Register (if needed)
  async testRegistration(): Promise<void> {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Test123!',
        role: 'user'
      });

      this.authToken = response.data.data?.token;
      this.addResult({
        endpoint: '/api/auth/register',
        method: 'POST',
        status: 'PASS',
        statusCode: response.status,
        message: 'Registration successful',
        data: { hasToken: !!this.authToken }
      });
    } catch (error: any) {
      // Registration might fail if user already exists, which is okay
      this.addResult({
        endpoint: '/api/auth/register',
        method: 'POST',
        status: 'FAIL',
        statusCode: error.response?.status,
        message: `Registration failed (might already exist): ${error.response?.data?.error || error.message}`
      });
    }
  }

  // Test 4: Authentication - Login
  async testLogin(): Promise<void> {
    try {
      // Try with seed data admin user first
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: 'admin@testportal.com',
        password: 'Admin123!'
      });

      this.authToken = response.data.data?.token;
      this.addResult({
        endpoint: '/api/auth/login',
        method: 'POST',
        status: 'PASS',
        statusCode: response.status,
        message: 'Login successful with admin user',
        data: { 
          hasToken: !!this.authToken,
          user: response.data.data?.user?.email 
        }
      });
    } catch (error: any) {
      // Try with test user
      try {
        const response = await axios.post(`${API_URL}/auth/login`, {
          email: 'test@example.com',
          password: 'Test123!'
        });

        this.authToken = response.data.data?.token;
        this.addResult({
          endpoint: '/api/auth/login',
          method: 'POST',
          status: 'PASS',
          statusCode: response.status,
          message: 'Login successful with test user',
          data: { 
            hasToken: !!this.authToken,
            user: response.data.data?.user?.email 
          }
        });
      } catch (innerError: any) {
        this.addResult({
          endpoint: '/api/auth/login',
          method: 'POST',
          status: 'FAIL',
          statusCode: innerError.response?.status,
          message: `Login failed: ${innerError.response?.data?.error || innerError.message}`
        });
      }
    }
  }

  // Test 5: Get Cases (with auth)
  async testGetCases(): Promise<void> {
    if (!this.authToken) {
      this.addResult({
        endpoint: '/api/cases',
        method: 'GET',
        status: 'FAIL',
        message: 'No auth token available'
      });
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/cases`, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });

      this.addResult({
        endpoint: '/api/cases',
        method: 'GET',
        status: 'PASS',
        statusCode: response.status,
        message: `Retrieved ${response.data.data?.length || 0} cases`,
        data: { count: response.data.data?.length }
      });
    } catch (error: any) {
      this.addResult({
        endpoint: '/api/cases',
        method: 'GET',
        status: 'FAIL',
        statusCode: error.response?.status,
        message: `Get cases failed: ${error.response?.data?.error || error.message}`
      });
    }
  }

  // Test 6: Get Ideas (with auth)
  async testGetIdeas(): Promise<void> {
    if (!this.authToken) {
      this.addResult({
        endpoint: '/api/ideas',
        method: 'GET',
        status: 'FAIL',
        message: 'No auth token available'
      });
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/ideas`, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });

      this.addResult({
        endpoint: '/api/ideas',
        method: 'GET',
        status: 'PASS',
        statusCode: response.status,
        message: `Retrieved ${response.data.data?.length || 0} ideas`,
        data: { count: response.data.data?.length }
      });
    } catch (error: any) {
      this.addResult({
        endpoint: '/api/ideas',
        method: 'GET',
        status: 'FAIL',
        statusCode: error.response?.status,
        message: `Get ideas failed: ${error.response?.data?.error || error.message}`
      });
    }
  }

  // Test 7: Get Survey Templates
  async testGetSurveyTemplates(): Promise<void> {
    if (!this.authToken) {
      this.addResult({
        endpoint: '/api/surveys/templates',
        method: 'GET',
        status: 'FAIL',
        message: 'No auth token available'
      });
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/surveys/templates`, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });

      this.addResult({
        endpoint: '/api/surveys/templates',
        method: 'GET',
        status: 'PASS',
        statusCode: response.status,
        message: `Retrieved ${response.data.data?.length || 0} survey templates`,
        data: { count: response.data.data?.length }
      });
    } catch (error: any) {
      this.addResult({
        endpoint: '/api/surveys/templates',
        method: 'GET',
        status: 'FAIL',
        statusCode: error.response?.status,
        message: `Get survey templates failed: ${error.response?.data?.error || error.message}`
      });
    }
  }

  // Test 8: Get Dashboard Analytics
  async testGetDashboardAnalytics(): Promise<void> {
    if (!this.authToken) {
      this.addResult({
        endpoint: '/api/analytics/dashboard',
        method: 'GET',
        status: 'FAIL',
        message: 'No auth token available'
      });
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/analytics/dashboard`, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });

      this.addResult({
        endpoint: '/api/analytics/dashboard',
        method: 'GET',
        status: 'PASS',
        statusCode: response.status,
        message: 'Dashboard analytics retrieved successfully',
        data: response.data.data
      });
    } catch (error: any) {
      this.addResult({
        endpoint: '/api/analytics/dashboard',
        method: 'GET',
        status: 'FAIL',
        statusCode: error.response?.status,
        message: `Get dashboard analytics failed: ${error.response?.data?.error || error.message}`
      });
    }
  }

  // Run all tests
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting comprehensive system tests...\n');

    await this.testHealthCheck();
    await this.testCORSPreflight();
    await this.testRegistration();
    await this.testLogin();
    await this.testGetCases();
    await this.testGetIdeas();
    await this.testGetSurveyTemplates();
    await this.testGetDashboardAnalytics();

    this.printSummary();
  }

  private printSummary(): void {
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const total = this.results.length;

    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\n🔍 Failed Tests:');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => {
          console.log(`   • ${r.method} ${r.endpoint}: ${r.message}`);
        });
    }

    console.log('\n🎯 Test Results:');
    if (passed >= 6) {
      console.log('🎉 System is working well! Frontend-Backend integration is successful.');
    } else if (passed >= 4) {
      console.log('⚠️  System has some issues but core functionality works.');
    } else {
      console.log('🚨 System has major issues that need to be addressed.');
    }

    console.log('\n🔑 Seed Data Test Credentials:');
    console.log('   Admin: admin@testportal.com / Admin123!');
    console.log('   Alliance: alliance@testportal.com / Alliance123!');
    console.log('   User: user@testportal.com / User123!');
  }
}

// Execute tests if this file is run directly
if (require.main === module) {
  const tester = new SystemTester();
  tester.runAllTests()
    .then(() => {
      console.log('\n✅ Test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

export { SystemTester };


const { exec } = require('child_process');
const path = require('path');

describe('Server Startup Validation', () => {
  it('should fail startup and exit with code 1 if required environment variables are missing', (done) => {
    const serverPath = path.join(__dirname, '../../src/server.js');
    
    // Run the server with empty environment overrides (clearing critical env vars)
    exec(`node "${serverPath}"`, {
      env: {
        NODE_ENV: 'production',
        ROUTER_ENCRYPTION_KEY: '',
        JWT_SECRET: '',
        RADIUS_SHARED_SECRET: '',
        AT_API_KEY: '',
        AT_USERNAME: '',
        DB_HOST: '',
        DB_PORT: '',
        DB_USER: '',
        DB_PASSWORD: '',
        DB_NAME: '',
        REDIS_HOST: '',
        REDIS_PORT: '',
      }
    }, (error, stdout, stderr) => {
      // The process should fail
      expect(error).not.toBeNull();
      expect(error.code).toBe(1);
      
      // The stderr should contain our critical error message
      expect(stderr).toContain('CRITICAL STARTUP ERROR');
      expect(stderr).toContain('ROUTER_ENCRYPTION_KEY');
      expect(stderr).toContain('JWT_SECRET');
      expect(stderr).toContain('RADIUS_SHARED_SECRET');
      
      done();
    });
  }, 30000); // 30s timeout for child process startup
});

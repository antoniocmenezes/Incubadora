// backend/jest.config.js
export default {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/index.js',           // opcional: ignora re-export central
    '!src/middlewares/upload.js'  // se usar multer, geralmente não testamos direto
  ],
  setupFiles: ['dotenv/config']
};

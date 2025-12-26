// Mock storage for consistent testing
const mockStorage = {
  saveRoom: jest.fn(),
  getRoom: jest.fn(),
  saveUser: jest.fn(),
  getUser: jest.fn(),
  saveCategories: jest.fn(),
  getCategories: jest.fn()
};

// Make mock storage available globally
global.mockStorage = mockStorage;

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});
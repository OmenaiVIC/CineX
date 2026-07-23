import '@testing-library/jest-dom';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i) => Object.keys(store)[i] || null,
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock scrollTo
window.scrollTo = () => {};

// Suppress console.error in tests (optional noise reduction)
const origError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('Warning:')) return;
  origError(...args);
};

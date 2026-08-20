// jest-dom adds custom jest matchers for asserting on DOM nodes.
import '@testing-library/jest-dom';

// Ensure react-router-dom v7 resolves correctly under react-scripts Jest
jest.mock('react-router-dom', () => jest.requireActual('react-router-dom/dist/index.js'));

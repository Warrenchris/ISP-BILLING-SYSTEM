import React from 'react';
import { render, screen } from '@testing-library/react';

// Resolve React Router v7 export path for react-scripts Jest environment
jest.mock('react-router-dom', () => jest.requireActual('react-router-dom/dist/index.js'));

import App from './App';

test('renders app shell and displays login page by default', () => {
  render(<App />);
  const headingElement = screen.getByText(/welcome back/i);
  expect(headingElement).toBeInTheDocument();
  expect(screen.getByText(/sign in to your isp billing account/i)).toBeInTheDocument();
});

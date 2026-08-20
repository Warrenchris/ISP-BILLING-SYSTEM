import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app shell and displays login page by default', () => {
  render(<App />);
  const headingElement = screen.getByText(/welcome back/i);
  expect(headingElement).toBeInTheDocument();
  expect(screen.getByText(/sign in to your isp billing account/i)).toBeInTheDocument();
});

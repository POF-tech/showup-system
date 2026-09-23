import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the Show Up authentication screen', () => {
  render(<App />);
  expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
  expect(screen.getByText(/need an account/i)).toBeInTheDocument();
});

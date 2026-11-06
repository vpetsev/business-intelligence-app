import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import SavedData from '../components/Data/SavedData';
import { useSession } from '../context/SessionContext';
vi.mock('../context/SessionContext', () => ({ useSession: vi.fn() }));
it('keeps account-only actions hidden for anonymous and read-only users', async () => {
  useSession.mockReturnValue({ user: null, loading: false }); const view = render(<SavedData />);
  expect(screen.getByRole('link', { name: 'Log in' })).toBeVisible(); expect(screen.queryByLabelText('Upload CSV')).toBeNull();
  view.unmount(); useSession.mockReturnValue({ user: { id: 1, username: 'guest', readOnly: true }, request: vi.fn().mockResolvedValue({ rows: [], total: 0 }) });
  render(<SavedData />); expect(await screen.findByText(/No saved data/)).toBeVisible(); expect(screen.queryByLabelText('Upload CSV')).toBeNull();
});
it('validates CSV before sending and updates the table after successful import and delete', async () => {
  let rows = [];
  const request = vi.fn(async (path, options) => {
    if (options?.method === 'POST') { rows = [{ id: 4, company: options.body[0].company, revenue: '100', expenses: '25' }]; return { count: 1 }; }
    if (options?.method === 'DELETE') { rows = []; return null; }
    return { rows, total: rows.length };
  });
  useSession.mockReturnValue({ user: { id: 1, username: 'alice' }, request });
  render(<SavedData />); const user = userEvent.setup(); await screen.findByText(/No saved data/);
  const file = new File(['company,Revenue,Expenses\nExample,100,25\n'], 'rows.csv', { type: 'text/csv' });
  file.text = async () => 'company,Revenue,Expenses\nExample,100,25\n';
  await user.upload(screen.getByLabelText('Upload CSV'), file);
  expect(screen.getByLabelText('Upload CSV').files).toHaveLength(1);
  // jsdom cannot validate the native file picker; the browser E2E test covers its submit action.
  fireEvent.submit(screen.getByRole('button', { name: 'Import data' }).closest('form'));
  expect(await screen.findByRole('cell', { name: 'Example' })).toBeVisible();
  expect(request).toHaveBeenCalledWith('/api/data', { method: 'POST', body: [{ company: 'Example', Revenue: '100', Expenses: '25' }] });
  expect(screen.getByRole('link', { name: 'Download CSV', exact: true })).toHaveAttribute('href', '/api/backend/api/data/export');
  await user.click(screen.getByRole('button', { name: 'Delete Example' }));
  await waitFor(() => expect(screen.queryByRole('cell', { name: 'Example' })).toBeNull());
  expect(request).toHaveBeenCalledWith('/api/data/4', { method: 'DELETE' });
});

it('reports invalid CSV without sending an import request', async () => {
  const request = vi.fn().mockResolvedValue({ rows: [], total: 0 });
  useSession.mockReturnValue({ user: { id: 1, username: 'alice' }, request });
  render(<SavedData />); const user = userEvent.setup(); await screen.findByText(/No saved data/);
  const file = new File(['company,Revenue,Expenses\nExample,not-a-number,25\n'], 'rows.csv', { type: 'text/csv' });
  file.text = async () => 'company,Revenue,Expenses\nExample,not-a-number,25\n';
  await user.upload(screen.getByLabelText('Upload CSV'), file);
  fireEvent.submit(screen.getByRole('button', { name: 'Import data' }).closest('form'));
  expect(await screen.findByRole('alert')).toHaveTextContent('finite number');
  expect(request.mock.calls.every(([, options]) => !options?.method)).toBe(true);
});

it('renders exact server decimals in the table while preserving all four places', async () => {
  const request = vi.fn().mockResolvedValue({ rows: [{ id: 8, company: 'Exact', revenue: '900000000000.0003', expenses: '0.0001', cost_expenses: '0.0001', gross_profit: '900000000000.0002' }], total: 1 });
  useSession.mockReturnValue({ user: { id: 1, username: 'alice' }, request });
  render(<SavedData />);
  expect(await screen.findByRole('cell', { name: '900,000,000,000.0003', exact: true })).toBeVisible();
  expect(screen.getByRole('cell', { name: '900,000,000,000.0002', exact: true })).toBeVisible();
  expect(screen.getAllByRole('cell', { name: '0.0001', exact: true })).toHaveLength(2);
});

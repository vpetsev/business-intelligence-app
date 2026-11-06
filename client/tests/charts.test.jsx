import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { useRouter } from 'next/router';
import CompanyCharts from '../components/Charts/CompanyCharts';
vi.mock('../components/Layouts/PageLayout', () => ({ default: ({ title, children }) => <main><h1>{title}</h1>{children}</main> }));
it('renders a truthful year table and routes the year selector without including next-year data', async () => {
  const push = vi.fn(); useRouter.mockReturnValue({ isReady: true, query: { company: 'apple', year: '2019' }, push });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [
    { id: 1, date: '2020-03-31', revenue: 9999 }, { id: 2, date: '2019-12-31', revenue: '123', source: 'demo' },
  ] }));
  render(<CompanyCharts />);
  expect(await screen.findByRole('table')).toHaveTextContent('2019-12-31');
  expect(screen.getByRole('table')).not.toHaveTextContent('2020-03-31');
  expect(screen.getByText(/synthetic figures/)).toBeVisible();
  await userEvent.selectOptions(screen.getByLabelText('Year'), '2020');
  expect(push).toHaveBeenCalledWith('/charts/apple/2020');
});
it('presents empty data and API errors without attempting to render a chart', async () => {
  useRouter.mockReturnValue({ isReady: true, query: { company: 'tesla' }, push: vi.fn() });
  const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] }); vi.stubGlobal('fetch', fetch);
  const view = render(<CompanyCharts />);
  expect(await screen.findByText(/No financial statements/)).toBeVisible(); expect(screen.queryByRole('table')).toBeNull();
  view.unmount(); fetch.mockResolvedValue({ ok: false, status: 503, json: async () => ({ message: 'Temporarily unavailable.' }) });
  render(<CompanyCharts />); expect(await screen.findByRole('alert')).toHaveTextContent('Temporarily unavailable');
});

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/router';
import PageLayout from '../Layouts/PageLayout';
import useResource from '../../hooks/useResource';
import { COMPANY_NAMES, financialRows, availableYears, chartData, formatAmount } from '../../utils/financials';
const FinancialCharts = dynamic(() => import('./FinancialCharts'), { ssr: false, loading: () => <p role="status">Preparing charts…</p> });
export default function CompanyCharts() {
  const router = useRouter();
  const { company, year } = router.query;
  const valid = typeof company === 'string' && Object.hasOwn(COMPANY_NAMES, company) && (year === undefined || (typeof year === 'string' && /^\d{4}$/.test(year)));
  const { data, loading, error, retry } = useResource(valid ? `/${encodeURIComponent(company)}` : null);
  const rows = financialRows(data, year);
  const years = availableYears(data);
  const name = COMPANY_NAMES[company] || 'Company';
  return <PageLayout title={`${name} financial statements`}>
    <p><Link href="/explore">Back to Explore</Link></p>
    {!router.isReady ? <p role="status">Loading company…</p> : !valid ? <p role="alert">This company or year is not available. Choose a company from Explore.</p> : <>
      {loading && <p role="status">Loading financial statements…</p>}
      {error && <div role="alert" className="app-error"><p>{error}</p><button type="button" onClick={retry}>Try again</button></div>}
      {!loading && !error && !Array.isArray(data) && <p role="alert" className="app-error">The server returned an invalid set of financial statements.</p>}
      {!loading && !error && Array.isArray(data) && <>
        <div className="year-filter"><label htmlFor="chart-year">Year</label><select id="chart-year" value={year || ''} onChange={event => router.push(`/charts/${company}${event.target.value ? `/${event.target.value}` : ''}`)}>
          <option value="">All years</option>{years.map(value => <option key={value} value={value}>{value}</option>)}
          {year && !years.includes(year) && <option value={year}>{year} (no data)</option>}
        </select></div>
        <h2>{name} — {year || 'All years'}</h2>
        {rows.some(row => row.source === 'demo') && <p className="app-notice">Demo data: these synthetic figures illustrate the charts and are not published financial results.</p>}
        {!rows.length ? <p role="status">No financial statements are available for this selection.</p> : <>
          <FinancialCharts data={chartData(rows)} title={`${name} ${year || 'all years'}`} />
          <div className="app-table-wrapper"><table className="app-table"><caption>{name} financial statements in USD — {year || 'all years'}</caption>
            <thead><tr><th scope="col">Date</th><th scope="col">Revenue</th><th scope="col">Cost of revenue</th><th scope="col">Cost and expenses</th><th scope="col">Gross profit</th></tr></thead>
            <tbody>{rows.map((row, index) => <tr key={row.id || `${row.date}-${index}`}><th scope="row">{row.date}</th><td>{formatAmount(row.revenue)}</td><td>{formatAmount(row.costOfRevenue)}</td><td>{formatAmount(row.costAndExpenses)}</td><td>{formatAmount(row.grossProfit)}</td></tr>)}</tbody>
          </table></div>
        </>}
      </>}
    </>}
  </PageLayout>;
}

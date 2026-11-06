import Link from 'next/link';
import useResource from '../../hooks/useResource';
import { COMPANY_NAMES } from '../../utils/financials';
export default function ExploreContent() {
  const { data, loading, error, retry } = useResource('/charts');
  const companies = Array.isArray(data) ? data.filter(item => item && Object.hasOwn(COMPANY_NAMES, item.company)) : [];
  return <section aria-label="Available company charts">
    <p>Compare revenue, cost of revenue, and gross profit across reporting periods. Demo figures are labeled on each chart.</p>
    {loading && <p role="status">Loading companies…</p>}
    {error && <div className="app-error" role="alert"><p>{error}</p><button type="button" onClick={retry}>Try again</button></div>}
    {!loading && !error && !companies.length && <p role="status">No company data is available yet.</p>}
    <div className="company-grid">{companies.map(company => <article className="company-card" key={company.company}>
      <h2>{company.name || COMPANY_NAMES[company.company]}</h2><p>{company.symbol}</p>
      <p>{Array.isArray(company.years) && company.years.length ? `Available years: ${company.years.join(', ')}` : 'No reporting periods available yet.'}</p>
      <Link href={`/charts/${company.company}`}>View {COMPANY_NAMES[company.company]} charts</Link>
    </article>)}</div>
    <p>Have your own figures? <Link href="/my-data">Upload and visualize your data</Link>.</p>
  </section>;
}

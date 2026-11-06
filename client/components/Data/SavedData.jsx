import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSession } from '../../context/SessionContext';
import { apiUrl } from '../../utils/Api';
import { CSV_EXAMPLE, parseFinancialCsv } from '../../utils/csv';
import { chartData, formatAmount } from '../../utils/financials';
const FinancialCharts = dynamic(() => import('../Charts/FinancialCharts'), { ssr: false });
const PAGE_SIZE = 25;
export default function SavedData() {
  const { user, loading, error, refresh } = useSession();
  if (!user && loading) return <p role="status">Checking your session…</p>;
  if (error) return <div role="alert" className="app-error"><p>{error}</p><button type="button" onClick={refresh}>Try again</button></div>;
  if (!user) return <p><Link href="/login">Log in</Link> or <Link href="/register">create an account</Link> to upload and manage your data.</p>;
  return <AccountData key={user.id} user={user} />;
}
function AccountData({ user }) {
  const { request } = useSession();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const fileInput = useRef(null);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setRows([]);
    request(`/api/data?limit=${PAGE_SIZE}&offset=${offset}`).then(result => {
      if (!Array.isArray(result.rows) || !Number.isInteger(result.total)) throw new Error('The server returned invalid saved data.');
      if (active) { setRows(result.rows); setTotal(result.total); }
    }).catch(failure => { if (active) setError(failure.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [offset, version, request]);
  async function upload(event) {
    event.preventDefault(); setError(''); setNotice('');
    const file = fileInput.current.files[0];
    if (!file) { setError('Choose a CSV file to import.'); return; }
    if (file.size > 1024 * 1024) { setError('Choose a CSV file smaller than 1 MB.'); return; }
    setBusy(true);
    try {
      const values = parseFinancialCsv(await file.text());
      await request('/api/data', { method: 'POST', body: values });
      setNotice(`Imported ${values.length} ${values.length === 1 ? 'row' : 'rows'}.`);
      fileInput.current.value = ''; setOffset(0); setVersion(value => value + 1);
    } catch (failure) { setError(failure.message || 'Import failed. Please try again.'); }
    finally { setBusy(false); }
  }
  async function remove(row) {
    setBusy(true); setError(''); setNotice('');
    try {
      await request(`/api/data/${encodeURIComponent(row.id)}`, { method: 'DELETE' });
      setNotice(`Deleted ${row.company}.`);
      if (rows.length === 1 && offset > 0) setOffset(Math.max(0, offset - PAGE_SIZE));
      else setVersion(value => value + 1);
    } catch (failure) { setError(failure.message || 'Unable to delete this row.'); }
    finally { setBusy(false); }
  }
  return <>
    <p>Signed in as <strong>{user.username}</strong>. Your saved rows are private to your account.</p>
    {user.readOnly ? <p className="app-notice">This guest account is read-only. Create your own account to import data.</p> : <section aria-labelledby="import-title">
      <h2 id="import-title">Import financial data</h2>
      <p id="csv-help">CSV files up to 1 MB and 1,000 rows. Required columns: company, Revenue, Expenses. Optional: costAndExpenses, grossProfit. Amounts are in USD, up to ±999,999,999,999 with four decimal places. Use numbers without currency symbols or thousands separators.</p>
      <p><a href={`data:text/csv;charset=utf-8,${encodeURIComponent(CSV_EXAMPLE)}`} download="financial-data-example.csv">Download example CSV</a></p>
      <form onSubmit={upload} className="upload-form" aria-busy={busy}>
        <label htmlFor="csv-upload">Upload CSV</label><input id="csv-upload" type="file" accept=".csv,text/csv" ref={fileInput} aria-describedby="csv-help" disabled={busy} required />
        <div><button type="submit" className="app-button" disabled={busy}>{busy ? 'Working…' : 'Import data'}</button></div>
      </form>
    </section>}
    {notice && <p role="status" className="app-notice">{notice}</p>}
    {error && <div role="alert" className="app-error"><p>{error}</p><button type="button" disabled={busy} onClick={() => setVersion(value => value + 1)}>Reload saved data</button></div>}
    <h2>Saved data</h2>
    {loading ? <p role="status">Loading saved data…</p> : <>
      {!error && !rows.length && <p>No saved data yet. Import a CSV to get started.</p>}
      {total > 0 && <p><a href={apiUrl('/api/data/export')} download>Download CSV</a></p>}
      {rows.length > 0 && <>
        <p>Charts show the {rows.length} rows on this page.</p>
        <FinancialCharts data={chartData(rows, 'company', true)} title="Saved financial data" />
        <div className="app-table-wrapper"><table className="app-table"><caption>Saved financial data in USD</caption>
          <thead><tr><th scope="col">Company</th><th scope="col">Revenue</th><th scope="col">Expenses</th><th scope="col">Cost and expenses</th><th scope="col">Gross profit</th>{!user.readOnly && <th scope="col">Actions</th>}</tr></thead>
          <tbody>{rows.map(row => <tr key={row.id}><td>{row.company}</td><td>{formatAmount(row.revenue)}</td><td>{formatAmount(row.expenses)}</td><td>{formatAmount(row.cost_expenses)}</td><td>{formatAmount(row.gross_profit)}</td>{!user.readOnly && <td><button type="button" disabled={busy} aria-label={`Delete ${row.company}`} onClick={() => remove(row)}>Delete</button></td>}</tr>)}</tbody>
        </table></div>
      </>}
      {total > PAGE_SIZE && <nav className="pagination" aria-label="Saved data pages"><button disabled={busy || offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>Previous</button><span>Rows {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}</span><button disabled={busy || offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)}>Next</button></nav>}
    </>}
  </>;
}

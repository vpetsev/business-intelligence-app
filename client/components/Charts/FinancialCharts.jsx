import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);
const options = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom' } },
  scales: { y: { title: { display: true, text: 'Amount (USD)' } }, x: { ticks: { maxRotation: 45 } } },
};
export default function FinancialCharts({ data, title }) {
  if (!data.labels.length) return null;
  return <div className="chart-grid">
    <div className="chart-panel"><Line data={data} options={options} role="img" aria-label={`${title}: line chart. Exact values follow in the data table.`} /></div>
    <div className="chart-panel"><Bar data={data} options={options} role="img" aria-label={`${title}: bar chart. Exact values follow in the data table.`} /></div>
  </div>;
}

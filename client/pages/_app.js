import '../public/css/bootstrap.min.css';
import '../public/css/animate.min.css';
import '../public/css/flaticon.css';
import '../public/css/fontawesome.min.css';
import '../public/css/style.css';
import '../public/css/responsive.css';
import '../styles/application.css';
import Head from 'next/head';
import { SessionProvider } from '../context/SessionContext';
export default function App({ Component, pageProps }) {
  return <SessionProvider><Head>
    <title>BI App - Business Intelligence App</title>
    <meta name="description" content="Explore company financial statements and visualize your own business data." />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </Head><a className="skip-link" href="#main-content">Skip to content</a><Component {...pageProps} /></SessionProvider>;
}

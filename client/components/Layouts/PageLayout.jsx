import Head from 'next/head';
import Navbar from './Navbar';
import Footer from './Footer';
export default function PageLayout({ title, children }) {
  return <><Head><title>{title} | BI App</title></Head><Navbar /><main id="main-content" className="container app-main" tabIndex={-1}><h1>{title}</h1>{children}</main><Footer /></>;
}

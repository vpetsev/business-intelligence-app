import Navbar from '../components/Layouts/Navbar';
import MainBanner from '../components/HomeFour/MainBanner';
import AboutUs from '../components/HomeFour/AboutUs';
import Footer from '../components/Layouts/Footer';
export default function Home() {
  return <><Navbar /><main id="main-content" tabIndex={-1}><MainBanner /><AboutUs /></main><Footer /></>;
}

import { useEffect, useState } from 'react';
export default function GoTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const update = () => setVisible(window.scrollY > 170);
    update(); window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  return visible ? <button type="button" className="go-top" aria-label="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: 'auto' })}><i className="fas fa-chevron-up" aria-hidden="true" /></button> : null;
}

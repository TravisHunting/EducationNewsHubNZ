import { createRoot } from 'react-dom/client';
import App from '../app/hub';
import '../app/globals.css';

createRoot(document.getElementById('root')!).render(<App />);

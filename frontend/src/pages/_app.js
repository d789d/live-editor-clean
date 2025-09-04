import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '../contexts/AuthContext';
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  // Set document direction to RTL
  useEffect(() => {
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'he';
  }, []);

  return (
    <AuthProvider>
      <Component {...pageProps} />
      <Toaster 
        position="top-left"
        reverseOrder={false}
        toastOptions={{
          duration: 4000,
          style: {
            direction: 'rtl',
            fontFamily: 'Noto Sans Hebrew, Arial, sans-serif',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </AuthProvider>
  );
}

export default MyApp;
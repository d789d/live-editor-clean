import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';

const Layout = ({ children, title = 'עורך תורני מקצועי', showNav = true }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const navigation = [
    { name: 'בית', href: '/', icon: '🏠' },
    { name: 'עורך טקסט', href: '/editor', icon: '📝', auth: true },
    { name: 'צ\'אט', href: '/chat', icon: '💬', auth: true },
    { name: 'ההיסטוריה שלי', href: '/history', icon: '📚', auth: true },
  ];

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content="עורך תורני מקצועי עם בינה מלאכותית" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-50" dir="rtl">
        {/* Navigation Header */}
        {showNav && (
          <nav className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                {/* Logo */}
                <div className="flex items-center">
                  <Link href="/" className="flex items-center space-x-2 space-x-reverse">
                    <div className="text-2xl">📖</div>
                    <span className="text-xl font-bold text-gray-900 hebrew-text">
                      עורך תורני
                    </span>
                  </Link>
                </div>

                {/* Desktop Navigation */}
                <div className="hidden md:block">
                  <div className="flex items-center space-x-4 space-x-reverse">
                    {navigation.map((item) => {
                      if (item.auth && !isAuthenticated) return null;
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={`flex items-center space-x-1 space-x-reverse px-3 py-2 rounded-md text-sm font-medium hebrew-text transition-colors ${
                            router.pathname === item.href
                              ? 'bg-primary-100 text-primary-700'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                          }`}
                        >
                          <span className="text-lg">{item.icon}</span>
                          <span>{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* User Menu */}
                <div className="hidden md:block">
                  {isAuthenticated ? (
                    <div className="flex items-center space-x-4 space-x-reverse">
                      <span className="text-sm text-gray-600 hebrew-text">
                        שלום, {user?.firstName}
                      </span>
                      <button
                        onClick={handleLogout}
                        className="btn btn-outline text-sm"
                      >
                        יציאה
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Link href="/login" className="btn btn-outline text-sm">
                        התחברות
                      </Link>
                      <Link href="/register" className="btn btn-primary text-sm">
                        הרשמה
                      </Link>
                    </div>
                  )}
                </div>

                {/* Mobile menu button */}
                <div className="md:hidden">
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  >
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      {isMenuOpen ? (
                        <path d="M6 18L18 6M6 6l12 12" />
                      ) : (
                        <path d="M4 6h16M4 12h16M4 18h16" />
                      )}
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Navigation Menu */}
            {isMenuOpen && (
              <div className="md:hidden">
                <div className="px-2 pt-2 pb-3 space-y-1 bg-white border-t border-gray-200">
                  {navigation.map((item) => {
                    if (item.auth && !isAuthenticated) return null;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`flex items-center space-x-2 space-x-reverse px-3 py-2 rounded-md text-base font-medium hebrew-text ${
                          router.pathname === item.href
                            ? 'bg-primary-100 text-primary-700'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <span className="text-lg">{item.icon}</span>
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}

                  {/* Mobile User Menu */}
                  <div className="border-t border-gray-200 pt-4 pb-3">
                    {isAuthenticated ? (
                      <div className="px-3">
                        <p className="text-base font-medium text-gray-900 hebrew-text">
                          {user?.firstName} {user?.lastName}
                        </p>
                        <p className="text-sm text-gray-500 english-text">
                          {user?.email}
                        </p>
                        <button
                          onClick={handleLogout}
                          className="mt-3 w-full btn btn-outline"
                        >
                          יציאה
                        </button>
                      </div>
                    ) : (
                      <div className="px-3 space-y-2">
                        <Link
                          href="/login"
                          className="block w-full btn btn-outline text-center"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          התחברות
                        </Link>
                        <Link
                          href="/register"
                          className="block w-full btn btn-primary text-center"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          הרשמה
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </nav>
        )}

        {/* Main Content */}
        <main className="flex-1">
          {children}
        </main>

        {/* Footer */}
        {showNav && (
          <footer className="bg-white border-t border-gray-200">
            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
              <div className="text-center">
                <p className="text-gray-600 text-sm hebrew-text">
                  © 2024 עורך תורני מקצועי. כל הזכויות שמורות.
                </p>
                <p className="text-gray-500 text-xs mt-2 hebrew-text">
                  מופעל על ידי בינה מלאכותית של Claude
                </p>
              </div>
            </div>
          </footer>
        )}
      </div>
    </>
  );
};

export default Layout;
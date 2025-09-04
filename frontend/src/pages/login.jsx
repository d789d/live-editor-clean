import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  
  const { login, isAuthenticated, isLoading, error, clearError } = useAuth();
  const router = useRouter();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/chat');
    }
  }, [isAuthenticated, router]);

  // Clear error on mount
  useEffect(() => {
    clearError();
  }, []); // Remove clearError from dependencies to avoid infinite loop

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      return;
    }

    try {
      await login(formData.email, formData.password);
      router.push('/chat');
    } catch (error) {
      // Error is handled by AuthContext
      console.error('Login failed:', error);
    }
  };

  if (isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <Layout title="התחברות - עורך תורני" showNav={false}>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-3xl">📖</span>
            </div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900 hebrew-text">
              התחברות לחשבון
            </h2>
            <p className="mt-2 text-sm text-gray-600 hebrew-text">
              או{' '}
              <Link href="/register" className="font-medium text-primary-600 hover:text-primary-500">
                צור חשבון חדש
              </Link>
            </p>
          </div>

          {/* Login Form */}
          <div className="card">
            <div className="card-body">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Input */}
                <div>
                  <label htmlFor="email" className="form-label">
                    כתובת אימייל
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="form-input"
                    placeholder="הכנס את כתובת האימייל שלך"
                    value={formData.email}
                    onChange={handleInputChange}
                    dir="ltr"
                  />
                </div>

                {/* Password Input */}
                <div>
                  <label htmlFor="password" className="form-label">
                    סיסמה
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      className="form-input pl-10"
                      placeholder="הכנס את הסיסמה שלך"
                      value={formData.password}
                      onChange={handleInputChange}
                      dir="ltr"
                    />
                    <button
                      type="button"
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg hebrew-text">
                    {error}
                  </div>
                )}

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="remember-me" className="mr-2 block text-sm text-gray-700 hebrew-text">
                      זכור אותי
                    </label>
                  </div>

                  <div className="text-sm">
                    <Link href="/forgot-password" className="font-medium text-primary-600 hover:text-primary-500 hebrew-text">
                      שכחת סיסמה?
                    </Link>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn btn-primary text-lg py-3 hebrew-text"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="spinner mr-2"></div>
                      מתחבר...
                    </div>
                  ) : (
                    'התחבר'
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Additional Links */}
          <div className="text-center">
            <p className="text-sm text-gray-600 hebrew-text">
              עדיין אין לך חשבון?{' '}
              <Link href="/register" className="font-medium text-primary-600 hover:text-primary-500">
                הירשם כאן
              </Link>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LoginPage;
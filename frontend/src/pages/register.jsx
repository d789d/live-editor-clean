import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  
  const { register, isAuthenticated, isLoading, error, clearError } = useAuth();
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

  // Check password match
  useEffect(() => {
    if (formData.password && formData.confirmPassword) {
      setPasswordsMatch(formData.password === formData.confirmPassword);
    }
  }, [formData.password, formData.confirmPassword]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setPasswordsMatch(false);
      return;
    }

    try {
      await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
      });
      router.push('/chat');
    } catch (error) {
      // Error is handled by AuthContext
      console.error('Registration failed:', error);
    }
  };

  if (isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <Layout title="הרשמה - עורך תורני" showNav={false}>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-3xl">📖</span>
            </div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900 hebrew-text">
              יצירת חשבון חדש
            </h2>
            <p className="mt-2 text-sm text-gray-600 hebrew-text">
              או{' '}
              <Link href="/login" className="font-medium text-primary-600 hover:text-primary-500">
                התחבר לחשבון קיים
              </Link>
            </p>
          </div>

          {/* Registration Form */}
          <div className="card">
            <div className="card-body">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name Fields */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="firstName" className="form-label">
                      שם פרטי
                    </label>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      required
                      className="form-input"
                      placeholder="הכנס שם פרטי"
                      value={formData.firstName}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="lastName" className="form-label">
                      שם משפחה
                    </label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      required
                      className="form-input"
                      placeholder="הכנס שם משפחה"
                      value={formData.lastName}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

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
                    placeholder="הכנס כתובת אימייל"
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
                      placeholder="הכנס סיסמה (לפחות 6 תווים)"
                      value={formData.password}
                      onChange={handleInputChange}
                      dir="ltr"
                      minLength={6}
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
                  <p className="mt-1 text-sm text-gray-500 hebrew-text">
                    הסיסמה חייבת לכלול לפחות 6 תווים, אותיות גדולות וקטנות ומספר
                  </p>
                </div>

                {/* Confirm Password Input */}
                <div>
                  <label htmlFor="confirmPassword" className="form-label">
                    אימוד סיסמה
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      className={`form-input pl-10 ${!passwordsMatch && formData.confirmPassword ? 'border-red-300 focus:ring-red-500' : ''}`}
                      placeholder="הכנס את הסיסמה שוב"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      dir="ltr"
                    />
                    <button
                      type="button"
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
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
                  {!passwordsMatch && formData.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600 hebrew-text">
                      הסיסמאות אינן תואמות
                    </p>
                  )}
                </div>

                {/* Error Display */}
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg hebrew-text">
                    {error}
                  </div>
                )}

                {/* Terms & Conditions */}
                <div className="flex items-center">
                  <input
                    id="terms"
                    name="terms"
                    type="checkbox"
                    required
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="terms" className="mr-2 block text-sm text-gray-700 hebrew-text">
                    אני מסכים ל
                    <Link href="/terms" className="text-primary-600 hover:text-primary-500">
                      תנאי השימוש
                    </Link>
                    {' '}ו
                    <Link href="/privacy" className="text-primary-600 hover:text-primary-500">
                      מדיניות הפרטיות
                    </Link>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || !passwordsMatch}
                  className="w-full btn btn-primary text-lg py-3 hebrew-text disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="spinner mr-2"></div>
                      נרשם...
                    </div>
                  ) : (
                    'הירשם'
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Additional Links */}
          <div className="text-center">
            <p className="text-sm text-gray-600 hebrew-text">
              כבר יש לך חשבון?{' '}
              <Link href="/login" className="font-medium text-primary-600 hover:text-primary-500">
                התחבר כאן
              </Link>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default RegisterPage;
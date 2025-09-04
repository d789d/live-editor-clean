import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';

const HomePage = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Redirect authenticated users to chat
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/chat');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <Layout title="טוען..." showNav={false}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="spinner"></div>
        </div>
      </Layout>
    );
  }

  if (isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <Layout title="עורך תורני מקצועי - בינה מלאכותית לעיבוד טקסטים תורניים">
      <div className="bg-gradient-to-b from-white to-gray-50">
        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="mx-auto h-20 w-20 bg-primary-100 rounded-full flex items-center justify-center mb-8">
              <span className="text-4xl">📖</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 hebrew-text">
              עורך תורני מקצועי
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-8 hebrew-text max-w-3xl mx-auto">
              בינה מלאכותית מתקדמת לעיבוד טקסטים תורניים בעברית - פיסוק, ניקוד, עיצוב ועוד
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/register" className="btn btn-primary text-lg px-8 py-4">
                התחל עכשיו בחינם
              </Link>
              <Link href="/login" className="btn btn-outline text-lg px-8 py-4">
                התחבר לחשבון קיים
              </Link>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 hebrew-text mb-4">
              מה אפשר לעשות עם העורך?
            </h2>
            <p className="text-lg text-gray-600 hebrew-text">
              כלים מתקדמים לעיבוד ועריכה של טקסטים תורניים בעברית
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="card text-center">
              <div className="card-body">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">✍️</span>
                </div>
                <h3 className="text-xl font-semibold mb-2 hebrew-text">פיסוק מלא</h3>
                <p className="text-gray-600 hebrew-text">
                  הוספת פסיקים, נקודות ונקודותיים לפי כללי הדקדוק העברי
                </p>
              </div>
            </div>

            <div className="card text-center">
              <div className="card-body">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🧹</span>
                </div>
                <h3 className="text-xl font-semibold mb-2 hebrew-text">ניקוי וסידור</h3>
                <p className="text-gray-600 hebrew-text">
                  הסרת רווחים מיותרים וסידור הטקסט בצורה נקייה ומקצועית
                </p>
              </div>
            </div>

            <div className="card text-center">
              <div className="card-body">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📝</span>
                </div>
                <h3 className="text-xl font-semibold mb-2 hebrew-text">ניקוד</h3>
                <p className="text-gray-600 hebrew-text">
                  הוספת ניקוד מדויק לטקסט על בסיס ההקשר והמשמעות
                </p>
              </div>
            </div>

            <div className="card text-center">
              <div className="card-body">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📄</span>
                </div>
                <h3 className="text-xl font-semibold mb-2 hebrew-text">חלוקה לפסקאות</h3>
                <p className="text-gray-600 hebrew-text">
                  ארגון הטקסט לפסקאות לוגיות לקריאה נוחה ומסודרת
                </p>
              </div>
            </div>

            <div className="card text-center">
              <div className="card-body">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🎨</span>
                </div>
                <h3 className="text-xl font-semibold mb-2 hebrew-text">עיצוב מתקדם</h3>
                <p className="text-gray-600 hebrew-text">
                  עיצוב הטקסט בהתאם לסטנדרטים של ספרות תורנית מקצועית
                </p>
              </div>
            </div>

            <div className="card text-center">
              <div className="card-body">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">💬</span>
                </div>
                <h3 className="text-xl font-semibold mb-2 hebrew-text">צ'אט אינטראקטיבי</h3>
                <p className="text-gray-600 hebrew-text">
                  שיחה עם בינה מלאכותית לקבלת עזרה והנחיות בעיבוד הטקסט
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-primary-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold mb-2">99.9%</div>
                <div className="text-primary-200 hebrew-text">דיוק בפיסוק</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">24/7</div>
                <div className="text-primary-200 hebrew-text">זמינות</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">∞</div>
                <div className="text-primary-200 hebrew-text">עיבודים ביום</div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 hebrew-text mb-6">
              מוכן להתחיל?
            </h2>
            <p className="text-lg text-gray-600 hebrew-text mb-8 max-w-2xl mx-auto">
              הצטרף אלינו והתחל לעבד טקסטים תורניים ברמה מקצועית עם בינה מלאכותית מתקדמת
            </p>
            <Link href="/register" className="btn btn-primary text-lg px-8 py-4">
              יצירת חשבון חינם
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default HomePage;
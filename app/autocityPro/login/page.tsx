'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Lock, User, Mail, Eye, EyeOff, ArrowLeft, Globe } from 'lucide-react';

// Content translations
const content = {
  en: {
    title: 'AutoCity Pro',
    subtitle: 'Internal Operations Portal',
    signIn: 'Sign In',
    signInDesc: 'Access your staff dashboard',
    identifier: 'Username or Email',
    identifierPlaceholder: 'username or you@example.com',
    password: 'Password',
    passwordPlaceholder: '••••••••',
    rememberMe: 'Remember me',
    forgotPassword: 'Forgot password?',
    signInButton: 'Sign In',
    signingIn: 'Signing in...',
    backToHome: 'Back to Homepage',
    support: 'For support, contact your system administrator',
    resetPassword: 'Reset Password',
    resetDesc: "Enter your email address and we'll send you a link to reset your password.",
    emailAddress: 'Email Address',
    emailPlaceholder: 'you@example.com',
    cancel: 'Cancel',
    sendResetLink: 'Send Reset Link',
    sending: 'Sending...',
    checkEmail: 'Check Your Email',
    resetSent: "We've sent a password reset link to",
    spamNote: "If you don't see the email, check your spam folder.",
    backToLogin: 'Back to Login',
  },
  ar: {
    title: 'اوتو سيتي برو',
    subtitle: 'بوابة العمليات الداخلية',
    signIn: 'تسجيل الدخول',
    signInDesc: 'الوصول إلى لوحة تحكم الموظفين',
    identifier: 'اسم المستخدم أو البريد الإلكتروني',
    identifierPlaceholder: 'اسم المستخدم أو البريد الإلكتروني',
    password: 'كلمة المرور',
    passwordPlaceholder: '••••••••',
    rememberMe: 'تذكرني',
    forgotPassword: 'نسيت كلمة المرور؟',
    signInButton: 'تسجيل الدخول',
    signingIn: 'جاري تسجيل الدخول...',
    backToHome: 'العودة للصفحة الرئيسية',
    support: 'للدعم، تواصل مع مسؤول النظام',
    resetPassword: 'إعادة تعيين كلمة المرور',
    resetDesc: 'أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور.',
    emailAddress: 'البريد الإلكتروني',
    emailPlaceholder: 'you@example.com',
    cancel: 'إلغاء',
    sendResetLink: 'إرسال رابط إعادة التعيين',
    sending: 'جاري الإرسال...',
    checkEmail: 'تحقق من بريدك الإلكتروني',
    resetSent: 'لقد أرسلنا رابط إعادة تعيين كلمة المرور إلى',
    spamNote: 'إذا لم تجد البريد، تحقق من مجلد البريد العشوائي.',
    backToLogin: 'العودة لتسجيل الدخول',
  },
};

export default function LoginPage() {
  const router = useRouter();
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const t = content[lang];
  const isRTL = lang === 'ar';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          identifier,
          password 
        }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      window.location.href = '/autocityPro/dashboard';
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen bg-[#050505] flex items-center justify-center px-4 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Custom Styles */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Tajawal:wght@400;500;700;800&display=swap');
        
        .ltr {
          direction: ltr;
          font-family: 'Outfit', sans-serif;
        }

        .rtl {
          direction: rtl;
          font-family: 'Tajawal', sans-serif;
        }

        .glass {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .noise::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 1000;
          opacity: 0.015;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
        }

        input::placeholder {
          color: #6b7280;
        }

        .rtl input {
          text-align: right;
        }

        .rtl input::placeholder {
          text-align: right;
        }
      `}</style>

      <div className="noise" />

      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/4 -right-1/4 w-[800px] h-[800px] rounded-full opacity-10 bg-[#E84545] blur-[150px]" />
        <div className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] rounded-full opacity-5 bg-[#E84545] blur-[150px]" />
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(to right, #E84545 1px, transparent 1px),
              linear-gradient(to bottom, #E84545 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px'
          }}
        />
      </div>

      {/* Language Toggle - Top Right */}
      <div className="absolute top-6 right-6 z-10">
        <button
          onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 hover:border-[#E84545]/50 transition-colors bg-black/20 backdrop-blur-sm"
        >
          <Globe className="w-4 h-4 text-[#E84545]" />
          <span className="text-sm font-medium text-white">{lang === 'en' ? 'العربية' : 'English'}</span>
        </button>
      </div>

      <div className="relative z-10 max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-6">
            <Image
              src="/logo.png"
              alt="Auto City Qatar"
              width={200}
              height={100}
              className="object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{t.title}</h1>
          <p className="text-gray-500">{t.subtitle}</p>
        </div>

        {/* Login Form */}
        <div className="glass rounded-2xl p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-1">{t.signIn}</h2>
            <p className="text-gray-500 text-sm">{t.signInDesc}</p>
          </div>
          
          {error && (
            <div className="bg-[#E84545]/10 border border-[#E84545]/30 text-[#E84545] px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-gray-300 mb-2">
                {t.identifier}
              </label>
              <div className="relative">
                <User className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500`} />
                <input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className={`${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} w-full py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-[#E84545] focus:border-transparent transition-all`}
                  placeholder={t.identifierPlaceholder}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                {t.password}
              </label>
              <div className="relative">
                <Lock className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500`} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'} w-full py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-[#E84545] focus:border-transparent transition-all`}
                  placeholder={t.passwordPlaceholder}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors`}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-600 bg-white/5 text-[#E84545] focus:ring-[#E84545] focus:ring-offset-0"
                />
                <label htmlFor="remember" className={`${isRTL ? 'mr-2' : 'ml-2'} block text-sm text-gray-400`}>
                  {t.rememberMe}
                </label>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-[#E84545] hover:text-[#ff6b6b] transition-colors"
              >
                {t.forgotPassword}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#E84545] text-white py-3 rounded-lg font-semibold hover:bg-[#cc3c3c] transition-all disabled:bg-[#E84545]/50 disabled:cursor-not-allowed mt-6"
            >
              {loading ? t.signingIn : t.signInButton}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-[#E84545] transition-colors"
            >
              <ArrowLeft className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
              {t.backToHome}
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-600 text-sm mt-8">
          {t.support}
        </p>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <ForgotPasswordModal 
          onClose={() => setShowForgotPassword(false)} 
          lang={lang}
          t={t}
          isRTL={isRTL}
        />
      )}
    </div>
  );
}

// Forgot Password Modal Component
function ForgotPasswordModal({ 
  onClose, 
  lang, 
  t, 
  isRTL 
}: { 
  onClose: () => void;
  lang: 'en' | 'ar';
  t: typeof content.en;
  isRTL: boolean;
}) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset email');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="glass rounded-2xl max-w-md w-full p-8">
        {!success ? (
          <>
            <h3 className="text-2xl font-bold text-white mb-2">{t.resetPassword}</h3>
            <p className="text-gray-400 mb-6 text-sm">
              {t.resetDesc}
            </p>

            {error && (
              <div className="bg-[#E84545]/10 border border-[#E84545]/30 text-[#E84545] px-4 py-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-gray-300 mb-2">
                  {t.emailAddress}
                </label>
                <div className="relative">
                  <Mail className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500`} />
                  <input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} w-full py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-[#E84545] focus:border-transparent transition-all`}
                    placeholder={t.emailPlaceholder}
                    required
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 border border-white/10 text-gray-300 rounded-lg hover:bg-white/5 transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#E84545] text-white py-3 rounded-lg font-semibold hover:bg-[#cc3c3c] transition-all disabled:bg-[#E84545]/50"
                >
                  {loading ? t.sending : t.sendResetLink}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#E84545]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-[#E84545]" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">{t.checkEmail}</h3>
              <p className="text-gray-400 mb-2">
                {t.resetSent}
              </p>
              <p className="text-white font-medium mb-4" dir="ltr">{email}</p>
              <p className="text-sm text-gray-500 mb-6">
                {t.spamNote}
              </p>
              <button
                onClick={onClose}
                className="w-full bg-[#E84545] text-white py-3 rounded-lg font-semibold hover:bg-[#cc3c3c] transition-all"
              >
                {t.backToLogin}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
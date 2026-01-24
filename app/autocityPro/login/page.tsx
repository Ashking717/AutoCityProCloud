'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Lock, User, Mail, Eye, EyeOff, ArrowLeft, Globe } from 'lucide-react';

// Content translations
const content = {
  en: {
    title: 'AutoCity ',
    subtitle: 'Portal',
    signIn: 'Sign In',
    signInDesc: 'Access ',
    identifier: 'Username or Email',
    identifierPlaceholder: 'username or email',
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
  const [rememberMe, setRememberMe] = useState(false);
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

      // Role-based redirect
      const userRole = data.user?.role;
      let redirectPath = '/autocityPro/dashboard'; // Default

      if (userRole === 'CASHIER') {
        redirectPath = '/autocityPro/sales/new';
      } else if (userRole === 'ACCOUNTANT') {
        redirectPath = '/autocityPro/ledgers';
      }

      window.location.href = redirectPath;
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 relative overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Custom Styles */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=SF+Pro+Display:wght@400;500;600;700;800&display=swap');
        
        * {
          -webkit-tap-highlight-color: transparent;
        }
        
        body {
          font-family: ${lang === 'ar' ? "'Cairo', -apple-system, BlinkMacSystemFont, sans-serif" : "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif"};
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        .ios-card {
          background: rgba(28, 28, 30, 0.95);
          backdrop-filter: blur(40px) saturate(180%);
          border: 0.5px solid rgba(255, 255, 255, 0.08);
        }

        .ios-input {
          background: rgba(58, 58, 60, 0.4);
          backdrop-filter: blur(10px);
          border: 0.5px solid rgba(255, 255, 255, 0.06);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .ios-input:focus {
          background: rgba(58, 58, 60, 0.6);
          border-color: rgba(255, 59, 48, 0.5);
          box-shadow: 0 0 0 4px rgba(255, 59, 48, 0.1);
        }

        .ios-button {
          background: linear-gradient(180deg, #FF453A 0%, #E8463B 100%);
          box-shadow: 0 4px 12px rgba(255, 59, 48, 0.3),
                      0 1px 3px rgba(0, 0, 0, 0.4);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .ios-button:active {
          transform: scale(0.98);
          box-shadow: 0 2px 6px rgba(255, 59, 48, 0.2),
                      0 1px 2px rgba(0, 0, 0, 0.3);
        }

        .ios-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .glow-red {
          box-shadow: 0 0 60px rgba(255, 59, 48, 0.3),
                      0 0 120px rgba(255, 59, 48, 0.15);
        }

        .animate-float {
          animation: float 8s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }

        .animate-pulse-glow {
          animation: pulse-glow 3s ease-in-out infinite;
        }

        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }

        .text-gradient {
          background: linear-gradient(135deg, #FF453A 0%, #FF6B6B 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        input::placeholder {
          color: #6b7280;
        }

        /* Custom checkbox styling */
        input[type="checkbox"] {
          appearance: none;
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 6px;
          border: 2px solid rgba(255, 255, 255, 0.2);
          background: rgba(58, 58, 60, 0.4);
          cursor: pointer;
          position: relative;
          transition: all 0.2s;
        }

        input[type="checkbox"]:checked {
          background: linear-gradient(180deg, #FF453A 0%, #E8463B 100%);
          border-color: #FF453A;
        }

        input[type="checkbox"]:checked::after {
          content: '';
          position: absolute;
          left: 6px;
          top: 2px;
          width: 4px;
          height: 9px;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }

        input[type="checkbox"]:focus {
          outline: none;
          box-shadow: 0 0 0 4px rgba(255, 59, 48, 0.1);
        }
      `}</style>

      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-gradient-to-br from-red-600 to-red-800 rounded-full filter blur-3xl opacity-30 animate-float" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-gradient-to-tl from-red-500 to-red-700 rounded-full filter blur-3xl opacity-25 animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-red-600/10 to-red-800/10 rounded-full filter blur-3xl animate-pulse-glow" />
        
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(255, 59, 48, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 59, 48, 0.03) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Language Toggle */}
      <button
        onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
        className="absolute top-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full ios-card hover:bg-white/5 transition-all active:scale-95"
      >
        <Globe className="w-4 h-4 text-red-500" />
        <span className="text-sm font-medium">{lang === 'en' ? 'العربية' : 'English'}</span>
      </button>

      {/* Main Content */}
      <div className="w-full max-w-md lg:max-w-5xl relative z-10">
        {/* Desktop Layout */}
        <div className="hidden lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center">
          {/* Left Side - Branding */}
          <div className="text-center lg:text-left space-y-6">
            <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
              <Image
                src="/login.png"
                alt="Auto City Qatar"
                width={400}
                height={200}
                className="object-contain"
                priority
              />
            </Link>
            <div>
              <h1 className="text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
                <span className=" text-red-600">{t.title}</span>
              </h1>
              <p className="text-gray-400 text-lg font-medium tracking-wide mb-6">{t.subtitle}</p>
              <p className="text-gray-500 text-sm max-w-md">
                {t.support}
              </p>
            </div>
            
            {/* Decorative Elements */}
            <div className="hidden lg:flex gap-4 pt-8">
              {/* <div className="flex-1 p-4 rounded-2xl ios-card ">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center mb-3">
                  <Lock className="w-5 h-5 text-red-500 flex place-items-center justify-center" />
                </div>
                <h3 className="flex justify-center font-semibold text-sm mb-1">Secure Access</h3>
                <p className="flex justify-center text-xs text-gray-500">Enterprise-grade security</p>
              </div> */}
              {/* <div className="flex-1 p-4 rounded-2xl ios-card">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center mb-3">
                  <Globe className="w-5 h-5 text-red-500" />
                </div>
                <h3 className="font-semibold text-sm mb-1">Multi-language</h3>
                <p className="text-xs text-gray-500">English & Arabic support</p>
              </div> */}
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="ios-card rounded-3xl p-8 shadow-2xl">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-1">{t.signIn}</h2>
              <p className="text-gray-400 text-sm">{t.signInDesc}</p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 backdrop-blur-sm">
                <p className="text-red-400 text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-5">
              {/* Username/Email Input */}
              <div>
                <label htmlFor="identifier-desktop" className="block text-sm font-semibold mb-2 text-gray-300">
                  {t.identifier}
                </label>
                <div className="relative">
                  <User className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5`} />
                  <input
                    id="identifier-desktop"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                    className={`${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} w-full py-4 ios-input rounded-2xl text-white placeholder-gray-500 focus:outline-none text-base`}
                    placeholder={t.identifierPlaceholder}
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password-desktop" className="block text-sm font-semibold mb-2 text-gray-300">
                  {t.password}
                </label>
                <div className="relative">
                  <Lock className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5`} />
                  <input
                    id="password-desktop"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                    className={`${isRTL ? 'pr-12 pl-12' : 'pl-12 pr-12'} w-full py-4 ios-input rounded-2xl text-white placeholder-gray-500 focus:outline-none text-base`}
                    placeholder={t.passwordPlaceholder}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute ${isRTL ? 'left-4' : 'right-4'} top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors active:scale-95`}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label htmlFor="remember-desktop" className="flex items-center cursor-pointer group">
                  <input
                    id="remember-desktop"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="cursor-pointer"
                  />
                  <span className={`${isRTL ? 'mr-3' : 'ml-3'} text-sm font-medium text-gray-300 group-hover:text-white transition-colors`}>
                    {t.rememberMe}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm font-semibold text-red-500 hover:text-red-400 transition-colors active:scale-95"
                >
                  {t.forgotPassword}
                </button>
              </div>

              {/* Sign In Button */}
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-4 rounded-2xl ios-button text-white font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t.signingIn}
                  </span>
                ) : (
                  t.signInButton
                )}
              </button>
            </div>

            {/* Back to Home */}
            <div className="mt-6 text-center">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-red-500 transition-colors active:scale-95"
              >
                <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                {t.backToHome}
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="lg:hidden">
          {/* Logo Section */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-block mb-6 hover:opacity-80 transition-opacity">
              <Image
                src="/login.png"
                alt="Auto City Qatar"
                width={300}
                height={150}
                className="object-contain"
                priority
              />
            </Link>
            <h1 className="text-4xl font-bold mb-2 tracking-tight">
              <span className="text-gradient">{t.title}</span>
            </h1>
            <p className="text-gray-400 text-sm font-medium tracking-wide">{t.subtitle}</p>
          </div>

          {/* Login Card */}
          <div className="ios-card rounded-3xl p-8 shadow-2xl">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-1">{t.signIn}</h2>
              <p className="text-gray-400 text-sm">{t.signInDesc}</p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 backdrop-blur-sm">
                <p className="text-red-400 text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-5">
              {/* Username/Email Input */}
              <div>
                <label htmlFor="identifier-mobile" className="block text-sm font-semibold mb-2 text-gray-300">
                  {t.identifier}
                </label>
                <div className="relative">
                  <User className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5`} />
                  <input
                    id="identifier-mobile"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                    className={`${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} w-full py-4 ios-input rounded-2xl text-white placeholder-gray-500 focus:outline-none text-base`}
                    placeholder={t.identifierPlaceholder}
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password-mobile" className="block text-sm font-semibold mb-2 text-gray-300">
                  {t.password}
                </label>
                <div className="relative">
                  <Lock className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5`} />
                  <input
                    id="password-mobile"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                    className={`${isRTL ? 'pr-12 pl-12' : 'pl-12 pr-12'} w-full py-4 ios-input rounded-2xl text-white placeholder-gray-500 focus:outline-none text-base`}
                    placeholder={t.passwordPlaceholder}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute ${isRTL ? 'left-4' : 'right-4'} top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors active:scale-95`}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label htmlFor="remember-mobile" className="flex items-center cursor-pointer group">
                  <input
                    id="remember-mobile"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="cursor-pointer"
                  />
                  <span className={`${isRTL ? 'mr-3' : 'ml-3'} text-sm font-medium text-gray-300 group-hover:text-white transition-colors`}>
                    {t.rememberMe}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm font-semibold text-red-500 hover:text-red-400 transition-colors active:scale-95"
                >
                  {t.forgotPassword}
                </button>
              </div>

              {/* Sign In Button */}
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-4 rounded-2xl ios-button text-white font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t.signingIn}
                  </span>
                ) : (
                  t.signInButton
                )}
              </button>
            </div>

            {/* Back to Home */}
            <div className="mt-6 text-center">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-red-500 transition-colors active:scale-95"
              >
                <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                {t.backToHome}
              </Link>
            </div>
          </div>

          {/* Footer Support Text */}
          <p className="text-center text-xs text-gray-500 mt-6 font-medium">
            {t.support}
          </p>
        </div>
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

  const handleSubmit = async () => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md ios-card rounded-3xl p-8 shadow-2xl transform transition-all">
        {!success ? (
          <>
            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-2">{t.resetPassword}</h3>
              <p className="text-gray-400 text-sm">{t.resetDesc}</p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                <p className="text-red-400 text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label htmlFor="reset-email" className="block text-sm font-semibold mb-2 text-gray-300">
                  {t.emailAddress}
                </label>
                <div className="relative">
                  <Mail className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5`} />
                  <input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    className={`${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} w-full py-4 ios-input rounded-2xl text-white placeholder-gray-500 focus:outline-none text-base`}
                    placeholder={t.emailPlaceholder}
                    required
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-semibold transition-all active:scale-95"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 py-4 rounded-2xl ios-button text-white font-semibold disabled:opacity-50 active:scale-95 transition-all"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t.sending}
                    </span>
                  ) : (
                    t.sendResetLink
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-2">{t.checkEmail}</h3>
              <p className="text-gray-400 text-sm mb-4">
                {t.resetSent}
              </p>
              <p className="text-white font-medium mb-4 px-4 py-2 rounded-xl bg-white/5" dir="ltr">
                {email}
              </p>
              <p className="text-gray-500 text-xs">
                {t.spamNote}
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full py-4 rounded-2xl ios-button text-white font-semibold active:scale-95 transition-all"
            >
              {t.backToLogin}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
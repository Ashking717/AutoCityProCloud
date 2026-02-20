'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Lock, User, Mail, Eye, EyeOff, ArrowLeft, Globe, Sun, Moon } from 'lucide-react';

// ─── Time-based theme hook ────────────────────────────────────────────────────
function useTimeBasedTheme() {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const check = () => { const h = new Date().getHours(); setIsDark(h < 6 || h >= 18); };
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, []);
  return isDark;
}

const content = {
  en: {
    title: 'AutoCity ', subtitle: 'Portal', signIn: 'Sign In',
    signInDesc: 'Access ', identifier: 'Username or Email',
    identifierPlaceholder: 'username or email', password: 'Password',
    passwordPlaceholder: '••••••••', rememberMe: 'Remember me',
    forgotPassword: 'Forgot password?', signInButton: 'Sign In',
    signingIn: 'Signing in...', backToHome: 'Back to Homepage',
    support: 'For support, contact your system administrator',
    resetPassword: 'Reset Password',
    resetDesc: "Enter your email address and we'll send you a link to reset your password.",
    emailAddress: 'Email Address', emailPlaceholder: 'you@example.com',
    cancel: 'Cancel', sendResetLink: 'Send Reset Link', sending: 'Sending...',
    checkEmail: 'Check Your Email', resetSent: "We've sent a password reset link to",
    spamNote: "If you don't see the email, check your spam folder.", backToLogin: 'Back to Login',
  },
  ar: {
    title: 'اوتو سيتي برو', subtitle: 'بوابة العمليات الداخلية', signIn: 'تسجيل الدخول',
    signInDesc: 'الوصول إلى لوحة تحكم الموظفين', identifier: 'اسم المستخدم أو البريد الإلكتروني',
    identifierPlaceholder: 'اسم المستخدم أو البريد الإلكتروني', password: 'كلمة المرور',
    passwordPlaceholder: '••••••••', rememberMe: 'تذكرني', forgotPassword: 'نسيت كلمة المرور؟',
    signInButton: 'تسجيل الدخول', signingIn: 'جاري تسجيل الدخول...',
    backToHome: 'العودة للصفحة الرئيسية', support: 'للدعم، تواصل مع مسؤول النظام',
    resetPassword: 'إعادة تعيين كلمة المرور',
    resetDesc: 'أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور.',
    emailAddress: 'البريد الإلكتروني', emailPlaceholder: 'you@example.com',
    cancel: 'إلغاء', sendResetLink: 'إرسال رابط إعادة التعيين', sending: 'جاري الإرسال...',
    checkEmail: 'تحقق من بريدك الإلكتروني', resetSent: 'لقد أرسلنا رابط إعادة تعيين كلمة المرور إلى',
    spamNote: 'إذا لم تجد البريد، تحقق من مجلد البريد العشوائي.', backToLogin: 'العودة لتسجيل الدخول',
  },
};

function LoginForm({
  prefix,
  t,
  th,
  isRTL,
  identifier,
  setIdentifier,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  rememberMe,
  setRememberMe,
  setShowForgotPassword,
  handleSubmit,
  loading,
}: {
  prefix: string;
  t: typeof content.en;
  th: any;
  isRTL: boolean;
  identifier: string;
  setIdentifier: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  rememberMe: boolean;
  setRememberMe: (v: boolean) => void;
  setShowForgotPassword: (v: boolean) => void;
  handleSubmit: (e: React.FormEvent) => void;
  loading: boolean;
}) {
  return (
    <div className="space-y-5">
      <div>
        <label htmlFor={`${prefix}-identifier`} className="block text-sm font-semibold mb-2" style={{ color: th.labelText }}>
          {t.identifier}
        </label>
        <div className="relative">
          <User className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5`} style={{ color: th.inputIcon }} />
          <input id={`${prefix}-identifier`} type="text" value={identifier}
            onChange={e => setIdentifier(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit(e)}
            placeholder={t.identifierPlaceholder} required autoComplete="username"
            className={`${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} w-full py-4 rounded-2xl focus:outline-none text-base transition-all duration-300`}
            style={{ background: th.inputBg, border: `0.5px solid ${th.inputBorder}`, color: th.inputText }}
          />
        </div>
      </div>
      <div>
        <label htmlFor={`${prefix}-password`} className="block text-sm font-semibold mb-2" style={{ color: th.labelText }}>
          {t.password}
        </label>
        <div className="relative">
          <Lock className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5`} style={{ color: th.inputIcon }} />
          <input id={`${prefix}-password`} type={showPassword ? 'text' : 'password'} value={password}
            onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit(e)}
            placeholder={t.passwordPlaceholder} required autoComplete="current-password"
            className={`${isRTL ? 'pr-12 pl-12' : 'pl-12 pr-12'} w-full py-4 rounded-2xl focus:outline-none text-base transition-all duration-300`}
            style={{ background: th.inputBg, border: `0.5px solid ${th.inputBorder}`, color: th.inputText }}
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)}
            className={`absolute ${isRTL ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 hover:text-gray-300 transition-colors active:scale-95`}
            style={{ color: th.inputIcon }}>
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <label htmlFor={`${prefix}-remember`} className="flex items-center cursor-pointer group">
          <input id={`${prefix}-remember`} type="checkbox" checked={rememberMe}
            onChange={e => setRememberMe(e.target.checked)} className="cursor-pointer"
            style={{ '--checkbox-border': th.checkboxBorder, '--checkbox-bg': th.checkboxBg } as any} />
          <span className={`${isRTL ? 'mr-3' : 'ml-3'} text-sm font-medium transition-colors`} style={{ color: th.rememberText }}>
            {t.rememberMe}
          </span>
        </label>
        <button type="button" onClick={() => setShowForgotPassword(true)}
          className="text-sm font-semibold text-red-500 hover:text-red-400 transition-colors active:scale-95">
          {t.forgotPassword}
        </button>
      </div>
      <button onClick={handleSubmit} disabled={loading}
        className="w-full py-4 rounded-2xl text-white font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all ios-button">
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {t.signingIn}
          </span>
        ) : t.signInButton}
      </button>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const isDark = useTimeBasedTheme();
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

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const th = {
    pageBg:          isDark ? '#000000'                                               : '#f1f5f9',
    blobOpacity1:    isDark ? '0.30'                                                  : '0.12',
    blobOpacity2:    isDark ? '0.25'                                                  : '0.10',
    blobOpacity3:    isDark ? '0.10'                                                  : '0.05',
    langBtnBg:       isDark ? 'rgba(28,28,30,0.95)'                                   : 'rgba(255,255,255,0.95)',
    langBtnBorder:   isDark ? 'rgba(255,255,255,0.08)'                                : 'rgba(0,0,0,0.08)',
    langBtnText:     isDark ? '#ffffff'                                               : '#111827',
    cardBg:          isDark ? 'rgba(28,28,30,0.95)'                                   : 'rgba(255,255,255,0.97)',
    cardBorder:      isDark ? 'rgba(255,255,255,0.08)'                                : 'rgba(0,0,0,0.06)',
    title:           isDark ? '#dc2626'                                               : '#991b1b',
    subtitle:        isDark ? '#9ca3af'                                               : '#6b7280',
    support:         isDark ? '#6b7280'                                               : '#9ca3af',
    headingMain:     isDark ? '#ffffff'                                               : '#111827',
    headingDesc:     isDark ? '#9ca3af'                                               : '#6b7280',
    labelText:       isDark ? '#d1d5db'                                               : '#374151',
    inputBg:         isDark ? 'rgba(58,58,60,0.40)'                                   : 'rgba(0,0,0,0.04)',
    inputBorder:     isDark ? 'rgba(255,255,255,0.06)'                                : 'rgba(0,0,0,0.10)',
    inputText:       isDark ? '#ffffff'                                               : '#111827',
    inputPH:         isDark ? '#6b7280'                                               : '#9ca3af',
    inputIcon:       isDark ? '#6b7280'                                               : '#9ca3af',
    inputFocusBg:    isDark ? 'rgba(58,58,60,0.60)'                                   : 'rgba(0,0,0,0.06)',
    checkboxBorder:  isDark ? 'rgba(255,255,255,0.20)'                                : 'rgba(0,0,0,0.15)',
    checkboxBg:      isDark ? 'rgba(58,58,60,0.40)'                                   : 'rgba(0,0,0,0.04)',
    rememberText:    isDark ? '#d1d5db'                                               : '#374151',
    errorBg:         isDark ? 'rgba(239,68,68,0.10)'                                  : 'rgba(239,68,68,0.08)',
    errorBorder:     isDark ? 'rgba(239,68,68,0.20)'                                  : 'rgba(239,68,68,0.20)',
    backLinkText:    isDark ? '#9ca3af'                                               : '#6b7280',
    footerText:      isDark ? '#6b7280'                                               : '#9ca3af',
    badgeBg:         isDark ? 'rgba(0,0,0,0.40)'                                     : 'rgba(255,255,255,0.80)',
    badgeBorder:     isDark ? 'rgba(255,255,255,0.15)'                                : 'rgba(153,27,27,0.20)',
    badgeText:       isDark ? 'rgba(255,255,255,0.70)'                                : '#991b1b',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }), credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Login failed');
      const userRole = data.user?.role;
      let redirectPath = '/autocityPro/dashboard';
      if (userRole === 'CASHIER') redirectPath = '/autocityPro/sales/new';
      else if (userRole === 'ACCOUNTANT') redirectPath = '/autocityPro/ledgers';
      window.location.href = redirectPath;
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-white flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-700"
      style={{ background: th.pageBg, color: th.headingMain }}
      dir={isRTL ? 'rtl' : 'ltr'}>

      {/* FIX: Replaced `<style>{...}</style>` with `<style dangerouslySetInnerHTML={{ __html: ... }} />` */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
        * { -webkit-tap-highlight-color: transparent; }
        body {
          font-family: ${lang === 'ar' ? "'Cairo', -apple-system, BlinkMacSystemFont, sans-serif" : "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif"};
          -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
        }
        .ios-button {
          background: linear-gradient(180deg, #FF453A 0%, #E8463B 100%);
          box-shadow: 0 4px 12px rgba(255,59,48,0.3), 0 1px 3px rgba(0,0,0,0.4);
          transition: all 0.2s cubic-bezier(0.4,0,0.2,1);
        }
        .ios-button:active { transform: scale(0.98); }
        .animate-float { animation: float 8s ease-in-out infinite; }
        @keyframes float {
          0%,100% { transform: translate(0,0) scale(1); }
          33% { transform: translate(30px,-30px) scale(1.1); }
          66% { transform: translate(-20px,20px) scale(0.9); }
        }
        .animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
        @keyframes pulse-glow {
          0%,100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }
        input[type="checkbox"] {
          appearance: none; -webkit-appearance: none;
          width: 20px; height: 20px; border-radius: 6px;
          border: 2px solid rgba(255,255,255,0.2);
          background: rgba(58,58,60,0.4);
          cursor: pointer; position: relative; transition: all 0.2s;
        }
        input[type="checkbox"]:checked {
          background: linear-gradient(180deg,#FF453A 0%,#E8463B 100%);
          border-color: #FF453A;
        }
        input[type="checkbox"]:checked::after {
          content: ''; position: absolute; left: 6px; top: 2px;
          width: 4px; height: 9px; border: solid white;
          border-width: 0 2px 2px 0; transform: rotate(45deg);
        }
        input[type="checkbox"]:focus { outline: none; box-shadow: 0 0 0 4px rgba(255,59,48,0.1); }
        input::placeholder { color: #6b7280; }
      `
      }} />

      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-gradient-to-br from-red-600 to-red-800 rounded-full filter blur-3xl animate-float"
          style={{ opacity: th.blobOpacity1 }} />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-gradient-to-tl from-red-500 to-red-700 rounded-full filter blur-3xl animate-float"
          style={{ opacity: th.blobOpacity2, animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-red-600/10 to-red-800/10 rounded-full filter blur-3xl animate-pulse-glow"
          style={{ opacity: parseFloat(th.blobOpacity3) * 10 }} />
        <div className="absolute inset-0" style={{
          backgroundImage: isDark
            ? 'linear-gradient(rgba(255,59,48,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,59,48,0.03) 1px,transparent 1px)'
            : 'linear-gradient(rgba(153,27,27,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(153,27,27,0.04) 1px,transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Language Toggle */}
      <button onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
        className="absolute top-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full hover:bg-white/5 transition-all active:scale-95"
        style={{ background: th.langBtnBg, border: `0.5px solid ${th.langBtnBorder}` }}>
        <Globe className="w-4 h-4 text-red-500" />
        <span className="text-sm font-medium" style={{ color: th.langBtnText }}>{lang === 'en' ? 'العربية' : 'English'}</span>
      </button>

      {/* Theme Badge */}
      <div className="absolute top-6 left-6 z-50 flex items-center gap-1.5 px-3 py-2 rounded-full transition-all duration-500"
        style={{ background: th.badgeBg, border: `1px solid ${th.badgeBorder}`, color: th.badgeText }}>
        {isDark ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
      </div>

      {/* Main Content */}
      <div className="w-full max-w-md lg:max-w-5xl relative z-10">

        {/* Desktop Layout */}
        <div className="hidden lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center">
          <div className="text-center lg:text-left space-y-6">
            <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
              <Image src="/login.png" alt="Auto City Qatar" width={400} height={200} className="object-contain" priority />
            </Link>
            <div>
              <h1 className="text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
                <span style={{ color: th.title }}>{t.title}</span>
              </h1>
              <p className="text-lg font-medium tracking-wide mb-6" style={{ color: th.subtitle }}>{t.subtitle}</p>
              <p className="text-sm max-w-md" style={{ color: th.support }}>{t.support}</p>
            </div>
          </div>

          {/* Desktop Card */}
          <div className="rounded-3xl p-8 shadow-2xl backdrop-blur-[40px] transition-colors duration-700"
            style={{ background: th.cardBg, border: `0.5px solid ${th.cardBorder}` }}>
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-1" style={{ color: th.headingMain }}>{t.signIn}</h2>
              <p className="text-sm" style={{ color: th.headingDesc }}>{t.signInDesc}</p>
            </div>
            {error && (
              <div className="mb-6 p-4 rounded-2xl backdrop-blur-sm"
                style={{ background: th.errorBg, border: `1px solid ${th.errorBorder}` }}>
                <p className="text-red-400 text-sm font-medium">{error}</p>
              </div>
            )}
            <LoginForm
              prefix="desktop"
              t={t}
              th={th}
              isRTL={isRTL}
              identifier={identifier}
              setIdentifier={setIdentifier}
              password={password}
              setPassword={setPassword}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              rememberMe={rememberMe}
              setRememberMe={setRememberMe}
              setShowForgotPassword={setShowForgotPassword}
              handleSubmit={handleSubmit}
              loading={loading}
            />
            <div className="mt-6 text-center">
              <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium hover:text-red-500 transition-colors active:scale-95"
                style={{ color: th.backLinkText }}>
                <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                {t.backToHome}
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="lg:hidden">
          <div className="text-center mb-8">
            <Link href="/" className="inline-block mb-6 hover:opacity-80 transition-opacity">
              <Image src="/login.png" alt="Auto City Qatar" width={300} height={150} className="object-contain" priority />
            </Link>
            <h1 className="text-4xl font-bold mb-2 tracking-tight">
              <span style={{ color: th.title }}>{t.title}</span>
            </h1>
            <p className="text-sm font-medium tracking-wide" style={{ color: th.subtitle }}>{t.subtitle}</p>
          </div>

          <div className="rounded-3xl p-8 shadow-2xl backdrop-blur-[40px] transition-colors duration-700"
            style={{ background: th.cardBg, border: `0.5px solid ${th.cardBorder}` }}>
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-1" style={{ color: th.headingMain }}>{t.signIn}</h2>
              <p className="text-sm" style={{ color: th.headingDesc }}>{t.signInDesc}</p>
            </div>
            {error && (
              <div className="mb-6 p-4 rounded-2xl"
                style={{ background: th.errorBg, border: `1px solid ${th.errorBorder}` }}>
                <p className="text-red-400 text-sm font-medium">{error}</p>
              </div>
            )}
            <LoginForm
              prefix="mobile"
              t={t}
              th={th}
              isRTL={isRTL}
              identifier={identifier}
              setIdentifier={setIdentifier}
              password={password}
              setPassword={setPassword}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              rememberMe={rememberMe}
              setRememberMe={setRememberMe}
              setShowForgotPassword={setShowForgotPassword}
              handleSubmit={handleSubmit}
              loading={loading}
            />
            <div className="mt-6 text-center">
              <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium hover:text-red-500 transition-colors active:scale-95"
                style={{ color: th.backLinkText }}>
                <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                {t.backToHome}
              </Link>
            </div>
          </div>
          <p className="text-center text-xs mt-6 font-medium" style={{ color: th.footerText }}>{t.support}</p>
        </div>
      </div>

      {showForgotPassword && (
        <ForgotPasswordModal onClose={() => setShowForgotPassword(false)} lang={lang} t={t} isRTL={isRTL} isDark={isDark} th={th} />
      )}
    </div>
  );
}

function ForgotPasswordModal({
  onClose, lang, t, isRTL, isDark, th,
}: {
  onClose: () => void; lang: 'en' | 'ar'; t: typeof content.en; isRTL: boolean; isDark: boolean; th: any;
}) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reset email');
      setSuccess(true);
    } catch (err: any) { setError(err.message || 'An error occurred'); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClose(); }} className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-3xl p-8 shadow-2xl transform transition-all"
        style={{ background: th.cardBg, border: `0.5px solid ${th.cardBorder}` }}>
        {!success ? (
          <>
            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-2" style={{ color: th.headingMain }}>{t.resetPassword}</h3>
              <p className="text-sm" style={{ color: th.headingDesc }}>{t.resetDesc}</p>
            </div>
            {error && (
              <div className="mb-6 p-4 rounded-2xl" style={{ background: th.errorBg, border: `1px solid ${th.errorBorder}` }}>
                <p className="text-red-400 text-sm font-medium">{error}</p>
              </div>
            )}
            <div className="space-y-5">
              <div>
                <label htmlFor="reset-email" className="block text-sm font-semibold mb-2" style={{ color: th.labelText }}>
                  {t.emailAddress}
                </label>
                <div className="relative">
                  <Mail className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5`} style={{ color: th.inputIcon }} />
                  <input id="reset-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()} placeholder={t.emailPlaceholder} required dir="ltr"
                    className={`${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} w-full py-4 rounded-2xl focus:outline-none text-base transition-all duration-300`}
                    style={{ background: th.inputBg, border: `0.5px solid ${th.inputBorder}`, color: th.inputText }}
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose}
                  className="flex-1 py-4 rounded-2xl font-semibold transition-all active:scale-95"
                  style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', color: th.headingMain }}>
                  {t.cancel}
                </button>
                <button onClick={handleSubmit} disabled={loading}
                  className="flex-1 py-4 rounded-2xl ios-button text-white font-semibold disabled:opacity-50 active:scale-95 transition-all">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t.sending}
                    </span>
                  ) : t.sendResetLink}
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
              <h3 className="text-2xl font-bold mb-2" style={{ color: th.headingMain }}>{t.checkEmail}</h3>
              <p className="text-sm mb-4" style={{ color: th.headingDesc }}>{t.resetSent}</p>
              <p className="font-medium mb-4 px-4 py-2 rounded-xl dir-ltr" dir="ltr"
                style={{ color: th.headingMain, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}>
                {email}
              </p>
              <p className="text-xs" style={{ color: th.support }}>{t.spamNote}</p>
            </div>
            <button onClick={onClose}
              className="w-full py-4 rounded-2xl ios-button text-white font-semibold active:scale-95 transition-all">
              {t.backToLogin}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
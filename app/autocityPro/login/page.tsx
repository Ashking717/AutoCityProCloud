'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Lock, User, Mail, Eye, EyeOff, ArrowLeft, Globe, Sun, Moon, Shield } from 'lucide-react';

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

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@300;400;500;600;700&display=swap');

  :root {
    /* Light Mode Tech Theme */
    --bg-base: #f8f9fa;
    --bg-panel: #ffffff;
    --panel-border: rgba(0,0,0,0.08);
    --accent-primary: #ff2a2a;
    --text-primary: #111827;
    --text-muted: #6b7280;
    --text-dark: #9ca3af;
    --input-bg: #f3f4f6;
    --grid-color: rgba(0,0,0,0.03);
    --shadow-color: rgba(0,0,0,0.05);
    --error-bg: rgba(255,42,42,0.08);
    --error-border: rgba(255,42,42,0.2);
  }

  .theme-dark {
    /* Dark Mode Tech Theme */
    --bg-base: #050505;
    --bg-panel: #0d0d10;
    --panel-border: rgba(255, 255, 255, 0.05);
    --accent-primary: #ff2a2a;
    --text-primary: #ffffff;
    --text-muted: #8a8a93;
    --text-dark: #4a4a52;
    --input-bg: #050505;
    --grid-color: rgba(255,255,255,0.02);
    --shadow-color: rgba(0,0,0,0.8);
    --error-bg: rgba(255,42,42,0.1);
    --error-border: rgba(255,42,42,0.2);
  }

  * { -webkit-tap-highlight-color: transparent; }

  .ltr { direction: ltr; font-family: 'Space Grotesk', sans-serif; }
  .rtl { direction: rtl; font-family: 'Cairo', sans-serif; }

  /* Dashboard Bento Panels */
  .dash-panel {
    background: var(--bg-panel);
    border: 1px solid var(--panel-border);
    border-radius: 24px;
    position: relative;
    box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.02), 0 10px 30px -10px var(--shadow-color);
  }
  .dash-panel::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent, var(--panel-border), transparent);
  }

  .input-tech {
    background: var(--input-bg);
    border: 1px solid var(--panel-border);
    color: var(--text-primary);
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .input-tech:focus {
    border-color: var(--accent-primary);
    background: rgba(255,42,42,0.02);
    box-shadow: 0 0 15px rgba(255,42,42,0.15), inset 0 0 10px rgba(255,42,42,0.05);
  }
  .input-tech::placeholder { color: var(--text-muted); opacity: 0.6; }

  .btn-system {
    border-radius: 99px;
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
    text-transform: uppercase;
  }
  .btn-primary {
    background: linear-gradient(135deg, rgba(255,42,42,0.1), rgba(255,94,0,0.1));
    border: 1px solid var(--accent-primary);
    color: var(--accent-primary);
    box-shadow: 0 0 20px rgba(255,42,42,0.15), inset 0 0 10px rgba(255,42,42,0.1);
  }
  .btn-primary:hover:not(:disabled) {
    background: var(--accent-primary);
    color: #fff;
    box-shadow: 0 0 30px rgba(255,42,42,0.4);
    transform: translateY(-1px);
  }
  .btn-primary:active:not(:disabled) {
    transform: scale(0.98);
  }

  input[type="checkbox"].checkbox-tech {
    appearance: none; -webkit-appearance: none;
    width: 20px; height: 20px; border-radius: 6px;
    border: 1px solid var(--panel-border);
    background: var(--input-bg);
    cursor: pointer; position: relative; transition: all 0.2s;
  }
  input[type="checkbox"].checkbox-tech:checked {
    background: var(--accent-primary);
    border-color: var(--accent-primary);
    box-shadow: 0 0 10px rgba(255,42,42,0.4);
  }
  input[type="checkbox"].checkbox-tech:checked::after {
    content: ''; position: absolute; left: 6px; top: 2px;
    width: 4px; height: 9px; border: solid white;
    border-width: 0 2px 2px 0; transform: rotate(45deg);
  }

  .metric-dot {
    display: inline-block; width: 6px; height: 6px;
    background-color: var(--accent-primary); border-radius: 50%;
    box-shadow: 0 0 8px var(--accent-primary);
    animation: pulse-glow 2s infinite;
  }
  @keyframes pulse-glow {
    0% { box-shadow: 0 0 0 0 rgba(255,42,42, 0.4); }
    70% { box-shadow: 0 0 0 6px rgba(255,42,42, 0); }
    100% { box-shadow: 0 0 0 0 rgba(255,42,42, 0); }
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(15px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-up {
    animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    opacity: 0;
  }
`;

function LoginForm({
  prefix, t, isRTL, identifier, setIdentifier, password, setPassword,
  showPassword, setShowPassword, rememberMe, setRememberMe,
  setShowForgotPassword, handleSubmit, loading,
}: any) {
  return (
    <div className="space-y-6">
      {/* Identifier Input */}
      <div>
        <label htmlFor={`${prefix}-identifier`} className={`block text-xs font-mono tracking-widest uppercase mb-2 text-[var(--text-muted)] ${isRTL ? 'text-right' : 'text-left'}`}>
          {t.identifier}
        </label>
        <div className="relative group">
          <User className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 transition-colors text-[var(--text-dark)] group-focus-within:text-[var(--accent-primary)]`} />
          <input id={`${prefix}-identifier`} type="text" value={identifier}
            onChange={e => setIdentifier(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit(e)}
            placeholder={t.identifierPlaceholder} required autoComplete="username"
            className={`input-tech ${isRTL ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'} w-full py-4 rounded-xl focus:outline-none text-sm font-medium`}
          />
        </div>
      </div>
      
      {/* Password Input */}
      <div>
        <label htmlFor={`${prefix}-password`} className={`block text-xs font-mono tracking-widest uppercase mb-2 text-[var(--text-muted)] ${isRTL ? 'text-right' : 'text-left'}`}>
          {t.password}
        </label>
        <div className="relative group">
          <Lock className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 transition-colors text-[var(--text-dark)] group-focus-within:text-[var(--accent-primary)]`} />
          <input id={`${prefix}-password`} type={showPassword ? 'text' : 'password'} value={password}
            onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit(e)}
            placeholder={t.passwordPlaceholder} required autoComplete="current-password"
            className={`input-tech px-12 w-full py-4 rounded-xl focus:outline-none text-sm font-medium ${isRTL ? 'text-right' : 'text-left'}`}
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)}
            className={`absolute ${isRTL ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-[var(--text-dark)] hover:text-[var(--accent-primary)] transition-colors active:scale-95`}>
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Remember & Forgot Password */}
      <div className={`flex items-center justify-between pt-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
        <label htmlFor={`${prefix}-remember`} className="flex items-center cursor-pointer group">
          <input id={`${prefix}-remember`} type="checkbox" checked={rememberMe}
            onChange={e => setRememberMe(e.target.checked)} className="cursor-pointer checkbox-tech" />
          <span className={`${isRTL ? 'mr-3' : 'ml-3'} text-sm font-medium text-[var(--text-muted)] transition-colors group-hover:text-[var(--text-primary)]`}>
            {t.rememberMe}
          </span>
        </label>
        <button type="button" onClick={() => setShowForgotPassword(true)}
          className="text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors active:scale-95">
          {t.forgotPassword}
        </button>
      </div>

      {/* Submit Button */}
      <div className="pt-2">
        <button onClick={handleSubmit} disabled={loading}
          className="w-full py-4 btn-system btn-primary text-white font-bold text-sm tracking-widest disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? (
            <span className="flex items-center justify-center gap-3">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {t.signingIn}
            </span>
          ) : t.signInButton}
        </button>
      </div>
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
    <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-700 bg-[var(--bg-base)] text-[var(--text-primary)] ${isDark ? 'theme-dark' : 'theme-light'} ${isRTL ? 'rtl' : 'ltr'}`}>
      <style dangerouslySetInnerHTML={{ __html: styles }} />

      {/* High-Tech Grid Background */}
      <div className="fixed inset-0 pointer-events-none z-0" 
           style={{ 
             backgroundImage: 'linear-gradient(var(--grid-color) 1px, transparent 1px), linear-gradient(90deg, var(--grid-color) 1px, transparent 1px)',
             backgroundSize: '40px 40px',
             maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 80%)',
             WebkitMaskImage: 'radial-gradient(ellipse at center, black 20%, transparent 80%)'
           }} 
      />
      {isDark && (
        <div className="fixed inset-0 pointer-events-none z-0"
             style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255, 42, 42, 0.03), transparent 60%)' }} />
      )}

      {/* Unified Top Navigation Bar */}
      <div className={`absolute top-0 left-0 right-0 p-4 sm:p-6 flex items-center justify-between z-50 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Theme Indicator */}
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--bg-panel)] border border-[var(--panel-border)] text-[var(--text-muted)] transition-all duration-500 shadow-sm backdrop-blur-sm">
          {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </div>

        {/* Language Toggle */}
        <button onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
          className="flex items-center gap-2 px-5 py-2.5 btn-system bg-[var(--bg-panel)] border border-[var(--panel-border)] text-[var(--text-primary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all shadow-sm backdrop-blur-sm">
          <Globe className="w-4 h-4" />
          <span className="text-xs font-bold tracking-wide">{lang === 'en' ? 'العربية' : 'EN'}</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-md lg:max-w-5xl relative z-10 animate-fade-up pt-20 sm:pt-16 lg:pt-0">

        {/* Desktop Layout */}
        <div className="hidden lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center">
          
          {/* Left Text Column */}
          <div className={`text-center ${isRTL ? 'lg:text-right' : 'lg:text-left'} space-y-8 flex flex-col items-center ${isRTL ? 'lg:items-end' : 'lg:items-start'}`}>
            <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
              <Image src="/login.png" alt="Auto City Qatar" width={300} height={150} className="object-contain" priority />
            </Link>
            
            <div className={`flex flex-col items-center ${isRTL ? 'lg:items-end' : 'lg:items-start'}`}>
              <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-[var(--panel-border)] bg-[var(--bg-panel)] mb-6">
                <span className="metric-dot"></span>
                <span className="text-xs font-mono uppercase tracking-widest text-[var(--accent-primary)]">{t.title}</span>
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-bold mb-4 tracking-tighter text-[var(--text-primary)]">
                {t.subtitle}
              </h1>
              
              <p className={`text-sm max-w-md font-mono mt-6 py-1 text-[var(--text-muted)] ${isRTL ? 'border-r-2 border-[var(--accent-primary)] pr-4' : 'border-l-2 border-[var(--accent-primary)] pl-4'}`}>
                {t.support}
              </p>
            </div>
          </div>

          {/* Right Desktop Dashboard Card */}
          <div className="dash-panel p-10 w-full max-w-lg mx-auto">
            <div className={`mb-8 flex items-center justify-between border-b border-[var(--panel-border)] pb-4 ${isRTL ? 'flex-row-reverse text-right' : 'flex-row text-left'}`}>
              <div>
                <h2 className="text-2xl font-bold mb-1 text-[var(--text-primary)]">{t.signIn}</h2>
                <p className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)]">{t.signInDesc}</p>
              </div>
              <Shield className="w-8 h-8 text-[var(--accent-primary)] opacity-80" />
            </div>
            
            {error && (
              <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 bg-[var(--error-bg)] border border-[var(--error-border)] ${isRTL ? 'flex-row-reverse text-right' : 'flex-row text-left'}`}>
                <div className="w-2 h-2 mt-1.5 rounded-full bg-[var(--accent-primary)] shadow-[0_0_8px_var(--accent-primary)] shrink-0"></div>
                <p className="text-[var(--accent-primary)] text-sm font-medium">{error}</p>
              </div>
            )}
            
            <LoginForm prefix="desktop" t={t} isRTL={isRTL} identifier={identifier} setIdentifier={setIdentifier} password={password} setPassword={setPassword} showPassword={showPassword} setShowPassword={setShowPassword} rememberMe={rememberMe} setRememberMe={setRememberMe} setShowForgotPassword={setShowForgotPassword} handleSubmit={handleSubmit} loading={loading} />
            
            <div className="mt-8 pt-6 border-t border-[var(--panel-border)] text-center">
              <Link href="/" className={`inline-flex items-center justify-center gap-2 text-xs font-mono tracking-widest uppercase text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                {t.backToHome}
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="lg:hidden flex flex-col items-center w-full">
          <div className="text-center mb-10 flex flex-col items-center">
            <Link href="/" className="inline-block mb-8 hover:opacity-80 transition-opacity">
              <Image src="/login.png" alt="Auto City Qatar" width={240} height={120} className="object-contain" priority />
            </Link>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--panel-border)] bg-[var(--bg-panel)] mb-4">
              <span className="metric-dot"></span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--accent-primary)]">{t.title}</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tighter text-[var(--text-primary)]">
              {t.subtitle}
            </h1>
          </div>

          <div className="dash-panel p-8 w-full max-w-sm mx-auto">
            <div className={`mb-8 flex items-center justify-between border-b border-[var(--panel-border)] pb-4 ${isRTL ? 'flex-row-reverse text-right' : 'flex-row text-left'}`}>
              <div>
                <h2 className="text-xl font-bold mb-1 text-[var(--text-primary)]">{t.signIn}</h2>
                <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)]">{t.signInDesc}</p>
              </div>
              <Shield className="w-6 h-6 text-[var(--accent-primary)] opacity-80" />
            </div>

            {error && (
              <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 bg-[var(--error-bg)] border border-[var(--error-border)] ${isRTL ? 'flex-row-reverse text-right' : 'flex-row text-left'}`}>
                <div className="w-2 h-2 mt-1.5 rounded-full bg-[var(--accent-primary)] shadow-[0_0_8px_var(--accent-primary)] shrink-0"></div>
                <p className="text-[var(--accent-primary)] text-sm font-medium">{error}</p>
              </div>
            )}

            <LoginForm prefix="mobile" t={t} isRTL={isRTL} identifier={identifier} setIdentifier={setIdentifier} password={password} setPassword={setPassword} showPassword={showPassword} setShowPassword={setShowPassword} rememberMe={rememberMe} setRememberMe={setRememberMe} setShowForgotPassword={setShowForgotPassword} handleSubmit={handleSubmit} loading={loading} />

            <div className="mt-8 pt-6 border-t border-[var(--panel-border)] text-center">
              <Link href="/" className={`inline-flex items-center justify-center gap-2 text-[10px] font-mono tracking-widest uppercase text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                <ArrowLeft className={`w-3 h-3 ${isRTL ? 'rotate-180' : ''}`} />
                {t.backToHome}
              </Link>
            </div>
          </div>
          <p className="text-center text-[10px] font-mono uppercase tracking-widest mt-8 text-[var(--text-muted)] max-w-xs mx-auto">
            {t.support}
          </p>
        </div>
      </div>

      {showForgotPassword && (
        <ForgotPasswordModal onClose={() => setShowForgotPassword(false)} lang={lang} t={t} isRTL={isRTL} />
      )}
    </div>
  );
}

function ForgotPasswordModal({ onClose, lang, t, isRTL }: any) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClose(); }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md dash-panel p-8 animate-fade-up">
        {!success ? (
          <>
            <div className={`mb-8 border-b border-[var(--panel-border)] pb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
              <h3 className="text-xl font-bold mb-1 text-[var(--text-primary)]">{t.resetPassword}</h3>
              <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)]">{t.resetDesc}</p>
            </div>
            
            {error && (
              <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 bg-[var(--error-bg)] border border-[var(--error-border)] ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                <div className="w-2 h-2 mt-1.5 rounded-full bg-[var(--accent-primary)] shadow-[0_0_8px_var(--accent-primary)] shrink-0"></div>
                <p className="text-[var(--accent-primary)] text-sm font-medium">{error}</p>
              </div>
            )}
            
            <div className="space-y-6">
              <div>
                <label htmlFor="reset-email" className={`block text-xs font-mono tracking-widest uppercase mb-2 text-[var(--text-muted)] ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.emailAddress}
                </label>
                <div className="relative group">
                  <Mail className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 transition-colors text-[var(--text-dark)] group-focus-within:text-[var(--accent-primary)]`} />
                  <input id="reset-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()} placeholder={t.emailPlaceholder} required dir="ltr"
                    className={`input-tech ${isRTL ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'} w-full py-4 rounded-xl focus:outline-none text-sm font-medium`}
                  />
                </div>
              </div>
              
              <div className={`flex gap-4 pt-4 border-t border-[var(--panel-border)] ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                <button type="button" onClick={onClose}
                  className="flex-1 py-4 rounded-full font-bold text-xs tracking-widest uppercase transition-all bg-transparent border border-[var(--panel-border)] text-[var(--text-primary)] hover:bg-[var(--panel-border)]">
                  {t.cancel}
                </button>
                <button onClick={handleSubmit} disabled={loading}
                  className="flex-1 py-4 btn-system btn-primary text-white font-bold text-xs tracking-widest disabled:opacity-50">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t.sending}
                    </span>
                  ) : t.sendResetLink}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="text-center mb-8 flex flex-col items-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#32d74b]/10 mb-6 border border-[#32d74b]/20">
                <svg className="w-8 h-8 text-[#32d74b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2 text-[var(--text-primary)]">{t.checkEmail}</h3>
              <p className="text-sm mb-6 text-[var(--text-muted)] max-w-xs">{t.resetSent}</p>
              <p className="font-mono text-sm mb-6 px-4 py-3 rounded-xl border border-[var(--panel-border)] bg-[var(--input-bg)] text-glow-accent dir-ltr w-full break-all" dir="ltr">
                {email}
              </p>
              <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] max-w-xs">{t.spamNote}</p>
            </div>
            <button onClick={onClose}
              className="w-full py-4 btn-system border border-[var(--panel-border)] bg-[var(--bg-panel)] hover:border-[var(--accent-primary)] text-[var(--text-primary)] hover:text-[var(--accent-primary)] font-bold text-xs tracking-widest uppercase transition-all">
              {t.backToLogin}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
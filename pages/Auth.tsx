import React, { useEffect, useMemo, useState } from 'react';
import { Apple, ArrowLeft, Facebook, KeyRound, LogIn, Mail, Chrome, UserPlus } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { User } from '../types';
import {
  authenticateWithPasskey,
  loginUser,
  loginWithOAuth,
  OAuthProvider,
  registerUser,
  resendEmailVerification,
  sendPasswordResetEmail,
  updateCurrentPassword,
} from '../services/authService';

interface AuthProps {
  user: User | null;
  onAuthSuccess: (user: User) => void;
}

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset';
type AuthMethod = 'passkey' | OAuthProvider;
type PendingAction = 'idle' | 'login' | 'signup' | 'forgot' | 'reset' | AuthMethod;

const parseMode = (value: string | null): AuthMode => {
  if (value === 'signup' || value === 'forgot' || value === 'reset') {
    return value;
  }

  return 'login';
};

const Auth: React.FC<AuthProps> = ({ user, onAuthSuccess }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const requestedMode = parseMode(searchParams.get('mode'));
  const redirectPath = useMemo(() => searchParams.get('redirect') || '/dashboard', [searchParams]);
  const passkeyEnabled = (import.meta.env.VITE_ENABLE_PASSKEY || 'false') === 'true';
  const googleEnabled = (import.meta.env.VITE_AUTH_GOOGLE || 'true') === 'true';
  const facebookEnabled = (import.meta.env.VITE_AUTH_FACEBOOK || 'false') === 'true';
  const appleEnabled = (import.meta.env.VITE_AUTH_APPLE || 'false') === 'true';

  const [mode, setMode] = useState<AuthMode>(requestedMode);
  const [pendingAction, setPendingAction] = useState<PendingAction>('idle');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetForm, setResetForm] = useState({ password: '', confirmPassword: '' });

  useEffect(() => {
    setMode(requestedMode);
  }, [requestedMode]);

  useEffect(() => {
    if (user && mode !== 'reset') {
      navigate(redirectPath, { replace: true });
    }
  }, [user, mode, redirectPath, navigate]);

  const isBusy = pendingAction !== 'idle';
  const oauthMethods = [
    appleEnabled
      ? {
          key: 'apple' as OAuthProvider,
          label: 'Continuer avec Apple',
          icon: <Apple size={24} className="text-slate-900" />,
        }
      : null,
    facebookEnabled
      ? {
          key: 'facebook' as OAuthProvider,
          label: 'Continuer avec Facebook',
          icon: <Facebook size={24} className="text-[#1877F2]" />,
        }
      : null,
    googleEnabled
      ? {
          key: 'google' as OAuthProvider,
          label: 'Continuer avec Google',
          icon: <Chrome size={24} className="text-[#EA4335]" />,
        }
      : null,
  ].filter((item): item is { key: OAuthProvider; label: string; icon: React.ReactNode } => item !== null);

  const updateMode = (nextMode: AuthMode) => {
    const params = new URLSearchParams(searchParams);
    params.set('mode', nextMode);
    setSearchParams(params, { replace: true });
    setError('');
    setInfo('');
  };

  const setModeWithInfo = (nextMode: AuthMode, message: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('mode', nextMode);
    setSearchParams(params, { replace: true });
    setError('');
    setInfo(message);
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setPendingAction('login');
    setError('');
    setInfo('');

    const result = await loginUser(loginForm.email, loginForm.password);
    if (!result.ok || !result.user) {
      setError(result.error || 'Connexion impossible.');
      setPendingAction('idle');
      return;
    }

    onAuthSuccess(result.user);
    navigate(redirectPath, { replace: true });
    setPendingAction('idle');
  };

  const handleSignup = async (event: React.FormEvent) => {
    event.preventDefault();
    setPendingAction('signup');
    setError('');
    setInfo('');

    if (signupForm.password !== signupForm.confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      setPendingAction('idle');
      return;
    }

    const result = await registerUser({
      name: signupForm.name,
      email: signupForm.email,
      password: signupForm.password,
    });

    if (!result.ok) {
      setError(result.error || 'Inscription impossible.');
      setPendingAction('idle');
      return;
    }

    if (result.requiresEmailVerification) {
      setVerificationEmail(signupForm.email.trim());
      setModeWithInfo('login', result.notice || 'Validez votre email avant de vous connecter.');
      setPendingAction('idle');
      return;
    }

    if (result.user) {
      onAuthSuccess(result.user);
      navigate(redirectPath, { replace: true });
      setPendingAction('idle');
      return;
    }

    if (result.notice) {
      setInfo(result.notice);
    }

    setPendingAction('idle');
  };

  const handleForgotPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPendingAction('forgot');
    setError('');
    setInfo('');

    const result = await sendPasswordResetEmail(forgotEmail);
    if (!result.ok) {
      setError(result.error || "Impossible d'envoyer l'email de reinitialisation.");
      setPendingAction('idle');
      return;
    }

    setInfo(result.notice || 'Email de reinitialisation envoye.');
    setPendingAction('idle');
  };

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPendingAction('reset');
    setError('');
    setInfo('');

    if (resetForm.password !== resetForm.confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      setPendingAction('idle');
      return;
    }

    const result = await updateCurrentPassword(resetForm.password);
    if (!result.ok) {
      setError(result.error || 'Impossible de modifier le mot de passe.');
      setPendingAction('idle');
      return;
    }

    setModeWithInfo('login', result.notice || 'Mot de passe mis a jour. Vous pouvez vous connecter.');
    setResetForm({ password: '', confirmPassword: '' });
    setPendingAction('idle');
  };

  const handleOAuth = async (provider: OAuthProvider) => {
    setPendingAction(provider);
    setError('');
    setInfo('');

    const result = await loginWithOAuth(provider, redirectPath);
    if (!result.ok) {
      setError(result.error || `Connexion ${provider} impossible.`);
      setPendingAction('idle');
    }
  };

  const handlePasskey = async () => {
    setPendingAction('passkey');
    setError('');
    setInfo('');

    const result = await authenticateWithPasskey();
    if (!result.ok) {
      setError(result.error || 'Connexion passkey impossible.');
      setPendingAction('idle');
      return;
    }

    if (result.notice) {
      setInfo(result.notice);
    }

    if (result.user) {
      onAuthSuccess(result.user);
      navigate(redirectPath, { replace: true });
    }

    setPendingAction('idle');
  };

  const handleResendVerification = async () => {
    const emailToUse = verificationEmail || loginForm.email || signupForm.email;
    if (!emailToUse.trim()) {
      setError("Saisissez d'abord votre email.");
      return;
    }

    setPendingAction('idle');
    setError('');

    const result = await resendEmailVerification(emailToUse);
    if (!result.ok) {
      setError(result.error || "Impossible de renvoyer l'email de verification.");
      return;
    }

    setInfo(result.notice || 'Email de verification renvoye.');
  };

  return (
    <section className="min-h-screen bg-stone-50 pt-28 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="rounded-3xl border border-stone-300 bg-white p-8 md:p-10 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] font-bold text-blue-700 mb-3">Espace membre</p>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-5">
              Accedez a votre compte LoueFacile
            </h1>
            <p className="text-slate-600 text-lg leading-relaxed mb-8">
              Connectez-vous pour debloquer les contacts, suivre vos favoris et gerer votre pass.
            </p>
            <ul className="space-y-3 text-sm text-slate-700">
              <li>Conditions visibles avant visite</li>
              <li>Deblocage controle des coordonnees</li>
              <li>Historique des annonces et suivi personnel</li>
            </ul>
            <Link to="/search" className="inline-block mt-8 text-blue-700 font-bold hover:text-blue-800 transition-colors">
              Continuer sans compte
            </Link>
          </div>

          <div className="rounded-3xl border border-stone-300 bg-white p-6 md:p-8 shadow-sm">
            <div className="flex rounded-2xl bg-stone-100 p-1 mb-6">
              <button
                onClick={() => updateMode('login')}
                disabled={isBusy}
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
                  mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                Connexion
              </button>
              <button
                onClick={() => updateMode('signup')}
                disabled={isBusy}
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
                  mode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                Inscription
              </button>
            </div>

            {(mode === 'forgot' || mode === 'reset') && (
              <button
                onClick={() => updateMode('login')}
                className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:text-blue-800 transition-colors"
              >
                <ArrowLeft size={16} />
                Retour a la connexion
              </button>
            )}

            {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

            {info && (
              <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">
                {info}
                {verificationEmail && mode === 'login' && (
                  <button onClick={handleResendVerification} className="ml-2 underline font-bold hover:text-blue-900">
                    Renvoyer l'email
                  </button>
                )}
              </div>
            )}

            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
                  <input
                    type="email"
                    required
                    value={loginForm.email}
                    onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })}
                    className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="vous@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Mot de passe</label>
                  <input
                    type="password"
                    required
                    value={loginForm.password}
                    onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
                    className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="Votre mot de passe"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => updateMode('forgot')}
                    className="text-sm font-bold text-blue-700 hover:text-blue-800 transition-colors"
                  >
                    Mot de passe oublie ?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isBusy}
                  className="w-full rounded-xl bg-blue-700 text-white font-extrabold py-3.5 hover:bg-blue-800 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                >
                  <LogIn size={18} />
                  Se connecter
                </button>
              </form>
            )}

            {mode === 'signup' && (
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Nom complet</label>
                  <input
                    type="text"
                    required
                    value={signupForm.name}
                    onChange={(event) => setSignupForm({ ...signupForm, name: event.target.value })}
                    className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="Ex: Ayao Petogbo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
                  <input
                    type="email"
                    required
                    value={signupForm.email}
                    onChange={(event) => setSignupForm({ ...signupForm, email: event.target.value })}
                    className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="vous@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Mot de passe</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={signupForm.password}
                    onChange={(event) => setSignupForm({ ...signupForm, password: event.target.value })}
                    className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="6 caracteres minimum"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Confirmer le mot de passe</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={signupForm.confirmPassword}
                    onChange={(event) => setSignupForm({ ...signupForm, confirmPassword: event.target.value })}
                    className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="Repetez le mot de passe"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isBusy}
                  className="w-full rounded-xl bg-blue-700 text-white font-extrabold py-3.5 hover:bg-blue-800 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                >
                  <UserPlus size={18} />
                  Creer mon compte
                </button>
              </form>
            )}

            {mode === 'forgot' && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                  Saisissez votre email pour recevoir le lien de reinitialisation.
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(event) => setForgotEmail(event.target.value)}
                    className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="vous@email.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="w-full rounded-xl bg-blue-700 text-white font-extrabold py-3.5 hover:bg-blue-800 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                >
                  <Mail size={18} />
                  Envoyer le lien de reset
                </button>
              </form>
            )}

            {mode === 'reset' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                  Definissez un nouveau mot de passe pour votre compte.
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Nouveau mot de passe</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={resetForm.password}
                    onChange={(event) => setResetForm({ ...resetForm, password: event.target.value })}
                    className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="6 caracteres minimum"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Confirmer le mot de passe</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={resetForm.confirmPassword}
                    onChange={(event) => setResetForm({ ...resetForm, confirmPassword: event.target.value })}
                    className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="Repetez le nouveau mot de passe"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="w-full rounded-xl bg-blue-700 text-white font-extrabold py-3.5 hover:bg-blue-800 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                >
                  <KeyRound size={18} />
                  Mettre a jour mon mot de passe
                </button>
              </form>
            )}

            {(mode === 'login' || mode === 'signup') && (
              <>
                <div className="my-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-stone-200" />
                  <span className="text-sm font-semibold text-slate-500">or</span>
                  <div className="h-px flex-1 bg-stone-200" />
                </div>

                <div className="space-y-3">
                  {passkeyEnabled && (
                    <>
                      <button
                        type="button"
                        onClick={() => void handlePasskey()}
                        disabled={isBusy}
                        className="relative w-full rounded-2xl border border-stone-200 bg-stone-100 px-4 py-4 font-semibold text-slate-800 hover:border-stone-300 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        <KeyRound size={18} className="text-slate-600" />
                        <span>{pendingAction === 'passkey' ? "Verification de la cle d'acces..." : "Se connecter avec une cle d'acces"}</span>
                      </button>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Cle d'acces Supabase: activez-la d'abord dans votre dashboard, puis utilisez-la comme verification rapide.
                      </p>
                    </>
                  )}

                  {oauthMethods.length > 0 && (
                    <div
                      className="grid gap-3"
                      style={{ gridTemplateColumns: `repeat(${Math.min(3, oauthMethods.length)}, minmax(0, 1fr))` }}
                    >
                      {oauthMethods.map((method) => (
                        <React.Fragment key={method.key}>
                          <ProviderIconButton
                            isLoading={pendingAction === method.key}
                            onClick={() => void handleOAuth(method.key)}
                            disabled={isBusy}
                            label={method.label}
                          >
                            {method.icon}
                          </ProviderIconButton>
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

const ProviderIconButton = ({
  label,
  children,
  onClick,
  isLoading,
  disabled,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  isLoading: boolean;
  disabled: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    disabled={disabled}
    className="relative h-14 rounded-2xl border border-stone-200 bg-stone-100 hover:border-stone-300 transition-colors flex items-center justify-center disabled:opacity-60"
  >
    {isLoading ? (
      <span className="text-xs font-bold text-slate-500">...</span>
    ) : (
      <span>{children}</span>
    )}
  </button>
);

export default Auth;

import { AuthChangeEvent, Provider, Session, User as SupabaseUser } from '@supabase/supabase-js';
import { User } from '../types';
import { supabase } from './supabaseClient';

interface ProfileRow {
  id: string;
  full_name: string | null;
  has_active_pass: boolean | null;
  pass_expiry: string | null;
  daily_views_left: number | null;
}

interface AuthPayload {
  name: string;
  email: string;
  password: string;
}

export interface AuthResult {
  ok: boolean;
  user?: User;
  error?: string;
  notice?: string;
  requiresEmailVerification?: boolean;
}

export type OAuthProvider = Extract<Provider, 'google' | 'facebook' | 'apple'>;

const MISSING_CONFIG_MESSAGE = "Supabase n'est pas configure. Renseignez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.";

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const PASSKEY_ENABLED = (import.meta.env.VITE_ENABLE_PASSKEY || 'false') === 'true';

const supportsPasskey = (): boolean =>
  PASSKEY_ENABLED &&
  typeof window !== 'undefined' &&
  typeof PublicKeyCredential !== 'undefined' &&
  typeof navigator !== 'undefined' &&
  Boolean(navigator.credentials?.get) &&
  Boolean(navigator.credentials?.create);

const parseProfile = (profile: ProfileRow | null, authUser: SupabaseUser): User => {
  const fallbackName = (authUser.user_metadata?.name as string | undefined) || authUser.email?.split('@')[0] || 'Utilisateur';

  return {
    id: authUser.id,
    name: profile?.full_name?.trim() || fallbackName,
    email: authUser.email || '',
    hasActivePass: Boolean(profile?.has_active_pass),
    passExpiry: profile?.pass_expiry || undefined,
    dailyViewsLeft: Math.max(0, Number(profile?.daily_views_left ?? 0)),
  };
};

const getAppBaseUrl = (): string => {
  if (typeof window === 'undefined') {
    return '';
  }

  return `${window.location.origin}${window.location.pathname}`;
};

const buildHashRedirect = (hashPath: string): string => {
  const base = getAppBaseUrl();
  const normalized = hashPath.startsWith('/') ? hashPath : `/${hashPath}`;
  return `${base}#${normalized}`;
};

const fetchProfile = async (userId: string): Promise<ProfileRow | null> => {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, has_active_pass, pass_expiry, daily_views_left')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    return null;
  }

  return (data as ProfileRow | null) || null;
};

const upsertProfile = async (authUser: SupabaseUser, preferredName?: string): Promise<ProfileRow | null> => {
  if (!supabase) {
    return null;
  }

  const profileName =
    preferredName?.trim() || (authUser.user_metadata?.name as string | undefined)?.trim() || authUser.email?.split('@')[0] || 'Utilisateur';

  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: authUser.id,
        full_name: profileName,
      },
      { onConflict: 'id' },
    )
    .select('id, full_name, has_active_pass, pass_expiry, daily_views_left')
    .single();

  if (error) {
    return null;
  }

  return (data as ProfileRow | null) || null;
};

const ensureProfileAndMapUser = async (authUser: SupabaseUser, preferredName?: string): Promise<User> => {
  const existingProfile = await fetchProfile(authUser.id);
  if (existingProfile) {
    return parseProfile(existingProfile, authUser);
  }

  const createdProfile = await upsertProfile(authUser, preferredName);
  return parseProfile(createdProfile, authUser);
};

const getSessionUser = (session: Session | null): SupabaseUser | null => session?.user || null;

const getVerifiedPasskeyFactor = async (): Promise<{ id: string } | null> => {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error || !data) {
    return null;
  }

  const factor = data.all.find((item) => item.factor_type === 'webauthn' && item.status === 'verified');
  if (!factor) {
    return null;
  }

  return { id: factor.id };
};

export const getCurrentUser = async (): Promise<User | null> => {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    return null;
  }

  const sessionUser = getSessionUser(data.session);
  if (!sessionUser) {
    return null;
  }

  return ensureProfileAndMapUser(sessionUser);
};

export const registerUser = async ({ name, email, password }: AuthPayload): Promise<AuthResult> => {
  if (!supabase) {
    return { ok: false, error: MISSING_CONFIG_MESSAGE };
  }

  const cleanName = name.trim();
  const cleanEmail = normalizeEmail(email);
  const cleanPassword = password.trim();

  if (!cleanName || !cleanEmail || !cleanPassword) {
    return { ok: false, error: 'Tous les champs sont obligatoires.' };
  }

  if (cleanPassword.length < 6) {
    return { ok: false, error: 'Le mot de passe doit contenir au moins 6 caracteres.' };
  }

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password: cleanPassword,
    options: {
      data: { name: cleanName },
      emailRedirectTo: buildHashRedirect('/auth?mode=login'),
    },
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data.user) {
    return { ok: false, error: "Impossible de creer le compte pour l'instant." };
  }

  if (!data.session) {
    return {
      ok: true,
      notice: 'Compte cree. Verifiez votre email pour activer la connexion.',
      requiresEmailVerification: true,
    };
  }

  const user = await ensureProfileAndMapUser(data.user, cleanName);
  return { ok: true, user };
};

export const loginUser = async (email: string, password: string): Promise<AuthResult> => {
  if (!supabase) {
    return { ok: false, error: MISSING_CONFIG_MESSAGE };
  }

  const cleanEmail = normalizeEmail(email);
  const cleanPassword = password.trim();

  if (!cleanEmail || !cleanPassword) {
    return { ok: false, error: 'Email et mot de passe requis.' };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password: cleanPassword,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data.user) {
    return { ok: false, error: 'Connexion impossible.' };
  }

  const user = await ensureProfileAndMapUser(data.user);
  return { ok: true, user };
};

export const logoutUser = async (): Promise<void> => {
  if (!supabase) {
    return;
  }

  await supabase.auth.signOut();
};

export const updateUser = async (userId: string, updates: Partial<User>): Promise<User | null> => {
  if (!supabase) {
    return null;
  }

  const nextProfilePayload: Record<string, string | number | boolean | null> = {};
  if (typeof updates.name === 'string') {
    nextProfilePayload.full_name = updates.name;
  }
  if (typeof updates.hasActivePass === 'boolean') {
    nextProfilePayload.has_active_pass = updates.hasActivePass;
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'passExpiry')) {
    nextProfilePayload.pass_expiry = updates.passExpiry || null;
  }
  if (typeof updates.dailyViewsLeft === 'number') {
    nextProfilePayload.daily_views_left = updates.dailyViewsLeft;
  }

  if (Object.keys(nextProfilePayload).length === 0) {
    return getCurrentUser();
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(nextProfilePayload)
    .eq('id', userId)
    .select('id, full_name, has_active_pass, pass_expiry, daily_views_left')
    .single();

  if (error) {
    return null;
  }

  const { data: authData } = await supabase.auth.getUser();
  const authUser = authData.user;
  if (!authUser || authUser.id !== userId) {
    return null;
  }

  return parseProfile((data as ProfileRow) || null, authUser);
};

export const sendPasswordResetEmail = async (email: string): Promise<AuthResult> => {
  if (!supabase) {
    return { ok: false, error: MISSING_CONFIG_MESSAGE };
  }

  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) {
    return { ok: false, error: 'Veuillez saisir un email valide.' };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo: buildHashRedirect('/auth?mode=reset'),
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    notice: 'Email de reinitialisation envoye. Ouvrez le lien recu pour definir un nouveau mot de passe.',
  };
};

export const updateCurrentPassword = async (password: string): Promise<AuthResult> => {
  if (!supabase) {
    return { ok: false, error: MISSING_CONFIG_MESSAGE };
  }

  const cleanPassword = password.trim();
  if (cleanPassword.length < 6) {
    return { ok: false, error: 'Le mot de passe doit contenir au moins 6 caracteres.' };
  }

  const { error } = await supabase.auth.updateUser({ password: cleanPassword });
  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, notice: 'Mot de passe mis a jour avec succes.' };
};

export const resendEmailVerification = async (email: string): Promise<AuthResult> => {
  if (!supabase) {
    return { ok: false, error: MISSING_CONFIG_MESSAGE };
  }

  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) {
    return { ok: false, error: 'Veuillez saisir un email valide.' };
  }

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: cleanEmail,
    options: { emailRedirectTo: buildHashRedirect('/auth?mode=login') },
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, notice: 'Email de verification renvoye.' };
};

export const loginWithOAuth = async (provider: OAuthProvider, redirectPath = '/dashboard'): Promise<AuthResult> => {
  if (!supabase) {
    return { ok: false, error: MISSING_CONFIG_MESSAGE };
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: buildHashRedirect(`/auth?mode=login&redirect=${encodeURIComponent(redirectPath)}`),
    },
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
};

export const registerPasskey = async (friendlyName?: string): Promise<AuthResult> => {
  if (!supabase) {
    return { ok: false, error: MISSING_CONFIG_MESSAGE };
  }

  if (!supportsPasskey()) {
    return { ok: false, error: "Votre navigateur n'est pas compatible avec les passkeys." };
  }

  const passkeyName = friendlyName?.trim() || `Passkey ${new Date().toLocaleDateString('fr-FR')}`;
  const { error } = await supabase.auth.mfa.webauthn.register({ friendlyName: passkeyName });

  if (error) {
    return { ok: false, error: error.message };
  }

  const currentUser = await getCurrentUser();
  return {
    ok: true,
    user: currentUser || undefined,
    notice: 'Passkey activee. Vous pouvez maintenant valider vos connexions plus rapidement.',
  };
};

export const authenticateWithPasskey = async (): Promise<AuthResult> => {
  if (!supabase) {
    return { ok: false, error: MISSING_CONFIG_MESSAGE };
  }

  if (!supportsPasskey()) {
    return { ok: false, error: "Votre navigateur n'est pas compatible avec les passkeys." };
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    return { ok: false, error: sessionError.message };
  }

  if (!sessionData.session) {
    return {
      ok: false,
      error:
        "La connexion par passkey Supabase fonctionne comme 2e facteur. Connectez-vous d'abord puis activez votre passkey dans le dashboard.",
    };
  }

  const factor = await getVerifiedPasskeyFactor();
  if (!factor) {
    return { ok: false, error: "Aucune passkey active pour ce compte. Activez-la depuis votre dashboard." };
  }

  const { error } = await supabase.auth.mfa.webauthn.authenticate({ factorId: factor.id });
  if (error) {
    return { ok: false, error: error.message };
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { ok: false, error: 'Passkey validee, mais session utilisateur introuvable.' };
  }

  return { ok: true, user: currentUser, notice: 'Verification passkey reussie.' };
};

export const subscribeToAuthChanges = (
  onChange: (user: User | null, event: AuthChangeEvent) => void,
): { unsubscribe: () => void } => {
  if (!supabase) {
    return { unsubscribe: () => {} };
  }

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    const sessionUser = getSessionUser(session);

    if (!sessionUser) {
      onChange(null, event);
      return;
    }

    void ensureProfileAndMapUser(sessionUser)
      .then((profileUser) => onChange(profileUser, event))
      .catch(() => onChange(parseProfile(null, sessionUser), event));
  });

  return data.subscription;
};

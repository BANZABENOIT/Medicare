import React, { useState, useEffect } from 'react';
import {
  Lock,
  Mail,
  Shield,
  Stethoscope,
  UserCheck,
  FlaskConical,
  Pill,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Server,
  KeyRound,
  X
} from 'lucide-react';
import { apiService, djangoApi, getApiConfig, setBackendActive } from '../../services/apiService';
import { User, ClinicSettings, UserRole } from '../../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  settings?: ClinicSettings;
  presetEmail?: string;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  settings,
  presetEmail
}) => {
  const [email, setEmail] = useState(presetEmail || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loginMode, setLoginMode] = useState<'form' | 'demo'>('form');

  // Synchronise le champ email lorsqu'un email présélectionné est fourni (compte backend).
  useEffect(() => {
    if (presetEmail && presetEmail !== email) {
      setEmail(presetEmail);
    }
  }, [presetEmail]);

  if (!isOpen) return null;

  const quickProfiles: { role: UserRole; title: string; email: string; name: string; icon: any; color: string; badge: string }[] = [
    { role: 'admin', title: 'Administrateur', email: 'admin@medicare.bi', name: 'Dr. Sarah Miller (Direction)', icon: Shield, color: 'bg-purple-100 text-purple-700 hover:border-purple-300', badge: 'Gestion totale & Utilisateurs' },
    { role: 'doctor', title: 'Médecin Praticien', email: 'jean.dupont@medicare.bi', name: 'Dr. Jean Dupont', icon: Stethoscope, color: 'bg-blue-100 text-blue-700 hover:border-blue-300', badge: 'Consultations & DME' },
    { role: 'receptionist', title: 'Réception & Accueil', email: 'accueil@medicare.bi', name: 'Sophie Martin', icon: UserCheck, color: 'bg-indigo-100 text-indigo-700 hover:border-indigo-300', badge: 'Admissions & Rendez-vous' },
    { role: 'pharmacist', title: 'Pharmacien', email: 'pharma@medicare.bi', name: 'Dr. Marc Leroy', icon: Pill, color: 'bg-emerald-100 text-emerald-700 hover:border-emerald-300', badge: 'Délivrance & Stocks' },
    { role: 'lab_tech', title: 'Laborantin Biologiste', email: 'labo@medicare.bi', name: 'Claire Bernard', icon: FlaskConical, color: 'bg-amber-100 text-amber-700 hover:border-amber-300', badge: 'Analyses & Résultats' },
    { role: 'cashier', title: 'Caissier Facturation', email: 'caisse@medicare.bi', name: 'Thomas Petit', icon: CreditCard, color: 'bg-sky-100 text-sky-700 hover:border-sky-300', badge: 'Factures & Règlements' }
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    const trimmedEmail = email.trim().toLowerCase();
    const config = getApiConfig();

    // 1. If backend configured and online, attempt Django REST JWT login
    let loggedInUser: User | null = null;
    let usedBackend = false;

    try {
      if (config.baseUrl) {
        try {
          const res = await djangoApi.auth.login({
            email: trimmedEmail,
            username: trimmedEmail,
            password: password
          });
          if (res?.user) {
            loggedInUser = res.user;
            usedBackend = true;
          }
        } catch {
          // Backend indisponible, authentification locale
        }
      }

      // 2. Authentification locale si le backend n'est pas utilisé
      if (!loggedInUser) {
        const localUsers = apiService.users.getAll();
        const found = localUsers.find(
          u => (u.email && u.email.toLowerCase() === trimmedEmail) ||
               (u.nom && u.nom.toLowerCase() === trimmedEmail) ||
               (u.prenom && u.prenom.toLowerCase() === trimmedEmail) ||
               (u.role && u.role.toLowerCase() === trimmedEmail)
        );

        if (found) {
          loggedInUser = found;
        } else {
          // If entering generic email, create/assign role
          if (trimmedEmail.includes('admin')) {
            loggedInUser = localUsers.find(u => u.role === 'admin') || localUsers[0];
          } else if (trimmedEmail.includes('doc') || trimmedEmail.includes('medecin')) {
            loggedInUser = localUsers.find(u => u.role === 'doctor' || u.role === 'medecin') || localUsers[0];
          } else {
            // Default to first active user if found
            loggedInUser = localUsers[0];
          }
        }
      }

      setBackendActive(usedBackend);

      if (loggedInUser) {
        apiService.users.setCurrentUser(loggedInUser);
        onLoginSuccess(loggedInUser);
      } else {
        setErrorMessage('Identifiants incorrects ou compte introuvable.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erreur lors de la connexion.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (profile: typeof quickProfiles[0]) => {
    const localUsers = apiService.users.getAll();
    let match = localUsers.find(u => u.email.toLowerCase() === profile.email.toLowerCase() || u.role === profile.role);
    
    if (!match) {
      match = {
        id: `usr-${profile.role}-${Date.now()}`,
        nom: profile.name.split(' ').pop() || 'Utilisateur',
        prenom: profile.name.split(' ')[0] || 'Dr.',
        email: profile.email,
        role: profile.role,
        actif: true,
        date_creation: new Date().toISOString().split('T')[0],
        derniere_connexion: new Date().toISOString().split('T')[0]
      };
    }
    
    apiService.users.setCurrentUser(match);
    setBackendActive(false);
    onLoginSuccess(match);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Modal Header */}
        <div className="px-6 pt-6 pb-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 font-bold text-lg shadow-md shrink-0">
              MC
            </div>
            <div>
              <h2 className="text-lg font-bold">Connexion Espace Médical</h2>
              <p className="text-xs text-blue-100">
                {settings?.nom || 'MediCare Connect'} • Système de Santé Sécurisé
              </p>
            </div>
          </div>

          {/* Tab selector */}
          <div className="flex gap-2 mt-4 pt-2 border-t border-white/15">
            <button
              type="button"
              onClick={() => setLoginMode('form')}
              className={`flex-1 py-1.5 px-3 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                loginMode === 'form' ? 'bg-white text-blue-700 shadow-xs' : 'text-blue-100 hover:bg-white/10'
              }`}
            >
              Identifiants / Email
            </button>
            <button
              type="button"
              onClick={() => setLoginMode('demo')}
              className={`flex-1 py-1.5 px-3 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                loginMode === 'demo' ? 'bg-white text-blue-700 shadow-xs' : 'text-blue-100 hover:bg-white/10'
              }`}
            >
              ⚡ Accès rapide par rôle
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {loginMode === 'form' ? (
            <form onSubmit={handleLogin} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Identifiant ou Email Professionnel
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ex: admin@medicare.bi ou jean.dupont@medicare.bi"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Mot de Passe
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-[11px] text-blue-900 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-blue-800">
                  <Server className="w-3.5 h-3.5" />
                  <span>Accès aux comptes de démonstration</span>
                </div>
                <p className="text-blue-700">
                  Utilisez les identifiants ci-dessous pour découvrir les fonctionnalités de chaque profil selon votre rôle.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setLoginMode('demo')}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                >
                  Voir les comptes disponibles →
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-full font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <span>Connexion...</span>
                  ) : (
                    <>
                      <span>Se Connecter</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Sélectionnez votre profil pour accéder à l'espace correspondant :
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {quickProfiles.map((p) => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.email}
                      type="button"
                      onClick={() => handleQuickLogin(p)}
                      className={`p-3 rounded-2xl border border-slate-200 text-left transition-all cursor-pointer hover:shadow-md hover:bg-slate-50 flex items-start gap-2.5 ${p.color}`}
                    >
                      <div className="p-2 rounded-xl bg-white/90 shadow-xs shrink-0 mt-0.5">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs text-slate-900 truncate">{p.title}</div>
                        <div className="text-[11px] text-slate-600 truncate">{p.name}</div>
                        <span className="inline-block text-[9.5px] font-semibold text-slate-500 mt-0.5">
                          {p.badge}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Protection des données de santé (Loi n°1/10 du Burundi)</span>
          <span className="font-medium text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Système opérationnel
          </span>
        </div>

      </div>
    </div>
  );
};

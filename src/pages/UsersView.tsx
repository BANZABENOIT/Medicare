import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  Plus,
  Search,
  Lock,
  Mail,
  Phone,
  KeyRound,
  History,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Server,
  HardDrive,
  LogIn,
  Info
} from 'lucide-react';
import { apiService } from '../services/apiService';
import { djangoApi, getApiConfig, isBackendActive } from '../services/djangoApiClient';
import { toast } from '../components/ui/Toast';
import { User, AuditLog, UserRole, ClinicSettings } from '../types';

interface UsersViewProps {
  currentUser: User;
  onSwitchUser?: (user: User) => void;
  onRequireLogin?: (email?: string) => void;
  settings: ClinicSettings;
}

export const UsersView: React.FC<UsersViewProps> = ({
  currentUser,
  onSwitchUser,
  onRequireLogin,
  settings
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [backendUsers, setBackendUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'audit'>('users');
  const [searchTerm, setSearchTerm] = useState('');

  // New User Modal
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newUserData, setNewUserData] = useState({
    nom: '',
    prenom: '',
    email: '',
    password: '',
    role: 'medecin' as UserRole,
    specialite: '',
    telephone: '+257 70 00 00 00'
  });

  const loadData = () => {
    setUsers(apiService.users.getAll());
    setAuditLogs(apiService.audit.getAll());
  };

  // Charge les comptes distants enregistrés côté backend (si le serveur est joignable).
  const loadBackendUsers = async () => {
    if (!getApiConfig().baseUrl) {
      setBackendUsers([]);
      return;
    }
    try {
      const remote = await djangoApi.auth.list();
      // On ne conserve que les comptes backend absents de la liste locale (addition locale + distance).
      const localEmails = new Set(apiService.users.getAll().map((u) => u.email.toLowerCase()));
      setBackendUsers(remote.filter((u) => !localEmails.has(u.email.toLowerCase())));
    } catch {
      // Backend injoignable ou endpoint indisponible : on garde uniquement les comptes locaux.
      setBackendUsers([]);
    }
  };

  useEffect(() => {
    loadData();
    loadBackendUsers();
    const handleUpdate = () => {
      loadData();
      loadBackendUsers();
    };
    window.addEventListener('medicare_data_updated', handleUpdate);
    return () => window.removeEventListener('medicare_data_updated', handleUpdate);
  }, []);

  // Détecte si un compte affiché est un compte distant (backend) d'après son email.
  const backendEmailSet = new Set(backendUsers.map((u) => u.email.toLowerCase()));
  const isBackendAccount = (u: User): boolean => backendEmailSet.has(u.email.toLowerCase());

  const isAdmin = currentUser?.role === 'admin' || (currentUser?.role as string) === 'administrateur';

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error('Action non autorisée : La création d’utilisateurs est strictement réservée à l’Administrateur.');
      return;
    }
    if (!newUserData.nom || !newUserData.prenom || !newUserData.email || !newUserData.password) {
      toast.error('Veuillez renseigner le nom, le prénom, l’email et le mot de passe.');
      return;
    }

    const payload = {
      nom: newUserData.nom,
      prenom: newUserData.prenom,
      email: newUserData.email,
      role: newUserData.role,
      specialite: newUserData.specialite,
      telephone: newUserData.telephone,
      actif: true
    };

    const config = getApiConfig();
    let backendCreated = false;

    if (config.baseUrl) {
      try {
        await djangoApi.auth.register({
          email: newUserData.email,
          password: newUserData.password,
          nom: newUserData.nom,
          prenom: newUserData.prenom,
          role: newUserData.role,
          ...(newUserData.telephone && newUserData.telephone.trim() ? { telephone: newUserData.telephone } : {}),
          ...(newUserData.specialite && newUserData.specialite.trim() ? { specialite: newUserData.specialite } : {})
        });
        backendCreated = true;
      } catch (err: any) {
        const msg = (err && err.message) ? String(err.message) : '';
        const isNetworkError = /failed to fetch|network|load failed|fetch/i.test(msg);
        if (isNetworkError || !msg) {
          // Backend injoignable : repli sur le mode local (comportement d'origine)
        } else {
          // Le backend a répondu par une erreur métier (ex. email déjà utilisé, mot de passe invalide)
          toast.error(msg);
          setIsCreatingUser(false);
          return;
        }
      }
    }

    // Un compte créé côté serveur n'est pas dupliqué en local : il apparaît dans la
    // liste comme compte « Backend » et la connexion s'effectue avec les identifiants officiels.
    if (!backendCreated) {
      apiService.users.create(payload);
    }

    await loadData();
    await loadBackendUsers();

    if (backendCreated) {
      toast.success('Compte créé dans la base de données de l’établissement. L’utilisateur se connectera avec ses identifiants officiels.');
    }

    setIsCreatingUser(false);
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-purple-100 text-purple-800">Administrateur</span>;
      case 'medecin':
        return <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-teal-100 text-teal-800">Médecin Praticien</span>;
      case 'infirmier':
        return <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-blue-100 text-blue-800">Infirmier(ère)</span>;
      case 'receptionniste':
        return <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-amber-100 text-amber-800">Accueil & Admission</span>;
      case 'pharmacien':
        return <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800">Pharmacien</span>;
      case 'laborantin':
        return <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-rose-100 text-rose-800">Laborantin</span>;
      case 'caissier':
        return <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-indigo-100 text-indigo-800">Caissier</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-slate-100 text-slate-800">{role}</span>;
    }
  };

  // Regroupe les comptes locaux et distants (backend) pour l'affichage.
  const allUsers = [...users, ...backendUsers];

  const filteredUsers = allUsers.filter((u) => {
    const q = searchTerm.toLowerCase();
    return (
      u.nom.toLowerCase().includes(q) ||
      u.prenom.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  // Basculer vers un compte : un compte local se bascule sans modification des données locales ;
  // un compte backend renvoie vers la page de connexion (authentification officielle requise).
  const handleSwitch = (user: User) => {
    if (isBackendAccount(user)) {
      toast.info('Compte backend : veuillez vous connecter avec les identifiants de ce compte.');
      onRequireLogin?.(user.email);
      return;
    }
    onSwitchUser?.(user);
  };

  return (
    <div className="space-y-4">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-['Josefin_Sans']">
            Comptes Utilisateurs, Rôles (RBAC) & Audit
          </h1>
          <p className="text-xs text-slate-500">
            Gestion des habilitations selon le profil de santé et traçabilité des opérations
          </p>
        </div>

        {isAdmin ? (
          <button
            onClick={() => setIsCreatingUser(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Créer un Compte</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-medium">
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            <span>Création réservée à l'Administrateur</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'users' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Utilisateurs & Profils ({allUsers.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'audit' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Journal d’Audit & Sécurité ({auditLogs.length})</span>
        </button>
      </div>

      {/* TAB 1: USERS */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-700 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Deux catégories de comptes sont disponibles : les comptes de démonstration, dont les
              données sont enregistrées sur ce poste, et les comptes de l'établissement, hébergés sur
              le serveur central de gestion. La connexion à un compte de l'établissement requiert vos
              identifiants officiels transmis par la direction.
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par nom, rôle, email..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredUsers.map((user) => (
              <div key={user.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm">
                      {String(user.prenom.charAt(0) || '').toUpperCase()}{String(user.nom.charAt(0) || '').toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">
                        {String(user.prenom || '').toUpperCase()} {String(user.nom || '').toUpperCase()}
                      </h3>
                      <span className="text-[11px] text-slate-400">{user.email}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  {getRoleBadge(user.role)}
                  <div className="flex items-center gap-1.5">
                    {isBackendAccount(user) && (
                      <span className="px-2 py-0.5 rounded-full font-bold text-[9.5px] bg-blue-100 text-blue-800 flex items-center gap-1">
                        <Server className="w-3 h-3" />
                        Backend
                      </span>
                    )}
                    {!isBackendAccount(user) && (
                      <span className="px-2 py-0.5 rounded-full font-bold text-[9.5px] bg-slate-100 text-slate-600 flex items-center gap-1">
                        <HardDrive className="w-3 h-3" />
                        Local
                      </span>
                    )}
                    {user.specialite && (
                      <span className="text-xs text-slate-500 font-medium">{user.specialite}</span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">
                    Dernière connexion : {user.derniere_connexion || isBackendAccount(user) ? '—' : 'Aujourd’hui'}
                  </span>
                  {isBackendAccount(user) ? (
                    onRequireLogin && (
                      <button
                        onClick={() => handleSwitch(user)}
                        className="text-blue-700 font-bold hover:underline flex items-center gap-1"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        Se connecter
                      </button>
                    )
                  ) : (
                    onSwitchUser && (
                      <button
                        onClick={() => handleSwitch(user)}
                        className="text-teal-700 font-bold hover:underline"
                      >
                        Basculer
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT LOG */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date & Heure</th>
                  <th className="py-3 px-4">Utilisateur</th>
                  <th className="py-3 px-4">Module</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Adresse IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {log.date} • {log.heure}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {log.user_nom}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                        {log.module}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-teal-800">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {log.description}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {log.adresse_ip || '127.0.0.1'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* NEW USER MODAL */}
      {isCreatingUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-['Josefin_Sans']">
                  Créer un Compte Utilisateur
                </h3>
                <p className="text-xs text-slate-500">Attribution des privilèges d'accès</p>
              </div>
              <button
                onClick={() => setIsCreatingUser(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nom *</label>
                  <input
                    type="text"
                    required
                    value={newUserData.nom}
                    onChange={(e) => setNewUserData({ ...newUserData, nom: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Prénom *</label>
                  <input
                    type="text"
                    required
                    value={newUserData.prenom}
                    onChange={(e) => setNewUserData({ ...newUserData, prenom: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Email Professionnel *</label>
                <input
                  type="email"
                  required
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  placeholder="nom.prenom@medicare.bi"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Mot de passe *</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={newUserData.password}
                    onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                    placeholder="Mot de passe de connexion"
                    className="w-full px-3 py-2 pl-9 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                  <KeyRound className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Rôle dans l’Établissement *</label>
                <select
                  value={newUserData.role}
                  onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-teal-800"
                >
                  <option value="medecin">Médecin Praticien</option>
                  <option value="infirmier">Infirmier(ère)</option>
                  <option value="receptionniste">Accueil / Admission</option>
                  <option value="pharmacien">Pharmacien</option>
                  <option value="laborantin">Laborantin</option>
                  <option value="caissier">Caissier / Facturation</option>
                  <option value="admin">Administrateur Système</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Spécialité (si médecin/soignant)</label>
                <input
                  type="text"
                  value={newUserData.specialite}
                  onChange={(e) => setNewUserData({ ...newUserData, specialite: e.target.value })}
                  placeholder="Ex: Cardiologie, Pédiatrie..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreatingUser(false)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-white bg-teal-600 hover:bg-teal-700 rounded-xl font-bold shadow-xs"
                >
                  Créer l'Utilisateur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

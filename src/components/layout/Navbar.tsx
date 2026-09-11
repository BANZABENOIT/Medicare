import React, { useState } from 'react';
import {
  Activity,
  Bell,
  Search,
  UserCheck,
  RotateCcw,
  Shield,
  Stethoscope,
  FlaskConical,
  Pill,
  CreditCard,
  LogOut,
  Menu
} from 'lucide-react';
import { User, UserRole, Patient, ClinicSettings } from '../../types';
import { apiService } from '../../services/apiService';

interface NavbarProps {
  currentUser: User;
  currentView?: string;
  settings?: ClinicSettings;
  onRoleSwitch?: (role: UserRole) => void;
  onSwitchUser?: (user: User) => void;
  onNavigate?: (view: string, data?: any) => void;
  onSelectPatient?: (patientId: string) => void;
  onOpenSettings?: () => void;
  onOpenNewPatientModal?: () => void;
  onOpenNewAppointmentModal?: () => void;
  onOpenNewConsultationModal?: () => void;
  onLogout?: () => void;
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  currentView,
  settings,
  onRoleSwitch,
  onSwitchUser,
  onNavigate,
  onSelectPatient,
  onOpenSettings,
  onOpenNewPatientModal,
  onOpenNewAppointmentModal,
  onOpenNewConsultationModal,
  onLogout,
  onToggleSidebar
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const rolesList: { role: UserRole; label: string; icon: any; color: string; desc: string }[] = [
    { role: 'admin', label: 'Administrateur', icon: Shield, color: 'text-purple-600 bg-purple-50', desc: 'Accès complet, rapports, utilisateurs' },
    { role: 'doctor', label: 'Médecin Soignant', icon: Stethoscope, color: 'text-blue-600 bg-blue-50', desc: 'Consultations, ordonnances, dossiers' },
    { role: 'receptionist', label: 'Réceptionniste', icon: UserCheck, color: 'text-indigo-600 bg-indigo-50', desc: 'Accueil, rendez-vous, patients' },
    { role: 'lab_tech', label: 'Laborantin / Biologiste', icon: FlaskConical, color: 'text-amber-600 bg-amber-50', desc: 'Analyses, résultats d’examens' },
    { role: 'pharmacist', label: 'Pharmacien', icon: Pill, color: 'text-emerald-600 bg-emerald-50', desc: 'Délivrance ordonnances, stocks' },
    { role: 'cashier', label: 'Caissier / Facturation', icon: CreditCard, color: 'text-sky-600 bg-sky-50', desc: 'Encaissements, factures, reçs' }
  ];

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const all = apiService.patients.getAll();
    const query = term.toLowerCase();
    const filtered = all.filter(
      p => p.nom.toLowerCase().includes(query) ||
           p.prenom.toLowerCase().includes(query) ||
           p.numero.toLowerCase().includes(query) ||
           p.telephone.includes(query)
    ).slice(0, 6);
    setSearchResults(filtered);
  };

  const handleResetData = () => {
    if (window.confirm('Voulez-vous réinitialiser toutes les données de MediCare Connect ?')) {
      apiService.resetDatabase();
      window.location.reload();
    }
  };

  const handleRoleSelection = (role: UserRole) => {
    if (onRoleSwitch) {
      onRoleSwitch(role);
    }
    if (onSwitchUser) {
      const allUsers = apiService.users.getAll();
      const match = allUsers.find(u => u.role === role);
      if (match) {
        onSwitchUser(match);
      } else {
        onSwitchUser({
          ...currentUser,
          role
        });
      }
    }
    setShowRoleMenu(false);
  };

  const handlePatientSelect = (patientId: string) => {
    if (onSelectPatient) {
      onSelectPatient(patientId);
    } else if (onNavigate) {
      onNavigate('patients', { selectedPatientId: patientId });
    }
    setIsSearching(false);
    setSearchTerm('');
  };

  return (
    <header className="h-14 sm:h-16 bg-white border-b border-slate-200 flex items-center justify-between px-2 sm:px-3 z-30 shrink-0 select-none">
      <div className="flex items-center gap-2 min-w-0">
        {/* Mobile hamburger */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Search Input Bar */}
        <div className="relative w-48 sm:w-72 lg:w-96">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => setIsSearching(!!searchTerm)}
            placeholder="Rechercher un patient..."
            className="w-full pl-10 pr-8 py-2 bg-slate-100 border-none rounded-full text-sm text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:bg-white outline-none transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => { setSearchTerm(''); setSearchResults([]); setIsSearching(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              ✕
            </button>
          )}

          {/* Quick Search Dropdown */}
          {isSearching && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 overflow-hidden">
              <div className="px-4 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Patients trouvés ({searchResults.length})
              </div>
              {searchResults.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePatientSelect(p.id)}
                  className="w-full px-4 py-2.5 text-left hover:bg-slate-50 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                      {String(p.nom.charAt(0) || '').toUpperCase()}{String(p.prenom.charAt(0) || '').toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800">
                        {p.nom} {p.prenom}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <span className="font-mono text-blue-600 font-medium">{p.numero}</span>
                        <span>•</span>
                        <span>{p.telephone}</span>
                        {p.groupe_sanguin && (
                          <span className="px-1.5 py-0.2 bg-red-50 text-red-600 rounded-full text-[10px] font-bold">
                            {p.groupe_sanguin}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-blue-600">Voir →</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Action Icons & Role Switcher */}
      <div className="flex items-center gap-1 sm:gap-3">
        {/* Reset Database Button */}
        <button
          onClick={handleResetData}
          title="Réinitialiser les données"
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Notifications Toggle */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors cursor-pointer relative"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white"></span>
          </button>

          {showNotifications && (
            <div 
              className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95"
              onMouseLeave={() => setShowNotifications(false)}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Notifications</span>
                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">3</span>
              </div>
              <div className="divide-y divide-slate-100 text-xs">
                <div className="py-2.5">
                  <p className="font-semibold text-slate-800">Alerte Stock</p>
                  <p className="text-slate-500 mt-0.5">Amoxicilline sous le seuil (8 restants)</p>
                </div>
                <div className="py-2.5">
                  <p className="font-semibold text-slate-800">Résultats Labo</p>
                  <p className="text-slate-500 mt-0.5">Biochimie validée pour Dupont (Urgent)</p>
                </div>
                <div className="py-2.5">
                  <p className="font-semibold text-slate-800">Facture en attente</p>
                  <p className="text-slate-500 mt-0.5">FACT-2026-0003 prête pour encaissement</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Role Profile Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-2 p-1 pl-2 sm:pl-3 rounded-full border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer"
          >
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-slate-800">
                {String(currentUser?.prenom || 'Dr.').toUpperCase()} {String(currentUser?.nom || 'Miller').toUpperCase()}
              </div>
              <div className="text-[10px] text-slate-500 capitalize">
                {rolesList.find(r => r.role === currentUser?.role)?.label || currentUser?.role || 'Médecin'}
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
              {String(currentUser?.prenom?.charAt(0) || 'D').toUpperCase()}{String(currentUser?.nom?.charAt(0) || 'R').toUpperCase()}
            </div>
          </button>

          {/* Role Switcher Menu */}
          {showRoleMenu && (
            <div 
              className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95"
              onMouseLeave={() => setShowRoleMenu(false)}
            >
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">Changer de Profil</p>
                <p className="text-[11px] text-slate-500">Accéder aux espaces selon votre rôle</p>
              </div>
              
              <div className="py-1">
                {rolesList.map((item) => {
                  const Icon = item.icon;
                  const isCurrent = currentUser?.role === item.role;
                  return (
                    <button
                      key={item.role}
                      onClick={() => handleRoleSelection(item.role)}
                      className={`w-full px-4 py-2.5 text-left flex items-start gap-3 transition-colors cursor-pointer ${
                        isCurrent ? 'bg-blue-50 text-blue-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg shrink-0 ${item.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold">{item.label}</span>
                          {isCurrent && (
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-200/60 px-2 py-0.5 rounded-full">
                              Actif
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">{item.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Logout Option in Dropdown */}
              {onLogout && (
                <div className="pt-1 mt-1 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setShowRoleMenu(false);
                      onLogout();
                    }}
                    className="w-full px-4 py-2.5 text-left flex items-center gap-3 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer font-semibold text-xs"
                  >
                    <div className="p-1.5 rounded-lg bg-rose-100 text-rose-600 shrink-0">
                      <LogOut className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <span>Se Déconnecter</span>
                      <p className="text-[10px] text-rose-400 font-normal">Fermer la session active</p>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Logout Button */}
        {onLogout && (
          <button
            onClick={onLogout}
            title="Se Déconnecter"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}

      </div>
    </header>
  );
};

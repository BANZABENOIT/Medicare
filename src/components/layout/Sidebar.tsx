import React from 'react';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Stethoscope,
  FileText,
  FlaskConical,
  Pill,
  CreditCard,
  UserCog,
  BarChart3,
  Settings,
  HeartPulse,
  LogOut,
  X
} from 'lucide-react';
import { UserRole, User, ClinicSettings } from '../../types';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  userRole?: UserRole;
  currentUser?: User;
  settings?: ClinicSettings;
  counts?: {
    patients: number;
    appointmentsToday: number;
    labPending: number;
    lowStock: number;
    unpaidInvoices: number;
  };
  onLogout?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  userRole,
  currentUser,
  settings,
  counts = { patients: 0, appointmentsToday: 4, labPending: 1, lowStock: 2, unpaidInvoices: 1 },
  onLogout,
  isOpen = false,
  onClose
}) => {
  const activeRole = currentUser?.role || userRole || 'admin';

  interface NavItem {
    id: string;
    label: string;
    icon: any;
    badge?: number;
    badgeColor?: string;
    allowedRoles: UserRole[];
    category: 'principal' | 'medical' | 'support' | 'admin';
  }

  const navItems: NavItem[] = [
    // Principal
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, category: 'principal', allowedRoles: ['admin', 'doctor', 'receptionist', 'lab_tech', 'pharmacist', 'cashier', 'medecin', 'infirmier', 'receptionniste', 'pharmacien', 'laborantin', 'caissier'] },
    { id: 'patients', label: 'Patients', icon: Users, badge: counts.patients, badgeColor: 'bg-teal-100 text-teal-700', category: 'principal', allowedRoles: ['admin', 'doctor', 'receptionist', 'cashier', 'medecin', 'receptionniste'] },
    { id: 'appointments', label: 'Rendez-vous', icon: Calendar, badge: counts.appointmentsToday, badgeColor: 'bg-blue-100 text-blue-700', category: 'principal', allowedRoles: ['admin', 'doctor', 'receptionist', 'medecin', 'receptionniste'] },
    
    // Medical & Clinical
    { id: 'consultations', label: 'Consultations', icon: Stethoscope, category: 'medical', allowedRoles: ['admin', 'doctor', 'medecin', 'infirmier'] },
    { id: 'prescriptions', label: 'Prescriptions', icon: FileText, category: 'medical', allowedRoles: ['admin', 'doctor', 'pharmacist', 'medecin', 'pharmacien'] },
    { id: 'lab', label: 'Laboratoire', icon: FlaskConical, badge: counts.labPending, badgeColor: 'bg-amber-100 text-amber-700', category: 'medical', allowedRoles: ['admin', 'doctor', 'lab_tech', 'medecin', 'laborantin'] },
    
    // Support & Paraclinical
    { id: 'pharmacy', label: 'Pharmacie', icon: Pill, badge: counts.lowStock, badgeColor: 'bg-rose-100 text-rose-700', category: 'support', allowedRoles: ['admin', 'pharmacist', 'doctor', 'pharmacien'] },
    { id: 'billing', label: 'Facturation', icon: CreditCard, badge: counts.unpaidInvoices, badgeColor: 'bg-indigo-100 text-indigo-700', category: 'support', allowedRoles: ['admin', 'cashier', 'receptionist', 'caissier'] },
    
    // Administration & Management
    { id: 'doctors', label: 'Médecins & Services', icon: HeartPulse, category: 'admin', allowedRoles: ['admin', 'receptionist'] },
    { id: 'reports', label: 'Statistiques & Rapports', icon: BarChart3, category: 'admin', allowedRoles: ['admin'] },
    { id: 'users', label: 'Personnel & Rôles', icon: UserCog, category: 'admin', allowedRoles: ['admin'] },
    { id: 'settings', label: 'Paramètres', icon: Settings, category: 'admin', allowedRoles: ['admin'] }
  ];

  const visibleItems = navItems.filter(item => 
    item.allowedRoles.includes(activeRole) || activeRole === 'admin'
  );

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 select-none z-40 min-h-screen
        lg:relative lg:translate-x-0
        ${isOpen ? 'fixed inset-y-0 left-0 translate-x-0' : 'fixed -translate-x-full lg:translate-x-0'}
        transition-transform duration-200 ease-in-out
      `}>
      {/* Brand Header */}
      <div className="p-3 flex items-center justify-between gap-3 border-b border-slate-100">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md shadow-blue-600/20 shrink-0">
            MC
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold tracking-tight text-slate-800 truncate">
              MediCare <span className="text-blue-600">Connect</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium truncate">
              {settings?.nom || 'Centre Médical'}
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 py-2 space-y-5 overflow-y-auto">
        
        {/* Module Section */}
        <div>
          <div className="px-3 mb-1.5 text-xs font-semibold text-slate-400 uppercase tracking-widest">
            Navigation
          </div>
          <nav className="space-y-0.5">
            {visibleItems.filter(i => i.category === 'principal').map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'sidebar-active font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor || 'bg-slate-100 text-slate-700'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Medical & Clinical Section */}
        {visibleItems.some(i => i.category === 'medical') && (
          <div>
            <div className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-widest">
              Soins Médicaux
            </div>
            <nav className="space-y-0.5">
              {visibleItems.filter(i => i.category === 'medical').map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'sidebar-active font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor || 'bg-slate-100 text-slate-700'}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        )}

        {/* Support Section */}
        {visibleItems.some(i => i.category === 'support') && (
          <div>
            <div className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-widest">
              Pharmacie & Caisse
            </div>
            <nav className="space-y-0.5">
              {visibleItems.filter(i => i.category === 'support').map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'sidebar-active font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor || 'bg-slate-100 text-slate-700'}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        )}

        {/* Admin Section */}
        {visibleItems.some(i => i.category === 'admin') && (
          <div>
            <div className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-widest">
              Administration
            </div>
            <nav className="space-y-0.5">
              {visibleItems.filter(i => i.category === 'admin').map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'sidebar-active font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        )}

      </div>

      {/* User Footer info box */}
      <div className="p-4 border-t border-slate-100 mt-auto bg-slate-50/60 space-y-2">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-white border border-slate-200/80 shadow-xs">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold shrink-0">
            {String(currentUser?.prenom?.charAt(0) || 'D').toUpperCase()}{String(currentUser?.nom?.charAt(0) || 'R').toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-800 truncate">
              {currentUser?.prenom ? `${String(currentUser.prenom).toUpperCase()} ${String(currentUser.nom).toUpperCase()}` : 'Dr. Sarah Miller'}
            </p>
            <p className="text-[10px] text-slate-500 capitalize truncate">
              {currentUser?.role || activeRole}
            </p>
          </div>
        </div>

        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full py-2 px-3 rounded-xl border border-rose-200/70 bg-rose-50/80 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Déconnexion</span>
          </button>
        )}
      </div>
    </aside>
    </>
  );
};

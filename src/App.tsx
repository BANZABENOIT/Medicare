import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { PatientJourneyBar } from './components/layout/PatientJourneyBar';
import { PrintableDocumentModal } from './components/common/PrintableDocumentModal';
import { Toaster } from './components/ui/Toast';

// Pages
import { LandingPage } from './pages/LandingPage';
import { DashboardView } from './pages/DashboardView';
import { PatientsView } from './pages/PatientsView';
import { AppointmentsView } from './pages/AppointmentsView';
import { ConsultationsView } from './pages/ConsultationsView';
import { PrescriptionsView } from './pages/PrescriptionsView';
import { LaboratoryView } from './pages/LaboratoryView';
import { PharmacyView } from './pages/PharmacyView';
import { BillingView } from './pages/BillingView';
import { DoctorsView } from './pages/DoctorsView';
import { ReportsView } from './pages/ReportsView';
import { UsersView } from './pages/UsersView';
import { SettingsView } from './pages/SettingsView';

import { apiService } from './services/apiService';
import { hydrateFromBackend, restoreLocalData } from './services/backendSync';
import { isBackendActive, setBackendActive } from './services/djangoApiClient';
import { User, ClinicSettings, PrintDocumentType } from './types';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => apiService.auth.isAuthenticated());
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [currentUser, setCurrentUser] = useState<User>(() => apiService.users.getCurrentUser());
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings>(() => apiService.settings.get());
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingBackendEmail, setPendingBackendEmail] = useState<string | undefined>(undefined);

  // Compteurs de la barre latérale, calculés à partir des données réelles
  // (celles-ci proviennent du backend dès que le compte est un compte backend).
  const [counts, setCounts] = useState<{
    patients: number;
    appointmentsToday: number;
    labPending: number;
    lowStock: number;
    unpaidInvoices: number;
  }>({ patients: 0, appointmentsToday: 0, labPending: 0, lowStock: 0, unpaidInvoices: 0 });

  const refreshCounts = () => {
    const today = new Date().toISOString().split('T')[0];
    setCounts({
      patients: apiService.patients.getAll().length,
      appointmentsToday: apiService.appointments.getAll().filter(a => a.date === today).length,
      labPending: apiService.lab.getAll().filter(r => r.statut === 'demandee').length,
      lowStock: apiService.medications.getAll().filter(m => m.stock_actuel <= m.seuil_alerte).length,
      unpaidInvoices: apiService.billing.getInvoices().filter(i => i.statut !== 'payee').length
    });
  };

  // Printing Modal State
  const [printModal, setPrintModal] = useState<{
    isOpen: boolean;
    type: PrintDocumentType;
    data: any;
    title: string;
  }>({
    isOpen: false,
    type: 'prescription',
    data: null,
    title: ''
  });

  useEffect(() => {
    // Keep settings and user updated
    const handleUpdate = () => {
      setClinicSettings(apiService.settings.get());
      refreshCounts();
    };
    window.addEventListener('medicare_data_updated', handleUpdate);

    // Au chargement, si une session backend est déjà active, on resynchronise les données ;
    // sinon on restaure les données locales (en cas de retour depuis un mode backend).
    if (isBackendActive()) {
      hydrateFromBackend();
    } else {
      restoreLocalData();
    }
    refreshCounts();

    return () => window.removeEventListener('medicare_data_updated', handleUpdate);
  }, []);

  const handleLoginSuccess = (user: User) => {
    apiService.auth.setAuthenticatedUser(user);
    setCurrentUser(user);
    setIsAuthenticated(true);
    setCurrentView('dashboard');
    // Si l'utilisateur vient du backend, on privilégie ses données (le local reste masqué).
    if (isBackendActive()) {
      hydrateFromBackend();
    } else {
      // Retour en mode local : on restaure les données locales.
      restoreLocalData();
    }
    refreshCounts();
  };

  const handleLogout = () => {
    apiService.auth.logout();
    setIsAuthenticated(false);
    setCurrentView('dashboard');
    setSelectedPatientId(null);
  };
  const handlePrintDocument = (type: PrintDocumentType, data: any, title: string) => {
    setPrintModal({
      isOpen: true,
      type,
      data,
      title
    });
  };

  const handleSelectPatient = (patientId: string) => {
    setSelectedPatientId(patientId);
    setCurrentView('patients');
  };

  const handleSwitchUser = (user: User) => {
    apiService.users.setCurrentUser(user);
    setCurrentUser(user);
  };

  // Compte backend sélectionné depuis Personnel & Rôles : on déconnecte la session courante et on
  // renvoie vers la page de connexion avec l'email du compte présélectionné. Les données locales
  // ne sont ni modifiées ni supprimées.
  const handleRequireBackendLogin = (email?: string) => {
    apiService.auth.logout();
    setBackendActive(false);
    setPendingBackendEmail(email || undefined);
    setCurrentUser(apiService.users.getCurrentUser());
    setIsAuthenticated(false);
    setCurrentView('dashboard');
    setSelectedPatientId(null);
  };

  const clearInitialLogin = () => {
    setPendingBackendEmail(undefined);
  };

  // If user is not logged in, they land directly on the Medical Landing Page
  if (!isAuthenticated) {
    return (
      <>
        <LandingPage
          onLoginSuccess={handleLoginSuccess}
          settings={clinicSettings}
          initialLoginEmail={pendingBackendEmail}
          onClearInitialLogin={clearInitialLogin}
        />
        <Toaster />
      </>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-['Josefin_Sans'] text-slate-800 antialiased selection:bg-blue-500 selection:text-white">
      
      {/* Primary Sidebar */}
      <Sidebar
        currentView={currentView}
        onNavigate={(view) => {
          setCurrentView(view);
          setSidebarOpen(false);
          if (view !== 'patients') {
            setSelectedPatientId(null);
          }
        }}
        currentUser={currentUser}
        settings={clinicSettings}
        counts={counts}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Navbar */}
        <Navbar
          currentView={currentView}
          currentUser={currentUser}
          settings={clinicSettings}
          onSelectPatient={handleSelectPatient}
          onOpenSettings={() => setCurrentView('settings')}
          onSwitchUser={handleSwitchUser}
          onLogout={handleLogout}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        {/* Dynamic Medical Journey Bar */}
        <PatientJourneyBar
          currentView={currentView}
          onNavigate={(view) => setCurrentView(view)}
        />

        {/* Dynamic Viewport */}
        <main className="flex-1 overflow-y-auto p-3">
          <div className="max-w-7xl mx-auto pb-3">
            {currentView === 'dashboard' && (
              <DashboardView
                onNavigate={setCurrentView}
                onSelectPatient={handleSelectPatient}
                settings={clinicSettings}
              />
            )}

            {currentView === 'patients' && (
              <PatientsView
                onNavigate={setCurrentView}
                initialSelectedPatientId={selectedPatientId}
                onPrintDocument={handlePrintDocument}
                settings={clinicSettings}
              />
            )}

            {currentView === 'appointments' && (
              <AppointmentsView
                onNavigate={setCurrentView}
                settings={clinicSettings}
              />
            )}

            {currentView === 'consultations' && (
              <ConsultationsView
                onNavigate={setCurrentView}
                onPrintDocument={handlePrintDocument}
                settings={clinicSettings}
              />
            )}

            {currentView === 'prescriptions' && (
              <PrescriptionsView
                onNavigate={setCurrentView}
                onPrintDocument={handlePrintDocument}
                settings={clinicSettings}
              />
            )}

            {currentView === 'lab' && (
              <LaboratoryView
                onPrintDocument={handlePrintDocument}
                settings={clinicSettings}
              />
            )}

            {currentView === 'pharmacy' && (
              <PharmacyView
                settings={clinicSettings}
              />
            )}

            {currentView === 'billing' && (
              <BillingView
                onPrintDocument={handlePrintDocument}
                settings={clinicSettings}
              />
            )}

            {currentView === 'doctors' && (
              <DoctorsView
                settings={clinicSettings}
              />
            )}

            {currentView === 'reports' && (
              <ReportsView
                settings={clinicSettings}
              />
            )}

            {currentView === 'users' && (
              <UsersView
                currentUser={currentUser}
                onSwitchUser={handleSwitchUser}
                onRequireLogin={handleRequireBackendLogin}
                settings={clinicSettings}
              />
            )}

            {currentView === 'settings' && (
              <SettingsView
                settings={clinicSettings}
                onUpdateSettings={(newS) => setClinicSettings(newS)}
              />
            )}
          </div>
        </main>

        {/* Clean Utility Minimal Footer */}
        <footer className="h-10 px-4 sm:px-8 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-200 bg-white shrink-0 select-none">
          <div className="truncate">
            MediCare Connect v1.0 • {clinicSettings?.nom || 'Centre Médical'}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-medium text-slate-600 hidden sm:inline">Opérationnel</span>
          </div>
        </footer>
      </div>

      {/* Standardized Medical Document Print Modal */}
      {printModal.isOpen && (
        <PrintableDocumentModal
          isOpen={printModal.isOpen}
          onClose={() => setPrintModal(prev => ({ ...prev, isOpen: false }))}
          type={printModal.type}
          data={printModal.data}
          settings={clinicSettings}
          title={printModal.title}
        />
      )}

      <Toaster />

    </div>
  );
}


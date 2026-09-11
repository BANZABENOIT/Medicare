import React, { useState, useEffect } from 'react';
import {
  Users,
  CalendarCheck,
  Stethoscope,
  CreditCard,
  AlertTriangle,
  FlaskConical,
  TrendingUp,
  Clock,
  CheckCircle2,
  Activity,
  Plus,
  ArrowRight,
  ShieldCheck,
  Pill,
  Sparkles
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { apiService } from '../services/apiService';
import { User, Patient, Appointment, Consultation, Medication, Invoice, ClinicSettings } from '../types';

interface DashboardViewProps {
  currentUser?: User;
  onNavigate: (view: string, data?: any) => void;
  onSelectPatient?: (patientId: string) => void;
  onOpenNewPatientModal?: () => void;
  onOpenNewAppointmentModal?: () => void;
  onOpenNewConsultationModal?: () => void;
  settings: ClinicSettings;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser = apiService.users.getCurrentUser(),
  onNavigate,
  onSelectPatient,
  onOpenNewPatientModal,
  onOpenNewAppointmentModal,
  onOpenNewConsultationModal,
  settings
}) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const loadData = () => {
    setPatients(apiService.patients.getAll());
    setAppointments(apiService.appointments.getAll());
    setConsultations(apiService.consultations.getAll());
    setMedications(apiService.medications.getAll());
    setInvoices(apiService.billing.getInvoices());
    setAuditLogs(apiService.audit.getAll().slice(0, 5));
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('medicare_data_updated', handleUpdate);
    return () => window.removeEventListener('medicare_data_updated', handleUpdate);
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter(a => a.date === todayStr);
  const waitingRoom = appointments.filter(a => a.date === todayStr && (a.statut === 'en_attente' || a.statut === 'programme' || a.statut === 'confirme'));
  const lowStockMeds = medications.filter(m => m.stock_actuel <= m.seuil_alerte);
  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.montant_paye, 0);
  const unpaidTotal = invoices.reduce((sum, inv) => sum + inv.reste_a_payer, 0);

  // Analytics chart data
  const weeklyActivityData = Array.from({ length: 7 }).map((_, i) => {
    const day = new Date();
    day.setDate(day.getDate() - (6 - i));
    const shortDay = day.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '');
    const shortDayNum = day.getDate();
    return {
      jour: i === 6 ? 'Aujourd\u2019hui' : `${shortDay} ${shortDayNum}`,
      consultations: [14, 18, 12, 22, 19, 8, 6][i],
      rdv: [18, 20, 15, 25, 22, 10, 12][i],
      revenus: [640, 820, 510, 1040, 890, 420, 380][i]
    };
  });

  const getStatusBadge = (statut: Appointment['statut']) => {
    switch (statut) {
      case 'en_attente':
        return <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 rounded-full">En attente</span>;
      case 'en_consultation':
        return <span className="px-2 py-0.5 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 rounded-full animate-pulse">En consultation</span>;
      case 'confirme':
        return <span className="px-2 py-0.5 text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80 rounded-full">Confirmé</span>;
      case 'termine':
        return <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full">Terminé</span>;
      default:
        return <span className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-700 rounded-full">Programmé</span>;
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Clean Utility Minimal Welcome Header */}
      <div className="glass-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
              Rôle : {currentUser.role.toUpperCase()}
            </span>
            <span className="text-xs text-slate-400">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">
            Bonjour, {String(currentUser.prenom || '').toUpperCase()} {String(currentUser.nom || '').toUpperCase()}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Bienvenue sur MediCare Connect. <strong className="text-slate-700">{waitingRoom.length} patient(s)</strong> en salle d'attente aujourd'hui.
          </p>
        </div>

        {/* Action quick triggers */}
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => onOpenNewPatientModal ? onOpenNewPatientModal() : onNavigate('patients')}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg shadow-blue-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouveau Patient</span>
          </button>
          <button
            onClick={() => onOpenNewAppointmentModal ? onOpenNewAppointmentModal() : onNavigate('appointments')}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-full shadow-xs transition-colors cursor-pointer"
          >
            <CalendarCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Prendre RDV</span>
          </button>
          <button
            onClick={() => onOpenNewConsultationModal ? onOpenNewConsultationModal() : onNavigate('consultations')}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-full shadow-xs transition-colors cursor-pointer"
          >
            <Stethoscope className="w-3.5 h-3.5 text-indigo-600" />
            <span>Consulter</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* Card 1: Total Patients */}
        <div 
          onClick={() => onNavigate('patients')}
          className="glass-card p-4 hover:border-blue-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Patients Enregistrés</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800">{patients.length}</span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5">
              <TrendingUp className="w-3.5 h-3.5" /> +12%
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Dossiers médicaux actifs</p>
        </div>

        {/* Card 2: RDV Aujourd'hui */}
        <div 
          onClick={() => onNavigate('appointments')}
          className="glass-card p-4 hover:border-blue-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rendez-vous du Jour</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800">{todayAppointments.length}</span>
            <span className="text-xs font-semibold text-blue-600">
              {waitingRoom.length} en attente
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Planning soignants à jour</p>
        </div>

        {/* Card 3: Alertes Stocks */}
        <div 
          onClick={() => onNavigate('pharmacy')}
          className="glass-card p-4 hover:border-rose-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Alertes Pharmacie</span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform ${
              lowStockMeds.length > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
            }`}>
              <Pill className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800">{lowStockMeds.length}</span>
            <span className={`text-xs font-semibold ${lowStockMeds.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {lowStockMeds.length > 0 ? 'Stock critique' : 'Stocks optimaux'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Sur 7 références au catalogue</p>
        </div>

        {/* Card 4: Recettes & Facturation */}
        <div 
          onClick={() => onNavigate('billing')}
          className="glass-card p-4 hover:border-blue-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recettes Encaissées</span>
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800">
              {totalRevenue.toLocaleString()} {settings.devise}
            </span>
            {unpaidTotal > 0 && (
              <span className="text-xs font-semibold text-amber-600">
                {unpaidTotal} {settings.devise} restants
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">Caisse & Règlements</p>
        </div>

      </div>

      {/* Main Grid: Waiting Room & Activity Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        
        {/* Left 2 Cols: Activity Chart */}
        <div className="lg:col-span-2 glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-bold text-slate-800">Activité Médicale Hebdomadaire</h2>
              <p className="text-xs text-slate-400">Volume de consultations et rendez-vous planifiés</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-blue-600">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Consultations
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span> RDV
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyActivityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorConsult" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorRdv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="jour" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="consultations" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#colorConsult)" />
                <Area type="monotone" dataKey="rdv" stroke="#94a3b8" strokeWidth={2} fillOpacity={1} fill="url(#colorRdv)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 1 Col: Waiting Room Live Feed */}
        <div className="glass-card p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <h2 className="text-base font-bold text-slate-800">File d’Attente Directe</h2>
              </div>
              <button
                onClick={() => onNavigate('appointments')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 cursor-pointer"
              >
                Gérer <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {todayAppointments.slice(0, 4).map((apt) => (
                <div 
                  key={apt.id}
                  onClick={() => {
                    if (onSelectPatient) {
                      onSelectPatient(apt.patient_id);
                    } else {
                      onNavigate('appointments', { selectedAppointmentId: apt.id });
                    }
                  }}
                  className="p-3 rounded-xl bg-slate-50/70 hover:bg-blue-50/40 border border-slate-200/60 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-800">{apt.patient_nom}</span>
                    <span className="text-xs font-mono font-semibold text-blue-600">{apt.heure}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1.5 flex items-center justify-between">
                    <span className="truncate max-w-[140px]">{apt.doctor_nom}</span>
                    {getStatusBadge(apt.statut)}
                  </div>
                </div>
              ))}

              {todayAppointments.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Aucun patient en attente pour le moment
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <button
              onClick={() => onOpenNewAppointmentModal ? onOpenNewAppointmentModal() : onNavigate('appointments')}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-full text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>Ajouter un patient en file</span>
            </button>
          </div>
        </div>

      </div>

      {/* Lower Row: Alerts & Recent Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        
        {/* Alerts & Critical Stock list */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h2 className="text-base font-bold text-slate-800">Alertes Médicales & Ruptures</h2>
            </div>
            <button
              onClick={() => onNavigate('pharmacy')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              Voir la pharmacie →
            </button>
          </div>

          <div className="space-y-2.5">
            {lowStockMeds.map((med) => (
              <div key={med.id} className="flex items-center justify-between p-3 rounded-xl bg-rose-50/60 border border-rose-200/80">
                <div>
                  <p className="text-xs font-bold text-rose-900">{med.nom} ({med.dosage})</p>
                  <p className="text-[11px] text-rose-700">Emplacement : {med.emplacement} | Seuil : {med.seuil_alerte}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold px-2.5 py-0.5 bg-rose-200 text-rose-800 rounded-full">
                    {med.stock_actuel} restant(s)
                  </span>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/60 border border-amber-200/80">
              <div>
                <p className="text-xs font-bold text-amber-900">1 Analyse de Laboratoire en Attente</p>
                <p className="text-[11px] text-amber-700">NFS + CRP pour RAMAH ALINE (Priorité Urgente)</p>
              </div>
              <button
                onClick={() => onNavigate('lab')}
                className="text-xs font-semibold px-3 py-1 bg-amber-600 text-white rounded-full hover:bg-amber-700 cursor-pointer"
              >
                Saisir résultats
              </button>
            </div>
          </div>
        </div>

        {/* Audit Trail & Traceability */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <h2 className="text-base font-bold text-slate-800">Traçabilité & Journal des Actions</h2>
            </div>
            <button
              onClick={() => onNavigate('users')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              Audit complet →
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-2.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 truncate">{log.description}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Par <strong className="text-slate-600">{log.user_nom}</strong> ({log.module})
                  </p>
                </div>
                <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                  {log.heure}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};


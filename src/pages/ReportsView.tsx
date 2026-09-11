import React from 'react';
import {
  TrendingUp,
  Users,
  CreditCard,
  Stethoscope,
  FlaskConical,
  Pill,
  Download,
  Calendar,
  BarChart3,
  PieChart as PieIcon,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { apiService } from '../services/apiService';
import { ClinicSettings } from '../types';

interface ReportsViewProps {
  settings: ClinicSettings;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ settings }) => {
  const patients = apiService.patients.getAll();
  const appointments = apiService.appointments.getAll();
  const consultations = apiService.consultations.getAll();
  const invoices = apiService.billing.getInvoices();
  const medications = apiService.medications.getAll();

  const totalRevenue = invoices.reduce((s, i) => s + i.montant_paye, 0);

  // Recharts Chart Data
  const monthlyRevenueData = [
    { mois: 'Mars', consultations: 120, recettes: 4200, actes: 85 },
    { mois: 'Avril', consultations: 145, recettes: 5100, actes: 110 },
    { mois: 'Mai', consultations: 170, recettes: 5800, actes: 130 },
    { mois: 'Juin', consultations: 190, recettes: 6400, actes: 140 },
    { mois: 'Juillet', consultations: 160, recettes: 5300, actes: 105 },
    { mois: 'Août', consultations: 215, recettes: 7450, actes: 165 }
  ];

  const pathologyDistribution = [
    { name: 'Hypertension (I10)', value: 34, color: '#0d9488' },
    { name: 'Diabète T2 (E11)', value: 22, color: '#3b82f6' },
    { name: 'Infections Resp. (J06)', value: 28, color: '#f59e0b' },
    { name: 'Gastrite / Ulcère (K29)', value: 16, color: '#ec4899' },
    { name: 'Autres Pathologies', value: 20, color: '#64748b' }
  ];

  const serviceActivity = [
    { service: 'Médecine Générale', patients: 142 },
    { service: 'Cardiologie', patients: 78 },
    { service: 'Pédiatrie', patients: 64 },
    { service: 'Gynécologie', patients: 52 },
    { service: 'Laboratoire', patients: 110 }
  ];

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Date,Module,Volume,Recettes\n" +
      (monthlyRevenueData || []).map(e => `${e.mois},Activite,${e.consultations},${e.recettes}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `rapport_medicare_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-['Josefin_Sans']">
            Rapports d’Activité & Statistiques Médicales
          </h1>
          <p className="text-xs text-slate-500">
            Indicateurs de performance clinique, épidémiologie et analyse financière
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4 text-teal-600" />
          <span>Exporter les Statistiques (CSV)</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase">Consultations Réalisées</span>
          <div className="text-2xl font-bold text-teal-800 font-['Josefin_Sans'] mt-2">
            {consultations.length} actes
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-0.5 mt-1">
            <TrendingUp className="w-3.5 h-3.5" /> +18% vs mois précédent
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase">Chiffre d’Affaires</span>
          <div className="text-2xl font-bold text-slate-900 font-['Josefin_Sans'] mt-2">
            {totalRevenue.toLocaleString()} {settings.devise}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Sur la période active</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase">File Active Patients</span>
          <div className="text-2xl font-bold text-blue-700 font-['Josefin_Sans'] mt-2">
            {patients.length} dossiers
          </div>
          <span className="text-[11px] text-blue-600 font-semibold mt-1 block">
            100% informatisés
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase">Disponibilité Pharmacie</span>
          <div className="text-2xl font-bold text-emerald-700 font-['Josefin_Sans'] mt-2">
            {medications.length} spécialités
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Taux de service : 94%</span>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        
        {/* Monthly Activity Area Chart */}
        <div className="lg:col-span-2 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Évolution de l'Activité & Recettes Mensuelles</h2>
            <p className="text-xs text-slate-500">Corrélation entre nombre d'actes médicaux et chiffre d'affaires</p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyRevenueData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="recettesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="mois" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="recettes" stroke="#0d9488" strokeWidth={3} fillOpacity={1} fill="url(#recettesGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pathologies Pie Chart */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Distribution des Diagnostics CIM-10</h2>
            <p className="text-xs text-slate-500">Répartition épidémiologique des motifs de consultation</p>

            <div className="h-52 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pathologyDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pathologyDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
            {pathologyDistribution.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                  {item.name}
                </span>
                <span className="font-bold text-slate-900">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Secondary Bar Chart: Department Workload */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900">Fréquentation par Département Médical</h2>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={serviceActivity} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="service" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
              />
              <Bar dataKey="patients" fill="#0d9488" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};

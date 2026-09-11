import React from 'react';
import {
  UserPlus,
  CalendarCheck,
  Clock,
  Stethoscope,
  FileSpreadsheet,
  FlaskConical,
  Pill,
  Receipt,
  FolderArchive
} from 'lucide-react';

interface PatientJourneyBarProps {
  currentView: string;
  onNavigate: (view: string, data?: any) => void;
}

export const PatientJourneyBar: React.FC<PatientJourneyBarProps> = ({
  currentView,
  onNavigate
}) => {
  const steps = [
    { id: 'patients', num: '1', title: 'Accueil / Dossier', icon: UserPlus, view: 'patients' },
    { id: 'appointments', num: '2', title: 'Prise de RDV', icon: CalendarCheck, view: 'appointments' },
    { id: 'attente', num: '3', title: 'File d’Attente', icon: Clock, view: 'appointments' },
    { id: 'consultations', num: '4', title: 'Consultation', icon: Stethoscope, view: 'consultations' },
    { id: 'prescriptions', num: '5', title: 'Prescription', icon: FileSpreadsheet, view: 'prescriptions' },
    { id: 'laboratory', num: '6', title: 'Examens Labo', icon: FlaskConical, view: 'laboratory' },
    { id: 'pharmacy', num: '7', title: 'Pharmacie', icon: Pill, view: 'pharmacy' },
    { id: 'billing', num: '8', title: 'Facturation & Caisse', icon: Receipt, view: 'billing' },
    { id: 'dossier', num: '9', title: 'Suivi & Archive', icon: FolderArchive, view: 'patients' }
  ];

  return (
    <div className="bg-white border-b border-slate-200 px-4 py-2.5 shadow-xs overflow-x-auto">
      <div className="flex items-center justify-between min-w-[850px] gap-2">
        <div className="flex items-center gap-2 pr-4 border-r border-slate-200">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-500"></span>
            Parcours Patient
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-1 justify-between">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isCurrent = currentView === step.view;
            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => onNavigate(step.view)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    isCurrent
                      ? 'bg-teal-50 text-teal-800 border border-teal-200 shadow-xs font-bold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isCurrent ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {step.num}
                  </span>
                  <Icon className="w-3.5 h-3.5" />
                  <span className="whitespace-nowrap">{step.title}</span>
                </button>

                {idx < steps.length - 1 && (
                  <span className="text-slate-300 text-xs select-none">→</span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

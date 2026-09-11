import React from 'react';
import {
  UserPlus,
  Activity,
  Stethoscope,
  FlaskConical,
  Pill,
  Receipt,
  ChevronRight,
  Route
} from 'lucide-react';

interface PatientJourneyBarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export const PatientJourneyBar: React.FC<PatientJourneyBarProps> = ({
  currentView,
  onNavigate
}) => {
  const steps = [
    {
      id: 'patients',
      label: '1. Admission & Dossier',
      icon: UserPlus,
      view: 'patients'
    },
    {
      id: 'vitals',
      label: '2. Constantes & Tri',
      icon: Activity,
      view: 'consultations'
    },
    {
      id: 'consultations',
      label: '3. Consultation',
      icon: Stethoscope,
      view: 'consultations'
    },
    {
      id: 'lab',
      label: '4. Laboratoire',
      icon: FlaskConical,
      view: 'lab'
    },
    {
      id: 'pharmacy',
      label: '5. Pharmacie',
      icon: Pill,
      view: 'pharmacy'
    },
    {
      id: 'billing',
      label: '6. Facturation',
      icon: Receipt,
      view: 'billing'
    }
  ];

  return (
    <div className="bg-white border-b border-slate-200/80 px-2 sm:px-3 py-2 sm:py-2.5 overflow-x-auto shrink-0 select-none">
      <div className="flex items-center gap-1 sm:gap-3 max-w-7xl mx-auto">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold uppercase tracking-wider shrink-0">
          <Route className="w-3.5 h-3.5 text-blue-600" />
          <span className="hidden sm:inline">Circuit :</span>
        </div>

        <div className="flex items-center gap-1">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive =
              currentView === step.view &&
              (step.id !== 'vitals' || currentView === 'consultations');

            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => onNavigate(step.view)}
                  title={step.label}
                  className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200/80 shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className="hidden md:inline">{step.label}</span>
                </button>

                {index < steps.length - 1 && (
                  <ChevronRight className="w-3 h-3 text-slate-300 shrink-0 hidden sm:block" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};


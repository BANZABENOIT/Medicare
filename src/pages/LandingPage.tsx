import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  ShieldCheck,
  Activity,
  Calendar,
  FlaskConical,
  Pill,
  CreditCard,
  HeartPulse,
  Clock,
  Phone,
  MapPin,
  Mail,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Lock,
  UserCheck,
  CheckCircle2,
  Building,
  Users
} from 'lucide-react';
import { ClinicSettings, User } from '../types';
import { LoginModal } from '../components/auth/LoginModal';

interface LandingPageProps {
  onLoginSuccess: (user: User) => void;
  settings: ClinicSettings;
  initialLoginEmail?: string;
  onClearInitialLogin?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onLoginSuccess,
  settings,
  initialLoginEmail,
  onClearInitialLogin
}) => {
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  // Si un email de compte backend est attendu (provenant de la bascule Personnel & Rôles),
  // on ouvre automatiquement la fenêtre de connexion avec cet email présélectionné.
  useEffect(() => {
    if (initialLoginEmail) {
      setIsLoginOpen(true);
    }
  }, [initialLoginEmail]);

  const keyFeatures = [
    {
      icon: Stethoscope,
      title: 'Consultations & DME Sécurisé',
      desc: 'Historique médical complet, antécédents, constantes vitales et codage diagnostique CIM-10.',
      color: 'text-blue-600 bg-blue-50'
    },
    {
      icon: Calendar,
      title: 'Gestion des Rendez-vous',
      desc: 'Planning dynamique par médecin, rappels automatiques et gestion fluide des files d\'attente.',
      color: 'text-indigo-600 bg-indigo-50'
    },
    {
      icon: FlaskConical,
      title: 'Laboratoire & Biologie',
      desc: 'Demandes d\'examens, saisie des résultats, détection des valeurs critiques et comptes-rendus.',
      color: 'text-amber-600 bg-amber-50'
    },
    {
      icon: Pill,
      title: 'Pharmacie & Stocks',
      desc: 'Délivrance d\'ordonnances, suivi des numéros de lot, dates de péremption et alertes de rupture.',
      color: 'text-emerald-600 bg-emerald-50'
    },
    {
      icon: CreditCard,
      title: 'Facturation & Encaissements',
      desc: 'Édition de factures conformes, gestion du tiers-payant, reçus de paiement et clôture de caisse.',
      color: 'text-sky-600 bg-sky-50'
    },
    {
      icon: ShieldCheck,
      title: 'Sécurité & Rôles RBAC',
      desc: 'Contrôle d\'accès par profil (médecin, infirmier, pharmacien, caissier) et journal d\'audit complet.',
      color: 'text-purple-600 bg-purple-50'
    }
  ];

  const specialties = [
    { name: 'Cardiologie', desc: 'Consultations spécialisées, ECG et bilans cardiovasculaires complets.' },
    { name: 'Pédiatrie & Néonatalogie', desc: 'Suivi de croissance, calendrier vaccinal et urgences pédiatriques.' },
    { name: 'Gynécologie & Obstétrique', desc: 'Suivi de grossesse, échographies et dépistages gynécologiques.' },
    { name: 'Médecine Générale', desc: 'Soins de premier recours, bilans de santé et orientation spécialisée.' },
    { name: 'Biologie Médicale', desc: 'Analyses biochimiques, hématologie, sérologie et bactériologie.' },
    { name: 'Chirurgie & Soins Ambulatoires', desc: 'Interventions programmées, pansements complexes et suivi post-op.' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-['Josefin_Sans'] text-slate-800 antialiased flex flex-col selection:bg-blue-600 selection:text-white">
      
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-600/25">
              MC
            </div>
            <div>
              <div className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-1">
                MediCare <span className="text-blue-600">Connect</span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {settings?.nom || 'Centre Médical & Hospitalier'}
              </p>
            </div>
          </div>

          {/* Quick Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#services" className="hover:text-blue-600 transition-colors">Services</a>
            <a href="#specialties" className="hover:text-blue-600 transition-colors">Spécialités</a>
            <a href="#urgences" className="hover:text-blue-600 transition-colors">Urgences</a>
            <a href="#contact" className="hover:text-blue-600 transition-colors">Contact</a>
          </nav>

          {/* Action CTA */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium border-r border-slate-200 pr-4">
              <Phone className="w-3.5 h-3.5 text-blue-600" />
              <span>{settings?.telephone || '+257 77 160 415'}</span>
            </div>

            <button
              onClick={() => setIsLoginOpen(true)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold rounded-full shadow-lg shadow-blue-600/25 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>Espace Professionnel</span>
            </button>
          </div>

        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-slate-200/60 bg-gradient-to-b from-white via-slate-50/50 to-slate-100/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-7 space-y-4 text-center lg:text-left">
              
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Système Intégré de Santé & Gestion Médicale</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                L'excellence médicale au service de vos <span className="text-blue-600">patients</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Bienvenue sur le portail de <strong>{settings?.nom || 'MediCare Connect'}</strong>. Une infrastructure médicale moderne unifiant dossier patient, consultations, ordonnances électroniques, laboratoire et facturation en temps réel.
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
                <button
                  onClick={() => setIsLoginOpen(true)}
                  className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-full shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2.5 transition-all cursor-pointer text-sm"
                >
                  <span>Connexion au Portail Médical</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <a
                  href="#services"
                  className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-100 text-slate-800 font-semibold rounded-full border border-slate-200 flex items-center justify-center gap-2 transition-colors text-sm shadow-xs"
                >
                  <span>Découvrir les Modules</span>
                </a>
              </div>

              {/* Key Metrics */}
              <div className="pt-8 border-t border-slate-200 grid grid-cols-3 gap-3 text-center lg:text-left">
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">24/7</div>
                  <div className="text-xs text-slate-500 font-medium">Service de Garde</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-blue-600">14+</div>
                  <div className="text-xs text-slate-500 font-medium">Modules Connectés</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600">100%</div>
                  <div className="text-xs text-slate-500 font-medium">Sécurité & Traçabilité</div>
                </div>
              </div>

            </div>

            {/* Hero Visual Card */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-3xl p-4 sm:p-8 shadow-2xl border border-slate-200/80 relative space-y-4">
                
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Centre Médical Opérationnel</h3>
                      <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Système en ligne
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">Dossiers Médicaux Actifs</div>
                        <div className="text-[11px] text-slate-500">Consultations, antécédents, constantes</div>
                      </div>
                    </div>
                    <span className="font-bold text-blue-600">Instantané</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <Pill className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">Pharmacie & Traçabilité</div>
                        <div className="text-[11px] text-slate-500">Gestion des lots & ordonnances</div>
                      </div>
                    </div>
                    <span className="font-bold text-emerald-600">Sécurisé</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                        <FlaskConical className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">Automates Laboratoire</div>
                        <div className="text-[11px] text-slate-500">Analyses biochimie, hématologie</div>
                      </div>
                    </div>
                    <span className="font-bold text-amber-600">Validé</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setIsLoginOpen(true)}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Se connecter avec vos identifiants</span>
                  </button>
                </div>

              </div>
            </div>

          </div>

        </div>
      </section>

      {/* Services / Modules Section */}
      <section id="services" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-xs font-bold text-blue-600 uppercase tracking-widest">
              Fonctionnalités Cliniques
            </h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Une plateforme complète pour tous les professionnels de santé
            </p>
            <p className="text-sm text-slate-500">
              Chaque module est conçu pour optimiser le temps des soignants et garantir la sécurité des soins.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {keyFeatures.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={idx}
                  className="p-4 rounded-3xl bg-slate-50 border border-slate-200/80 hover:bg-white hover:shadow-xl hover:border-blue-200 transition-all group space-y-4"
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${feat.color} shadow-xs`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {feat.title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      {feat.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* Specialties Section */}
      <section id="specialties" className="py-20 bg-slate-50 border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-xs font-bold text-blue-600 uppercase tracking-widest">
              Pôles d'Expertise
            </h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Nos spécialités médicales & chirurgicales
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {specialties.map((spec, i) => (
              <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{spec.name}</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {spec.desc}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Urgences & Contact Section */}
      <section id="urgences" className="py-16 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            
            <div className="md:col-span-2 space-y-3">
              <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider">
                Service des Urgences
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Une urgence médicale ?
              </h2>
              <p className="text-sm text-blue-100 max-w-xl">
                Notre service d'accueil des urgences et de garde médicale est joignable en permanence.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-center gap-3">
              <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-left w-full sm:w-auto">
                <div className="text-xs text-blue-200">Ligne Directe Urgences</div>
                <div className="text-xl font-bold font-mono text-white">
                  {settings?.telephone || '+257 77 160 415'}
                </div>
              </div>

              <button
                onClick={() => setIsLoginOpen(true)}
                className="px-6 py-3 bg-white text-blue-800 font-bold rounded-full text-xs hover:bg-blue-50 transition-all cursor-pointer shadow-lg"
              >
                Accéder à l'Accueil Hospitalier
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* Practical Details & Footer */}
      <footer id="contact" className="bg-white border-t border-slate-200 pt-12 pb-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            
            <div className="space-y-3 md:col-span-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                  MC
                </div>
                <span className="font-bold text-base text-slate-900">MediCare Connect</span>
              </div>
              <p className="text-xs text-slate-500 max-w-sm">
                Système d'information hospitalier et de gestion de cabinet médical moderne et sécurisé.
              </p>
              <div className="text-[11px] text-slate-400">
                N° d'Agrément : <strong className="text-slate-600">{settings?.numero_agrement || 'AGR-2026-MSP-08492'}</strong>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-slate-800 text-xs">Coordonnées</h4>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{settings?.adresse || 'Avenue de l\'Uprona, Bujumbura'}, {settings?.ville || 'Bujumbura'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{settings?.telephone || '+257 77 160 415'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{settings?.email || 'contact@medicare.bi'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-slate-800 text-xs">Accès Personnel</h4>
              <p className="text-[11px] text-slate-500">
                Réservé aux praticiens, infirmiers, biologistes, pharmaciens et administrateurs.
              </p>
              <button
                onClick={() => setIsLoginOpen(true)}
                className="mt-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-blue-600" />
                <span>Portail Soignants</span>
              </button>
            </div>

          </div>

          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
            <div>
              © {new Date().getFullYear()} {settings?.nom || 'MediCare Connect'}. Tous droits réservés.
            </div>
            <div className="flex items-center gap-3">
              <span>Confidentialité Protégée</span>
              <span>•</span>
              <span>Normes Santé du Burundi</span>
            </div>
          </div>

        </div>
      </footer>

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => {
          setIsLoginOpen(false);
          onClearInitialLogin?.();
        }}
        onLoginSuccess={(user) => {
          setIsLoginOpen(false);
          onLoginSuccess(user);
        }}
        settings={settings}
        presetEmail={initialLoginEmail}
      />

    </div>
  );
};

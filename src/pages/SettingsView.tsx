import React, { useState } from 'react';
import {
  Building,
  Save,
  RotateCcw,
  Download,
  Database,
  CheckCircle2,
  RefreshCw,
  Server,
  HardDrive
} from 'lucide-react';
import { apiService, getApiConfig, isBackendActive, setBackendActive } from '../services/apiService';
import { hydrateFromBackend, restoreLocalData } from '../services/backendSync';
import { toast } from '../components/ui/Toast';
import { ClinicSettings } from '../types';

interface SettingsViewProps {
  settings: ClinicSettings;
  onUpdateSettings: (newSettings: ClinicSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings
}) => {
  const [formData, setFormData] = useState<ClinicSettings>({ ...settings });
  const [isSaved, setIsSaved] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const backendActive = isBackendActive();
  const canBackend = backendActive || !!(getApiConfig().accessToken);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    apiService.settings.update(formData);
    onUpdateSettings(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleResetData = () => {
    if (window.confirm('Voulez-vous réinitialiser toutes les données de MediCare Connect ?')) {
      apiService.resetAllData();
      window.location.reload();
    }
  };

  // Synchronise / réinitialise les données depuis le backend. Fonctionne aussi pour
  // « revenir » en mode backend depuis le mode local, tant qu'une session backend (token) existe.
  const handleBackendSync = async () => {
    if (!getApiConfig().accessToken) {
      // Aucune session backend active : on ne touche pas aux données locales.
      toast.info('Compte en mode local : les données locales actuelles sont conservées.');
      return;
    }

    if (!window.confirm('Voulez-vous re-synchroniser toutes les données depuis le backend Django ?')) {
      return;
    }

    setIsSyncing(true);
    // Repasse explicitement en mode backend (retour possible depuis le local).
    setBackendActive(true);
    toast.info('Synchronisation des données depuis le backend en cours...', { duration: 2000 });
    try {
      await hydrateFromBackend();
      // hydrateFromBackend désactive le backend sur erreur réseau (repli local automatique).
      if (isBackendActive()) {
        toast.success('Données synchronisées depuis le backend avec succès.');
        window.location.reload();
      } else {
        toast.error('Backend injoignable : repli sur les données locales.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de la synchronisation avec le backend.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Bascule haut niveau : mode LOCAL ⇄ mode BACKEND.
  // En mode local on restaure les données locales sauvegardées ; en mode backend on ré-écrase
  // avec les données du serveur Django. On recharge ensuite la page pour recalculer l'affichage.
  const handleSwitchToLocal = () => {
    if (!window.confirm('Passer en mode local ?\n\nLes données du backend resteront enregistrées sur le serveur, et les données locales de ce navigateur seront restaurées et réaffichées.')) {
      return;
    }
    setBackendActive(false);
    restoreLocalData();
    window.location.reload();
  };

  const handleSwitchToBackend = async () => {
    if (!window.confirm('Passer en mode backend ?\n\nLes données locales seront masquées et remplacées par celles du serveur Django.')) {
      return;
    }
    setBackendActive(true);
    setIsSyncing(true);
    toast.info('Chargement des données depuis le backend...', { duration: 2000 });
    try {
      await hydrateFromBackend();
    } catch {
      // hydrateFromBackend gère déjà le repli local en cas d'erreur réseau.
    } finally {
      setIsSyncing(false);
    }
    window.location.reload();
  };

  const handleExportJSON = () => {
    const data = {
      patients: apiService.patients.getAll(),
      appointments: apiService.appointments.getAll(),
      consultations: apiService.consultations.getAll(),
      prescriptions: apiService.prescriptions.getAll(),
      medications: apiService.medications.getAll(),
      invoices: apiService.billing.getInvoices(),
      settings: formData
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medicare_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      
      {/* Header */}
      <div className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">
            Paramètres de l'établissement
          </h1>
          <p className="text-xs text-slate-500">
            Configuration de l'établissement et gestion des données
          </p>
        </div>

        {isSaved && (
          <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full font-semibold text-xs flex items-center gap-1.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Paramètres enregistrés avec succès !</span>
          </div>
        )}
      </div>

      {/* Main Settings Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        
        {/* Form Left 2 Cols */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Clinic Profile Form */}
          <div className="glass-card p-4 space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm pb-2 border-b border-slate-100">
                <Building className="w-4 h-4 text-blue-600" />
                <span>Identité & Coordonnées de l'Établissement</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nom de l'Établissement *</label>
                  <input
                    type="text"
                    required
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Slogan / Sous-titre</label>
                  <input
                    type="text"
                    value={formData.slogan}
                    onChange={(e) => setFormData({ ...formData, slogan: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">N° d'Agrément Ministère Santé *</label>
                  <input
                    type="text"
                    required
                    value={formData.numero_agrement}
                    onChange={(e) => setFormData({ ...formData, numero_agrement: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-blue-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Devise Monétaire *</label>
                  <input
                    type="text"
                    required
                    value={formData.devise}
                    onChange={(e) => setFormData({ ...formData, devise: e.target.value })}
                    placeholder="FBu, USD, EUR..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">Adresse Géographique</label>
                  <input
                    type="text"
                    value={formData.adresse}
                    onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Ville</label>
                  <input
                    type="text"
                    value={formData.ville}
                    onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Téléphone Standard</label>
                  <input
                    type="text"
                    value={formData.telephone}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Email Officiel</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Enregistrer les Coordonnées</span>
                </button>
              </div>

            </form>
          </div>

        </div>

        {/* Right 1 Col: Data Management & Architecture overview */}
        <div className="space-y-4">
          
          {/* Data Maintenance */}
          <div className="glass-card p-4 space-y-4 text-xs">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
              <Database className="w-4 h-4 text-blue-600" />
              <span>Gestion des Données & Sauvegarde</span>
            </div>

            <p className="text-slate-500 leading-relaxed">
              Les comptes de démonstration utilisent des données locales sécurisées dans le navigateur.
              Les comptes authentifiés via le serveur Django peuvent re-synchroniser leurs données à tout moment.
              Vous pouvez aussi exporter l'ensemble des données (patients, consultations, factures) au format JSON standard.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <span className="text-slate-500">Mode actuel :</span>
              {backendActive ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                  <Server className="w-3 h-3" />BACKEND
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                  <HardDrive className="w-3 h-3" />LOCAL
                </span>
              )}
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleExportJSON}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-full font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-blue-600" />
                <span>Exporter Sauvegarde (JSON)</span>
              </button>

              <button
                type="button"
                onClick={handleBackendSync}
                disabled={isSyncing}
                className="w-full py-2.5 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 rounded-full font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
              >
                {isSyncing ? (
                  <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                ) : (
                  <Server className="w-4 h-4 text-blue-600" />
                )}
                <span>{isSyncing ? 'Synchronisation...' : 'Synchroniser depuis le Backend'}</span>
              </button>

              {canBackend && backendActive && (
                <button
                  type="button"
                  onClick={handleSwitchToLocal}
                  disabled={isSyncing}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-full font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
                >
                  <HardDrive className="w-4 h-4 text-slate-600" />
                  <span>Basculer en Données Locales</span>
                </button>
              )}
              {canBackend && !backendActive && (
                <button
                  type="button"
                  onClick={handleSwitchToBackend}
                  disabled={isSyncing}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-full font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
                >
                  <Server className="w-4 h-4 text-blue-600" />
                  <span>Basculer en Données Backend</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleResetData}
                className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-full font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Réinitialiser les Données</span>
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};


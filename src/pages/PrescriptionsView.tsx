import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  Printer,
  CheckCircle2,
  Clock,
  Pill,
  Trash2,
  User,
  Stethoscope,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { apiService } from '../services/apiService';
import { syncPrescriptionCreate } from '../services/backendSync';
import { toast } from '../components/ui/Toast';
import { Prescription, Patient, Doctor, Medication, ClinicSettings } from '../types';

interface PrescriptionsViewProps {
  onPrintDocument?: (type: any, data: any, title: string) => void;
  settings: ClinicSettings;
}

export const PrescriptionsView: React.FC<PrescriptionsViewProps> = ({
  onPrintDocument,
  settings
}) => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: '',
    doctor_id: '',
    date: new Date().toISOString().split('T')[0],
    instructions_generales: 'Respecter scrupuleusement la posologie.',
    items: [] as {
      medicament_id: string;
      medicament_nom: string;
      forme: string;
      dosage: string;
      posologie: string;
      frequence: string;
      duree: string;
      instructions: string;
      quantite_prescrite: number;
    }[]
  });

  const loadData = () => {
    setPrescriptions(apiService.prescriptions.getAll());
    setPatients(apiService.patients.getAll());
    setDoctors(apiService.doctors.getAll());
    setMedications(apiService.medications.getAll());
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('medicare_data_updated', handleUpdate);
    return () => window.removeEventListener('medicare_data_updated', handleUpdate);
  }, []);

  const handleAddItem = (medId: string) => {
    const med = medications.find(m => m.id === medId);
    if (!med) return;
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          medicament_id: med.id,
          medicament_nom: med.nom,
          forme: med.forme,
          dosage: med.dosage,
          posologie: '1 unité',
          frequence: 'Matin et Soir',
          duree: '5 jours',
          instructions: 'Pendant les repas',
          quantite_prescrite: 1
        }
      ]
    });
  };

  const handleRemoveItem = (index: number) => {
    const next = [...formData.items];
    next.splice(index, 1);
    setFormData({ ...formData, items: next });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const pat = patients.find(p => p.id === formData.patient_id);
    const doc = doctors.find(d => d.id === formData.doctor_id);

    if (!pat || !doc || formData.items.length === 0) {
      toast.error('Veuillez sélectionner un patient, un médecin et au moins un médicament.');
      return;
    }

    const created = apiService.prescriptions.create({
      patient_id: pat.id,
      patient_nom: `${pat.nom} ${pat.prenom}`,
      patient_age: pat.age,
      doctor_id: doc.id,
      doctor_nom: `${doc.titre || 'Dr.'} ${doc.prenom} ${doc.nom}`,
      doctor_specialite: doc.specialite,
      date: formData.date,
      statut: 'validee',
      instructions_generales: formData.instructions_generales,
      items: formData.items.map((it, idx) => ({
        id: `item-${Date.now()}-${idx}`,
        ...it,
        delivre: false
      }))
    });

    setIsCreating(false);
    syncPrescriptionCreate(created);
  };

  const handleStatusChange = (id: string, statut: Prescription['statut']) => {
    apiService.prescriptions.updateStatus(id, statut);
  };

  const filtered = prescriptions.filter((p) => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      p.numero.toLowerCase().includes(q) ||
      p.patient_nom.toLowerCase().includes(q) ||
      p.doctor_nom.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || p.statut === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-4">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-['Josefin_Sans']">
            Ordonnances & Prescriptions Médicales
          </h1>
          <p className="text-xs text-slate-500">
            Gestion du circuit du médicament, validation médicale et impression des ordonnances sécurisées
          </p>
        </div>

        <button
          onClick={() => {
            if (patients.length > 0 && doctors.length > 0) {
              setFormData(prev => ({
                ...prev,
                patient_id: patients[0].id,
                doctor_id: doctors[0].id
              }));
            }
            setIsCreating(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Rédiger une Ordonnance</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 text-xs">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par N° ordonnance, patient, médecin..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium">Statut:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-700"
          >
            <option value="all">Tous les statuts</option>
            <option value="validee">Validées (En attente délivrance)</option>
            <option value="delivree">Délivrées par la pharmacie</option>
            <option value="brouillon">Brouillons</option>
            <option value="annulee">Annulées</option>
          </select>
        </div>
      </div>

      {/* Prescriptions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((ord) => (
          <div key={ord.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-teal-800 text-sm">{ord.numero}</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    ord.statut === 'delivree'
                      ? 'bg-emerald-100 text-emerald-800'
                      : ord.statut === 'validee'
                      ? 'bg-teal-100 text-teal-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {ord.statut === 'delivree' ? 'Délivrée' : ord.statut === 'validee' ? 'Validée' : ord.statut}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm mt-1">{ord.patient_nom}</h3>
                <span className="text-[11px] text-slate-500">Date: {ord.date}</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-800 block">{ord.doctor_nom}</span>
                <span className="text-[11px] text-teal-700">{ord.doctor_specialite}</span>
              </div>
            </div>

            {/* Prescribed Drugs List */}
            <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs">
              {(ord.items || []).map((it, idx) => (
                <div key={idx} className="flex items-start justify-between">
                  <div>
                    <span className="font-bold text-slate-900">{it.medicament_nom} {it.dosage}</span>
                    <p className="text-[11px] text-slate-600">
                      {it.posologie} — {it.frequence} ({it.duree})
                    </p>
                    {it.instructions && <p className="text-[10px] text-slate-400 italic">{it.instructions}</p>}
                  </div>
                  <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600">
                    Qté: {it.quantite_prescrite}
                  </span>
                </div>
              ))}
            </div>

            {ord.instructions_generales && (
              <p className="text-[11px] text-slate-500 italic bg-teal-50/50 p-2 rounded-lg border border-teal-100">
                Note: {ord.instructions_generales}
              </p>
            )}

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <div>
                {ord.statut === 'validee' && (
                  <button
                    onClick={() => handleStatusChange(ord.id, 'delivree')}
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg font-bold flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Valider délivrance pharmacie</span>
                  </button>
                )}
              </div>

              {onPrintDocument && (
                <button
                  onClick={() => onPrintDocument('prescription', ord, 'Ordonnance Médicale')}
                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer l’Ordonnance</span>
                </button>
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-2 py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            Aucune ordonnance trouvée.
          </div>
        )}
      </div>

      {/* NEW PRESCRIPTION MODAL */}
      {isCreating && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-['Josefin_Sans']">
                  Rédiger une Ordonnance Médicale
                </h3>
                <p className="text-xs text-slate-500">Ajoutez les spécialités pharmaceutiques et posologies</p>
              </div>
              <button
                onClick={() => setIsCreating(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Patient *</label>
                  <select
                    required
                    value={formData.patient_id}
                    onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                  >
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.nom} {p.prenom} ({p.numero})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Médecin Prescripteur *</label>
                  <select
                    required
                    value={formData.doctor_id}
                    onChange={(e) => setFormData({ ...formData, doctor_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-teal-800"
                  >
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>{d.titre || 'Dr.'} {d.nom} ({d.specialite})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Add Meds */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Médicaments Prescrits ({formData.items.length})</span>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddItem(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="px-3 py-1.5 bg-teal-50 border border-teal-200 rounded-lg text-teal-900 font-bold"
                  >
                    <option value="">+ Sélectionner un médicament...</option>
                    {medications.map(m => (
                      <option key={m.id} value={m.id}>{m.nom} ({m.forme} - {m.dosage})</option>
                    ))}
                  </select>
                </div>

                {formData.items.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span>{item.medicament_nom} {item.dosage}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500">Posologie</label>
                        <input
                          type="text"
                          value={item.posologie}
                          onChange={(e) => {
                            const copy = [...formData.items];
                            copy[idx].posologie = e.target.value;
                            setFormData({ ...formData, items: copy });
                          }}
                          className="w-full px-2 py-1 bg-white border rounded text-[11px]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500">Fréquence</label>
                        <input
                          type="text"
                          value={item.frequence}
                          onChange={(e) => {
                            const copy = [...formData.items];
                            copy[idx].frequence = e.target.value;
                            setFormData({ ...formData, items: copy });
                          }}
                          className="w-full px-2 py-1 bg-white border rounded text-[11px]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500">Durée</label>
                        <input
                          type="text"
                          value={item.duree}
                          onChange={(e) => {
                            const copy = [...formData.items];
                            copy[idx].duree = e.target.value;
                            setFormData({ ...formData, items: copy });
                          }}
                          className="w-full px-2 py-1 bg-white border rounded text-[11px]"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {formData.items.length === 0 && (
                  <div className="text-center py-6 border border-dashed border-slate-300 rounded-xl text-slate-400">
                    Aucun médicament sélectionné. Utilisez le menu ci-dessus pour ajouter des spécialités.
                  </div>
                )}
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Instructions Générales au Patient</label>
                <textarea
                  rows={2}
                  value={formData.instructions_generales}
                  onChange={(e) => setFormData({ ...formData, instructions_generales: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-white bg-teal-600 hover:bg-teal-700 rounded-xl font-bold transition-colors shadow-xs"
                >
                  Valider l'Ordonnance
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};

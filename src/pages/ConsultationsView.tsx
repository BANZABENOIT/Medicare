import {
  Activity,
  ChevronRight,
  FlaskConical,
  Pill,
  Plus,
  Printer,
  Search,
  Trash2,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "../components/ui/Toast";
import { apiService } from "../services/apiService";
import {
  refreshAfterBackendWrite,
  syncConsultationCreate,
  syncLabRequestCreate,
  syncPrescriptionCreate,
} from "../services/backendSync";
import {
  ClinicSettings,
  Consultation,
  Doctor,
  Medication,
  Patient,
} from "../types";

interface ConsultationsViewProps {
  initialPatient?: Patient | null;
  onPrintDocument?: (type: any, data: any, title: string) => void;
  settings: ClinicSettings;
}

export const ConsultationsView: React.FC<ConsultationsViewProps> = ({
  initialPatient,
  onPrintDocument,
  settings,
}) => {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Selected Consultation for Detailed Drawer
  const [selectedConsultation, setSelectedConsultation] =
    useState<Consultation | null>(null);

  // New Consultation Form State
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: "",
    doctor_id: "",
    date: new Date().toISOString().split("T")[0],
    heure: "10:00",
    motif: "",
    histoire_maladie: "",
    symptomes: [] as string[],
    symptomeInput: "",
    // Vitals
    tension_systolique: 120,
    tension_diastolique: 80,
    pouls: 72,
    temperature: 37.0,
    poids: 70,
    taille: 175,
    spo2: 99,
    glycemie_capillaire: "",
    // Clinical
    examen_physique: "",
    diagnostic_principal: "",
    code_cim10: "",
    plan_traitement: "",
    notes_medicales: "",
    arret_travail_jours: 0,
    // Optional Integrated Prescription
    includePrescription: false,
    prescriptionInstructions: "Prendre selon posologie indiquée.",
    prescriptionItems: [] as {
      medicament_id: string;
      medicament_nom: string;
      forme: string;
      dosage: string;
      posologie: string;
      frequence: string;
      duree: string;
      instructions: string;
      quantite_prescrite: number;
    }[],
    // Optional Integrated Lab Request
    includeLabRequest: false,
    labExamenNom: "Numération Formule Sanguine (NFS) + CRP",
    labCategorie: "Hématologie" as const,
    labPriorite: "normale" as "normale" | "urgente",
  });

  const loadData = () => {
    setConsultations(apiService.consultations.getAll());
    const allPatients = apiService.patients.getAll();
    const allDoctors = apiService.doctors.getAll();
    setPatients(allPatients);
    setDoctors(allDoctors);
    setMedications(apiService.medications.getAll());

    if (initialPatient && !isCreating) {
      setFormData((prev) => ({
        ...prev,
        patient_id: initialPatient.id,
        doctor_id: allDoctors[0]?.id || "",
      }));
      setIsCreating(true);
    }
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener("medicare_data_updated", handleUpdate);
    return () =>
      window.removeEventListener("medicare_data_updated", handleUpdate);
  }, [initialPatient]);

  // Common ICD-10 quick codes
  const icd10Suggestions = [
    { code: "I10", label: "Hypertension artérielle essentielle" },
    { code: "E11.9", label: "Diabète de type 2 sans complication" },
    {
      code: "J06.9",
      label: "Infection aiguë des voies respiratoires supérieures",
    },
    { code: "J45.9", label: "Asthme, sans précision" },
    { code: "K29.7", label: "Gastrite, sans précision" },
    { code: "M54.5", label: "Lombalgie commune" },
    { code: "R50.9", label: "Fièvre, sans précision" },
    { code: "A09", label: "Gastro-entérite infectieuse" },
  ];

  // Calculate IMC
  const calculatedIMC =
    formData.poids && formData.taille
      ? Number((formData.poids / Math.pow(formData.taille / 100, 2)).toFixed(1))
      : undefined;

  const handleAddSymptom = () => {
    if (
      formData.symptomeInput.trim() &&
      !formData.symptomes.includes(formData.symptomeInput.trim())
    ) {
      setFormData({
        ...formData,
        symptomes: [...formData.symptomes, formData.symptomeInput.trim()],
        symptomeInput: "",
      });
    }
  };

  const handleAddPrescriptionItem = (medId: string) => {
    const med = medications.find((m) => m.id === medId);
    if (!med) return;
    setFormData({
      ...formData,
      prescriptionItems: [
        ...formData.prescriptionItems,
        {
          medicament_id: med.id,
          medicament_nom: med.nom,
          forme: med.forme,
          dosage: med.dosage,
          posologie: "1 comprimé",
          frequence: "Matin et Soir",
          duree: "7 jours",
          instructions: "Au cours des repas",
          quantite_prescrite: 1,
        },
      ],
    });
  };

  const handleRemovePrescriptionItem = (idx: number) => {
    const updated = [...formData.prescriptionItems];
    updated.splice(idx, 1);
    setFormData({ ...formData, prescriptionItems: updated });
  };

  const handleCreateConsultation = (e: React.FormEvent) => {
    e.preventDefault();
    const pat = patients.find((p) => p.id === formData.patient_id);
    const doc = doctors.find((d) => d.id === formData.doctor_id);

    if (!pat || !doc || !formData.motif || !formData.diagnostic_principal) {
      toast.error(
        "Veuillez sélectionner un patient, un médecin, un motif et un diagnostic principal.",
      );
      return;
    }

    let ordonnanceId: string | undefined = undefined;
    let labId: string | undefined = undefined;

    // 1. Create prescription if requested
    if (formData.includePrescription && formData.prescriptionItems.length > 0) {
      const newPrescription = apiService.prescriptions.create({
        patient_id: pat.id,
        patient_nom: `${pat.nom} ${pat.prenom}`,
        patient_age: pat.age,
        doctor_id: doc.id,
        doctor_nom: `${doc.titre || "Dr."} ${doc.prenom} ${doc.nom}`,
        doctor_specialite: doc.specialite,
        date: formData.date,
        statut: "validee",
        instructions_generales: formData.prescriptionInstructions,
        items: formData.prescriptionItems.map((it, i) => ({
          id: `item-${Date.now()}-${i}`,
          ...it,
          delivre: false,
        })),
      });
      ordonnanceId = newPrescription.id;
      void syncPrescriptionCreate(newPrescription).then(
        refreshAfterBackendWrite,
      );
    }

    // 2. Create lab request if requested
    if (formData.includeLabRequest && formData.labExamenNom) {
      const newLab = apiService.lab.createRequest({
        patient_id: pat.id,
        patient_nom: `${pat.nom} ${pat.prenom}`,
        doctor_id: doc.id,
        doctor_nom: `${doc.titre || "Dr."} ${doc.prenom} ${doc.nom}`,
        examen_code: "LAB-REQ",
        examen_nom: formData.labExamenNom,
        categorie: formData.labCategorie,
        priorite: formData.labPriorite,
        statut: "demandee",
        renseignements_cliniques: `Prescrit lors de la consultation : ${formData.diagnostic_principal}`,
        date_demande: formData.date,
        resultats: [],
      });
      labId = newLab.id;
      void syncLabRequestCreate(newLab).then(refreshAfterBackendWrite);
    }

    // 3. Create consultation
    const newConsultation = apiService.consultations.create({
      patient_id: pat.id,
      patient_nom: `${pat.nom} ${pat.prenom}`,
      patient_numero: pat.numero,
      doctor_id: doc.id,
      doctor_nom: `${doc.titre || "Dr."} ${doc.prenom} ${doc.nom}`,
      doctor_specialite: doc.specialite,
      date: formData.date,
      heure: formData.heure,
      motif: formData.motif,
      histoire_maladie: formData.histoire_maladie,
      symptomes: formData.symptomes,
      constantes: {
        tension_systolique: formData.tension_systolique,
        tension_diastolique: formData.tension_diastolique,
        pouls: formData.pouls,
        temperature: formData.temperature,
        poids: formData.poids,
        taille: formData.taille,
        imc: calculatedIMC,
        spo2: formData.spo2,
        glycemie_capillaire: formData.glycemie_capillaire
          ? Number(formData.glycemie_capillaire)
          : undefined,
      },
      examen_physique: formData.examen_physique,
      diagnostic_principal: formData.diagnostic_principal,
      code_cim10: formData.code_cim10,
      plan_traitement: formData.plan_traitement,
      notes_medicales: formData.notes_medicales,
      arret_travail_jours: formData.arret_travail_jours,
      ordonnance_id: ordonnanceId,
      demande_labo_id: labId,
    });

    setIsCreating(false);
    setSelectedConsultation(newConsultation);
    void syncConsultationCreate(newConsultation).then(refreshAfterBackendWrite);
  };

  const filtered = consultations.filter((c) => {
    const q = searchTerm.toLowerCase();
    return (
      c.patient_nom.toLowerCase().includes(q) ||
      c.doctor_nom.toLowerCase().includes(q) ||
      c.diagnostic_principal.toLowerCase().includes(q) ||
      (c.code_cim10 && c.code_cim10.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-['Josefin_Sans']">
            Consultations & Soins Médicaux
          </h1>
          <p className="text-xs text-slate-500">
            Enregistrement des actes médicaux, constantes vitales, diagnostics
            CIM-10 et prescriptions
          </p>
        </div>

        <button
          onClick={() => {
            if (patients.length > 0 && doctors.length > 0) {
              setFormData((prev) => ({
                ...prev,
                patient_id: patients[0].id,
                doctor_id: doctors[0].id,
              }));
            }
            setIsCreating(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle Consultation</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par patient, praticien, diagnostic CIM-10..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Consultations List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((cst) => (
          <div
            key={cst.id}
            onClick={() => setSelectedConsultation(cst)}
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-teal-300 transition-all cursor-pointer space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs text-slate-400 block font-mono">
                  {cst.date} • {cst.heure}
                </span>
                <h3 className="font-bold text-slate-900 text-sm mt-0.5">
                  {cst.patient_nom}
                </h3>
                <span className="text-[11px] text-teal-700 font-semibold">
                  {cst.patient_numero}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-800 block">
                  {cst.doctor_nom}
                </span>
                <span className="text-[10px] text-slate-400">
                  {cst.doctor_specialite}
                </span>
              </div>
            </div>

            <div className="p-3 bg-teal-50/50 rounded-xl border border-teal-100/60">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-xs">
                  {cst.diagnostic_principal}
                </span>
                {cst.code_cim10 && (
                  <span className="px-1.5 py-0.5 bg-teal-200/70 text-teal-900 font-mono font-bold rounded text-[10px]">
                    {cst.code_cim10}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 mt-1 italic line-clamp-2">
                Motif: {cst.motif}
              </p>
            </div>

            {cst.constantes && (
              <div className="grid grid-cols-4 gap-2 text-center text-[10px] bg-slate-50 p-2 rounded-lg text-slate-600">
                <div>
                  <span className="block text-slate-400">Tension</span>
                  <strong>
                    {cst.constantes.tension_systolique}/
                    {cst.constantes.tension_diastolique}
                  </strong>
                </div>
                <div>
                  <span className="block text-slate-400">Pouls</span>
                  <strong>{cst.constantes.pouls} bpm</strong>
                </div>
                <div>
                  <span className="block text-slate-400">T°</span>
                  <strong>{cst.constantes.temperature} °C</strong>
                </div>
                <div>
                  <span className="block text-slate-400">IMC</span>
                  <strong>{cst.constantes.imc || "—"}</strong>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <div className="flex gap-2">
                {cst.ordonnance_id && (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-[10px] flex items-center gap-1">
                    <Pill className="w-3 h-3" /> Ordonnance
                  </span>
                )}
                {cst.demande_labo_id && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-semibold text-[10px] flex items-center gap-1">
                    <FlaskConical className="w-3 h-3" /> Labo
                  </span>
                )}
              </div>

              <span className="text-teal-600 font-bold text-xs flex items-center gap-0.5">
                Détails <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-2 py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            Aucune consultation enregistrée.
          </div>
        )}
      </div>

      {/* FULL RECORD MODAL / DRAWER */}
      {selectedConsultation && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-teal-400 font-mono">
                  Dossier de Consultation • {selectedConsultation.date}
                </span>
                <h3 className="text-lg font-bold font-['Josefin_Sans']">
                  {selectedConsultation.patient_nom}
                </h3>
                <p className="text-xs text-slate-300">
                  Praticien : {selectedConsultation.doctor_nom} (
                  {selectedConsultation.doctor_specialite})
                </p>
              </div>
              <div className="flex items-center gap-2">
                {onPrintDocument && (
                  <button
                    onClick={() =>
                      onPrintDocument(
                        "consultation_summary",
                        selectedConsultation,
                        "Compte-Rendu de Consultation",
                      )
                    }
                    className="px-3 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 rounded-lg flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimer</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedConsultation(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <strong className="text-slate-800 block mb-1">
                  Motif & Histoire :
                </strong>
                <p className="text-slate-700">{selectedConsultation.motif}</p>
                {selectedConsultation.histoire_maladie && (
                  <p className="text-slate-500 mt-1 italic">
                    {selectedConsultation.histoire_maladie}
                  </p>
                )}
              </div>

              {selectedConsultation.constantes && (
                <div className="p-4 bg-teal-50/60 rounded-xl border border-teal-200 space-y-2">
                  <span className="font-bold text-teal-900 block">
                    Constantes Physiologiques
                  </span>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-slate-700">
                    <div className="bg-white p-2 rounded-lg border border-teal-100">
                      <span className="text-[10px] text-slate-400 block">
                        Tension
                      </span>
                      <strong>
                        {selectedConsultation.constantes.tension_systolique}/
                        {selectedConsultation.constantes.tension_diastolique}
                      </strong>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-teal-100">
                      <span className="text-[10px] text-slate-400 block">
                        Pouls
                      </span>
                      <strong>
                        {selectedConsultation.constantes.pouls} bpm
                      </strong>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-teal-100">
                      <span className="text-[10px] text-slate-400 block">
                        Température
                      </span>
                      <strong>
                        {selectedConsultation.constantes.temperature} °C
                      </strong>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-teal-100">
                      <span className="text-[10px] text-slate-400 block">
                        Poids
                      </span>
                      <strong>
                        {selectedConsultation.constantes.poids} kg
                      </strong>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-teal-100">
                      <span className="text-[10px] text-slate-400 block">
                        Taille
                      </span>
                      <strong>
                        {selectedConsultation.constantes.taille} cm
                      </strong>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-teal-100">
                      <span className="text-[10px] text-slate-400 block">
                        IMC
                      </span>
                      <strong>
                        {selectedConsultation.constantes.imc || "—"}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 block">
                  Diagnostic Médical
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-teal-800">
                    {selectedConsultation.diagnostic_principal}
                  </span>
                  {selectedConsultation.code_cim10 && (
                    <span className="px-2 py-0.5 bg-teal-100 text-teal-900 font-mono font-bold rounded">
                      CIM-10: {selectedConsultation.code_cim10}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <strong className="text-slate-800 block">
                  Plan de Traitement :
                </strong>
                <p className="text-slate-700 whitespace-pre-line leading-relaxed">
                  {selectedConsultation.plan_traitement}
                </p>
              </div>

              {selectedConsultation.notes_medicales && (
                <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 text-amber-900">
                  <strong className="block mb-1">
                    Notes Médicales Internes :
                  </strong>
                  <p>{selectedConsultation.notes_medicales}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NEW CONSULTATION COMPREHENSIVE FORM */}
      {isCreating && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-['Josefin_Sans']">
                  Dossier de Consultation Médicale
                </h3>
                <p className="text-xs text-slate-500">
                  Prise des constantes, diagnostic CIM-10, prescription et
                  examens
                </p>
              </div>
              <button
                onClick={() => setIsCreating(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleCreateConsultation}
              className="flex-1 overflow-y-auto p-4 space-y-5 text-xs"
            >
              {/* 1. Patient & Doctor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Patient *
                  </label>
                  <select
                    required
                    value={formData.patient_id}
                    onChange={(e) =>
                      setFormData({ ...formData, patient_id: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800"
                  >
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nom} {p.prenom} ({p.numero})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Praticien Soignant *
                  </label>
                  <select
                    required
                    value={formData.doctor_id}
                    onChange={(e) =>
                      setFormData({ ...formData, doctor_id: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-teal-800"
                  >
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.titre || "Dr."} {d.nom} ({d.specialite})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 2. Motif & Symptômes */}
              <div className="space-y-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Motif de consultation *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.motif}
                    onChange={(e) =>
                      setFormData({ ...formData, motif: e.target.value })
                    }
                    placeholder="Ex: Douleurs thoraciques atypiques, Céphalées persistantes, etc."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Histoire de la maladie
                  </label>
                  <textarea
                    rows={2}
                    value={formData.histoire_maladie}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        histoire_maladie: e.target.value,
                      })
                    }
                    placeholder="Circonstances de survenue, durée des symptômes, traitements antérieurs..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              {/* 3. Constantes Vitales */}
              <div className="p-4 bg-teal-50/50 rounded-xl border border-teal-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-teal-900 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-teal-600" /> Prise des
                    Constantes Vitales
                  </span>
                  {calculatedIMC && (
                    <span className="font-bold text-teal-800 text-[11px] bg-teal-200/60 px-2 py-0.5 rounded">
                      IMC Calculé : {calculatedIMC} kg/m²
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-600 block mb-1">
                      Tension Systolique (mmHg)
                    </label>
                    <input
                      type="number"
                      value={formData.tension_systolique}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          tension_systolique: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-1.5 bg-white border border-teal-200 rounded-lg font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600 block mb-1">
                      Tension Diastolique (mmHg)
                    </label>
                    <input
                      type="number"
                      value={formData.tension_diastolique}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          tension_diastolique: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-1.5 bg-white border border-teal-200 rounded-lg font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600 block mb-1">
                      Pouls (bpm)
                    </label>
                    <input
                      type="number"
                      value={formData.pouls}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          pouls: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-1.5 bg-white border border-teal-200 rounded-lg font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600 block mb-1">
                      Température (°C)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.temperature}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          temperature: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-1.5 bg-white border border-teal-200 rounded-lg font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600 block mb-1">
                      Poids (kg)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={formData.poids}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          poids: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-1.5 bg-white border border-teal-200 rounded-lg font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600 block mb-1">
                      Taille (cm)
                    </label>
                    <input
                      type="number"
                      value={formData.taille}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          taille: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-1.5 bg-white border border-teal-200 rounded-lg font-bold text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Diagnostic & CIM-10 */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="font-semibold text-slate-700 block mb-1">
                      Diagnostic Principal *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.diagnostic_principal}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          diagnostic_principal: e.target.value,
                        })
                      }
                      placeholder="Ex: Hypertension artérielle essentielle stade 1"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Code CIM-10
                    </label>
                    <input
                      type="text"
                      value={formData.code_cim10}
                      onChange={(e) =>
                        setFormData({ ...formData, code_cim10: e.target.value })
                      }
                      placeholder="Ex: I10"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-teal-800"
                    />
                  </div>
                </div>

                {/* CIM-10 Quick Suggestions */}
                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                  <span className="text-slate-400 font-semibold">
                    Suggestions CIM-10 :
                  </span>
                  {icd10Suggestions.map((sug) => (
                    <button
                      key={sug.code}
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          diagnostic_principal: sug.label,
                          code_cim10: sug.code,
                        })
                      }
                      className="px-2 py-0.5 bg-slate-100 hover:bg-teal-100 hover:text-teal-800 text-slate-700 rounded transition-colors"
                    >
                      {sug.code} - {sug.label}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Plan de Traitement & Recommandations *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={formData.plan_traitement}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        plan_traitement: e.target.value,
                      })
                    }
                    placeholder="Conduite à tenir, règles hygiéno-diététiques, surveillance..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              {/* 5. Direct Integrated Prescription Trigger */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="inc_presc"
                      checked={formData.includePrescription}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          includePrescription: e.target.checked,
                        })
                      }
                      className="rounded text-teal-600"
                    />
                    <label
                      htmlFor="inc_presc"
                      className="font-bold text-slate-800 cursor-pointer"
                    >
                      Générer une ordonnance médicale liée
                    </label>
                  </div>
                </div>

                {formData.includePrescription && (
                  <div className="space-y-3 pt-2">
                    {/* Add Drug dropdown */}
                    <div className="flex items-center gap-2">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddPrescriptionItem(e.target.value);
                            e.target.value = "";
                          }
                        }}
                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-700 text-xs"
                      >
                        <option value="">
                          + Ajouter un médicament du catalogue...
                        </option>
                        {medications.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.nom} ({m.forme} - {m.dosage})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Prescribed Items Table */}
                    <div className="space-y-2">
                      {formData.prescriptionItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between gap-2"
                        >
                          <div className="flex-1">
                            <span className="font-bold text-slate-900">
                              {item.medicament_nom}
                            </span>
                            <span className="text-slate-500 text-[11px] ml-2">
                              ({item.forme} {item.dosage})
                            </span>
                            <div className="grid grid-cols-3 gap-2 mt-1">
                              <input
                                type="text"
                                value={item.posologie}
                                onChange={(e) => {
                                  const updated = [
                                    ...formData.prescriptionItems,
                                  ];
                                  updated[idx].posologie = e.target.value;
                                  setFormData({
                                    ...formData,
                                    prescriptionItems: updated,
                                  });
                                }}
                                placeholder="Posologie"
                                className="px-2 py-1 border rounded text-[11px]"
                              />
                              <input
                                type="text"
                                value={item.frequence}
                                onChange={(e) => {
                                  const updated = [
                                    ...formData.prescriptionItems,
                                  ];
                                  updated[idx].frequence = e.target.value;
                                  setFormData({
                                    ...formData,
                                    prescriptionItems: updated,
                                  });
                                }}
                                placeholder="Fréquence"
                                className="px-2 py-1 border rounded text-[11px]"
                              />
                              <input
                                type="text"
                                value={item.duree}
                                onChange={(e) => {
                                  const updated = [
                                    ...formData.prescriptionItems,
                                  ];
                                  updated[idx].duree = e.target.value;
                                  setFormData({
                                    ...formData,
                                    prescriptionItems: updated,
                                  });
                                }}
                                placeholder="Durée"
                                className="px-2 py-1 border rounded text-[11px]"
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemovePrescriptionItem(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 6. Direct Integrated Lab Order Trigger */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="inc_lab"
                    checked={formData.includeLabRequest}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        includeLabRequest: e.target.checked,
                      })
                    }
                    className="rounded text-teal-600"
                  />
                  <label
                    htmlFor="inc_lab"
                    className="font-bold text-slate-800 cursor-pointer"
                  >
                    Prescrire une demande d'analyse de laboratoire
                  </label>
                </div>

                {formData.includeLabRequest && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <input
                      type="text"
                      value={formData.labExamenNom}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          labExamenNom: e.target.value,
                        })
                      }
                      placeholder="Ex: NFS, Bilan lipidique, Glycémie à jeun..."
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-medium"
                    />
                    <select
                      value={formData.labPriorite}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          labPriorite: e.target.value as any,
                        })
                      }
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                    >
                      <option value="normale">Priorité Normale</option>
                      <option value="urgente">Priorité Urgente</option>
                    </select>
                  </div>
                )}
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
                  Enregistrer la Consultation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

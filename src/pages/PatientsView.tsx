import {
  AlertOctagon,
  Eye,
  FileText,
  FlaskConical,
  HeartPulse,
  Plus,
  Printer,
  Receipt,
  Search,
  ShieldAlert,
  Stethoscope,
  Users,
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "../components/ui/Toast";
import { apiService } from "../services/apiService";
import {
  refreshAfterBackendWrite,
  syncPatientCreate,
} from "../services/backendSync";
import {
  ClinicSettings,
  Consultation,
  Invoice,
  LabRequest,
  Patient,
  Prescription,
} from "../types";

interface PatientsViewProps {
  initialPatientId?: string;
  onOpenNewConsultationForPatient?: (patient: Patient) => void;
  onOpenNewAppointmentForPatient?: (patient: Patient) => void;
  onOpenNewInvoiceForPatient?: (patient: Patient) => void;
  onPrintDocument?: (type: any, data: any, title: string) => void;
  settings: ClinicSettings;
}

export const PatientsView: React.FC<PatientsViewProps> = ({
  initialPatientId,
  onOpenNewConsultationForPatient,
  onOpenNewAppointmentForPatient,
  onOpenNewInvoiceForPatient,
  onPrintDocument,
  settings,
}) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [bloodFilter, setBloodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "actif" | "archive">(
    "actif",
  );

  // Selected Patient File Drawer / Modal
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState<
    "profil" | "consultations" | "prescriptions" | "labo" | "factures"
  >("profil");

  // Related Patient Data
  const [patientConsultations, setPatientConsultations] = useState<
    Consultation[]
  >([]);
  const [patientPrescriptions, setPatientPrescriptions] = useState<
    Prescription[]
  >([]);
  const [patientLabRequests, setPatientLabRequests] = useState<LabRequest[]>(
    [],
  );
  const [patientInvoices, setPatientInvoices] = useState<Invoice[]>([]);

  // New Patient Form Modal State
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    sexe: "M" as "M" | "F" | "Autre",
    date_naissance: "1990-01-01",
    telephone: "",
    email: "",
    adresse: "",
    ville: "Bujumbura",
    personne_urgence_nom: "",
    personne_urgence_tel: "",
    personne_urgence_lien: "Famille",
    groupe_sanguin: "O+" as Patient["groupe_sanguin"],
    allergies: "",
    antecedents_medicaux: "",
    antecedents_chirurgicaux: "",
    assure: false,
    assurance_nom: "",
    assurance_numero: "",
    observations: "",
  });

  const loadPatients = () => {
    const list = apiService.patients.getAll();
    setPatients(list);
    if (initialPatientId) {
      const found = list.find((p) => p.id === initialPatientId);
      if (found) selectPatient(found);
    }
  };

  useEffect(() => {
    loadPatients();
    const handleUpdate = () => loadPatients();
    window.addEventListener("medicare_data_updated", handleUpdate);
    return () =>
      window.removeEventListener("medicare_data_updated", handleUpdate);
  }, [initialPatientId]);

  const selectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setPatientConsultations(
      apiService.consultations.getByPatientId(patient.id),
    );
    setPatientPrescriptions(
      apiService.prescriptions.getByPatientId(patient.id),
    );
    setPatientLabRequests(apiService.lab.getByPatientId(patient.id));
    setPatientInvoices(
      apiService.billing
        .getInvoices()
        .filter((i) => i.patient_id === patient.id),
    );
  };

  const handleCreatePatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom || !formData.prenom || !formData.telephone) {
      toast.error(
        "Veuillez renseigner le nom, le prénom et le numéro de téléphone.",
      );
      return;
    }

    const birthYear = new Date(formData.date_naissance).getFullYear();
    const currentYear = new Date().getFullYear();
    const calculatedAge = Math.max(0, currentYear - birthYear);

    const newPatient = apiService.patients.create({
      nom: formData.nom,
      prenom: formData.prenom,
      sexe: formData.sexe,
      date_naissance: formData.date_naissance,
      age: calculatedAge,
      telephone: formData.telephone,
      email: formData.email,
      adresse: formData.adresse,
      ville: formData.ville,
      personne_urgence_nom: formData.personne_urgence_nom,
      personne_urgence_tel: formData.personne_urgence_tel,
      personne_urgence_lien: formData.personne_urgence_lien,
      groupe_sanguin: formData.groupe_sanguin,
      allergies: formData.allergies
        ? formData.allergies.split(",").map((s) => s.trim())
        : [],
      antecedents_medicaux: formData.antecedents_medicaux
        ? formData.antecedents_medicaux.split(",").map((s) => s.trim())
        : [],
      antecedents_chirurgicaux: formData.antecedents_chirurgicaux
        ? formData.antecedents_chirurgicaux.split(",").map((s) => s.trim())
        : [],
      assure: formData.assure,
      assurance_nom: formData.assurance_nom,
      assurance_numero: formData.assurance_numero,
      observations: formData.observations,
      statut: "actif",
    });

    setIsCreatingPatient(false);
    selectPatient(newPatient);
    void syncPatientCreate(newPatient).then(refreshAfterBackendWrite);
  };

  const filteredPatients = patients.filter((p) => {
    const query = searchTerm.toLowerCase();
    const matchSearch =
      p.nom.toLowerCase().includes(query) ||
      p.prenom.toLowerCase().includes(query) ||
      p.numero.toLowerCase().includes(query) ||
      p.telephone.includes(query);
    const matchBlood =
      bloodFilter === "all" || p.groupe_sanguin === bloodFilter;
    const matchStatus = statusFilter === "all" || p.statut === statusFilter;
    return matchSearch && matchBlood && matchStatus;
  });

  return (
    <div className="space-y-4">
      {/* Top Header & Search Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-['Josefin_Sans']">
            Gestion des Dossiers Patients
          </h1>
          <p className="text-xs text-slate-500">
            {patients.length} dossiers médicaux enregistrés au centre
          </p>
        </div>

        <button
          onClick={() => setIsCreatingPatient(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Créer un Nouveau Patient</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 text-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom, prénom, N° dossier, téléphone..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
          />
        </div>

        {/* Blood Group Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium">Groupe Sanguin:</span>
          <select
            value={bloodFilter}
            onChange={(e) => setBloodFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-700"
          >
            <option value="all">Tous</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
          </select>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium">Statut:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-700"
          >
            <option value="actif">Actifs</option>
            <option value="archive">Archivés</option>
            <option value="all">Tous</option>
          </select>
        </div>
      </div>

      {/* Patient Cards / Table List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">N° Dossier</th>
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Âge / Sexe</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Groupe / Allergies</th>
                <th className="py-3 px-4">Assurance</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPatients.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-teal-50/40 transition-colors cursor-pointer group"
                  onClick={() => selectPatient(p)}
                >
                  <td className="py-3.5 px-4 font-mono font-bold text-teal-700">
                    {p.numero}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs">
                        {String(p.nom.charAt(0) || "").toUpperCase()}
                        {String(p.prenom.charAt(0) || "").toUpperCase()}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block group-hover:text-teal-700">
                          {p.nom} {p.prenom}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Né(e) le {p.date_naissance}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-slate-800 font-medium">
                      {p.age || "—"} ans
                    </span>
                    <span className="text-slate-400 ml-1">({p.sexe})</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="text-slate-700 font-medium">
                      {p.telephone}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
                      {p.adresse}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1 items-center">
                      <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 font-bold text-[10px]">
                        {p.groupe_sanguin}
                      </span>
                      {p.allergies && p.allergies.length > 0 ? (
                        <span
                          className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold text-[10px] flex items-center gap-0.5"
                          title={p.allergies.join(", ")}
                        >
                          <ShieldAlert className="w-3 h-3" />{" "}
                          {p.allergies.length} allergie(s)
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">
                          Aucune
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    {p.assure ? (
                      <div>
                        <span className="font-semibold text-emerald-700 block">
                          {p.assurance_nom}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {p.assurance_numero}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Non couvert</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        selectPatient(p);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 group-hover:bg-teal-600 group-hover:text-white text-slate-700 font-semibold text-xs transition-colors inline-flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Consulter</span>
                    </button>
                  </td>
                </tr>
              ))}

              {filteredPatients.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Aucun patient ne correspond aux critères de recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAILED PATIENT FILE DRAWER / MODAL */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold text-lg shadow-md">
                  {String(selectedPatient.nom.charAt(0) || "").toUpperCase()}
                  {String(selectedPatient.prenom.charAt(0) || "").toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold font-['Josefin_Sans']">
                      {selectedPatient.nom} {selectedPatient.prenom}
                    </h2>
                    <span className="font-mono text-xs bg-teal-800 text-teal-200 px-2 py-0.5 rounded font-bold">
                      {selectedPatient.numero}
                    </span>
                    <span className="text-xs bg-red-500/20 text-red-300 border border-red-500/40 px-2 py-0.5 rounded font-bold">
                      Groupe {selectedPatient.groupe_sanguin}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {selectedPatient.age} ans •{" "}
                    {selectedPatient.sexe === "M" ? "Masculin" : "Féminin"} •
                    Né(e) le {selectedPatient.date_naissance} • Tél:{" "}
                    {selectedPatient.telephone}
                  </p>
                </div>
              </div>

              {/* Header Action Buttons */}
              <div className="flex items-center gap-2">
                {onOpenNewConsultationForPatient && (
                  <button
                    onClick={() => {
                      const p = selectedPatient;
                      setSelectedPatient(null);
                      onOpenNewConsultationForPatient(p);
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Stethoscope className="w-3.5 h-3.5" />
                    <span>Nouvelle Consultation</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center border-b border-slate-200 bg-slate-50 px-6 gap-2 overflow-x-auto text-xs font-semibold">
              <button
                onClick={() => setActiveTab("profil")}
                className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === "profil"
                    ? "border-teal-600 text-teal-700 font-bold bg-white"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Identité & Antécédents</span>
              </button>
              <button
                onClick={() => setActiveTab("consultations")}
                className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === "consultations"
                    ? "border-teal-600 text-teal-700 font-bold bg-white"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <Stethoscope className="w-4 h-4" />
                <span>Consultations ({patientConsultations.length})</span>
              </button>
              <button
                onClick={() => setActiveTab("prescriptions")}
                className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === "prescriptions"
                    ? "border-teal-600 text-teal-700 font-bold bg-white"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Ordonnances ({patientPrescriptions.length})</span>
              </button>
              <button
                onClick={() => setActiveTab("labo")}
                className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === "labo"
                    ? "border-teal-600 text-teal-700 font-bold bg-white"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <FlaskConical className="w-4 h-4" />
                <span>Analyses Labo ({patientLabRequests.length})</span>
              </button>
              <button
                onClick={() => setActiveTab("factures")}
                className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === "factures"
                    ? "border-teal-600 text-teal-700 font-bold bg-white"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <Receipt className="w-4 h-4" />
                <span>Factures ({patientInvoices.length})</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {/* TAB 1: PROFIL & ANTECEDENTS */}
              {activeTab === "profil" && (
                <div className="space-y-4">
                  {/* Critical Medical Warning Box */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                      <div className="flex items-center gap-2 text-red-800 font-bold mb-2">
                        <AlertOctagon className="w-4 h-4" />
                        <span>Allergies Déclarées</span>
                      </div>
                      {selectedPatient.allergies &&
                      selectedPatient.allergies.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {(selectedPatient.allergies || []).map((all, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 bg-red-200 text-red-900 rounded font-bold text-[11px]"
                            >
                              ⚠️ {all}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-red-700 text-xs italic">
                          Aucune allergie connue signalée.
                        </p>
                      )}
                    </div>

                    <div className="p-4 rounded-xl bg-teal-50 border border-teal-200">
                      <div className="flex items-center gap-2 text-teal-800 font-bold mb-2">
                        <HeartPulse className="w-4 h-4" />
                        <span>Groupe Sanguin & Urgence</span>
                      </div>
                      <div className="space-y-1 text-teal-900">
                        <p>
                          Groupe Sanguin :{" "}
                          <strong>{selectedPatient.groupe_sanguin}</strong>
                        </p>
                        <p>
                          Contact d'urgence :{" "}
                          <strong>
                            {selectedPatient.personne_urgence_nom}
                          </strong>{" "}
                          ({selectedPatient.personne_urgence_tel})
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Medical History */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <h4 className="font-bold text-slate-800">
                        Antécédents Médicaux
                      </h4>
                      {selectedPatient.antecedents_medicaux &&
                      selectedPatient.antecedents_medicaux.length > 0 ? (
                        <ul className="list-disc list-inside space-y-1 text-slate-700">
                          {(selectedPatient.antecedents_medicaux || []).map(
                            (ant, idx) => (
                              <li key={idx}>{ant}</li>
                            ),
                          )}
                        </ul>
                      ) : (
                        <p className="text-slate-400 italic">
                          Aucun antécédent médical renseigné
                        </p>
                      )}
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <h4 className="font-bold text-slate-800">
                        Antécédents Chirurgicaux & Familiaux
                      </h4>
                      {selectedPatient.antecedents_chirurgicaux &&
                      selectedPatient.antecedents_chirurgicaux.length > 0 ? (
                        <ul className="list-disc list-inside space-y-1 text-slate-700">
                          {(selectedPatient.antecedents_chirurgicaux || []).map(
                            (ant, idx) => (
                              <li key={idx}>{ant}</li>
                            ),
                          )}
                        </ul>
                      ) : (
                        <p className="text-slate-400 italic">
                          Aucun antécédent chirurgical renseigné
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Personal Contact and Insurance */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <h4 className="font-bold text-slate-800 mb-3">
                      Coordonnées & Couverture Maladie
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-slate-700">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">
                          Téléphone
                        </span>
                        <span className="font-medium">
                          {selectedPatient.telephone}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">
                          Email
                        </span>
                        <span className="font-medium">
                          {selectedPatient.email || "Non renseigné"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">
                          Adresse
                        </span>
                        <span className="font-medium">
                          {selectedPatient.adresse}, {selectedPatient.ville}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">
                          Assurance
                        </span>
                        <span className="font-medium">
                          {selectedPatient.assure
                            ? selectedPatient.assurance_nom
                            : "Aucune"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">
                          N° Assuré
                        </span>
                        <span className="font-medium font-mono">
                          {selectedPatient.assurance_numero || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">
                          Date création dossier
                        </span>
                        <span className="font-medium">
                          {selectedPatient.date_creation}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedPatient.observations && (
                    <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 text-amber-900">
                      <strong className="block mb-1 font-bold">
                        Observations particulières :
                      </strong>
                      <p>{selectedPatient.observations}</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: CONSULTATIONS */}
              {activeTab === "consultations" && (
                <div className="space-y-4">
                  {patientConsultations.map((cst) => (
                    <div
                      key={cst.id}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              {cst.diagnostic_principal}
                            </span>
                            {cst.code_cim10 && (
                              <span className="px-1.5 py-0.5 bg-teal-100 text-teal-800 font-mono font-bold rounded text-[10px]">
                                {cst.code_cim10}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-500 text-[11px] mt-0.5">
                            Consulté le {cst.date} par {cst.doctor_nom} (
                            {cst.doctor_specialite})
                          </p>
                        </div>
                        {onPrintDocument && (
                          <button
                            onClick={() =>
                              onPrintDocument(
                                "consultation_summary",
                                cst,
                                "Compte-Rendu Consultation",
                              )
                            }
                            className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100 flex items-center gap-1"
                          >
                            <Printer className="w-3 h-3" /> Imprimer CR
                          </button>
                        )}
                      </div>

                      {cst.constantes && (
                        <div className="flex flex-wrap gap-3 bg-white p-2.5 rounded-lg border border-slate-200 text-[11px]">
                          {cst.constantes.tension_systolique && (
                            <div>
                              Tension :{" "}
                              <strong>
                                {cst.constantes.tension_systolique}/
                                {cst.constantes.tension_diastolique} mmHg
                              </strong>
                            </div>
                          )}
                          {cst.constantes.pouls && (
                            <div>
                              Pouls :{" "}
                              <strong>{cst.constantes.pouls} bpm</strong>
                            </div>
                          )}
                          {cst.constantes.temperature && (
                            <div>
                              T° :{" "}
                              <strong>{cst.constantes.temperature} °C</strong>
                            </div>
                          )}
                          {cst.constantes.poids && (
                            <div>
                              Poids : <strong>{cst.constantes.poids} kg</strong>
                            </div>
                          )}
                          {cst.constantes.imc && (
                            <div>
                              IMC : <strong>{cst.constantes.imc}</strong>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="text-slate-700">
                        <strong className="text-slate-800">
                          Plan de traitement :
                        </strong>
                        <p className="mt-0.5">{cst.plan_traitement}</p>
                      </div>
                    </div>
                  ))}

                  {patientConsultations.length === 0 && (
                    <div className="text-center py-10 text-slate-400">
                      Aucune consultation enregistrée pour ce patient.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: PRESCRIPTIONS */}
              {activeTab === "prescriptions" && (
                <div className="space-y-4">
                  {patientPrescriptions.map((ord) => (
                    <div
                      key={ord.id}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-mono font-bold text-teal-800 text-sm">
                            {ord.numero}
                          </span>
                          <span className="text-slate-500 text-[11px] ml-2">
                            du {ord.date} par {ord.doctor_nom}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              ord.statut === "delivree"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-teal-100 text-teal-800"
                            }`}
                          >
                            {ord.statut === "delivree"
                              ? "Délivrée en pharmacie"
                              : "Validée"}
                          </span>
                          {onPrintDocument && (
                            <button
                              onClick={() =>
                                onPrintDocument(
                                  "prescription",
                                  ord,
                                  "Ordonnance Médicale",
                                )
                              }
                              className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100 flex items-center gap-1"
                            >
                              <Printer className="w-3 h-3" /> Imprimer
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5 bg-white p-3 rounded-lg border border-slate-200">
                        {(ord.items || []).map((item, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between text-slate-800"
                          >
                            <span>
                              •{" "}
                              <strong>
                                {item.medicament_nom} {item.dosage}
                              </strong>{" "}
                              ({item.posologie} - {item.frequence})
                            </span>
                            <span className="text-slate-500">{item.duree}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {patientPrescriptions.length === 0 && (
                    <div className="text-center py-10 text-slate-400">
                      Aucune ordonnance délivrée pour ce patient.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: LABO */}
              {activeTab === "labo" && (
                <div className="space-y-4">
                  {(patientLabRequests || []).map((lab) => (
                    <div
                      key={lab.id}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-mono font-bold text-teal-800">
                            {lab.numero}
                          </span>
                          <span className="font-bold text-slate-900 ml-2">
                            {lab.examen_nom}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-teal-100 text-teal-800">
                            {lab.statut.toUpperCase()}
                          </span>
                          {onPrintDocument && (
                            <button
                              onClick={() =>
                                onPrintDocument(
                                  "lab_result",
                                  lab,
                                  "Résultat d’Examen Biologique",
                                )
                              }
                              className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100 flex items-center gap-1"
                            >
                              <Printer className="w-3 h-3" /> Compte-rendu
                            </button>
                          )}
                        </div>
                      </div>

                      {lab.resultats && lab.resultats.length > 0 && (
                        <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                          {(lab.resultats || []).map((res, i) => (
                            <div key={i} className="flex justify-between">
                              <span className="font-medium text-slate-700">
                                {res.parametre}
                              </span>
                              <span
                                className={`font-bold ${res.est_anormal ? "text-rose-600" : "text-slate-900"}`}
                              >
                                {res.valeur} {res.unite} (Normes: {res.normes})
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {patientLabRequests.length === 0 && (
                    <div className="text-center py-10 text-slate-400">
                      Aucune analyse de laboratoire enregistrée.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: FACTURES */}
              {activeTab === "factures" && (
                <div className="space-y-4">
                  {patientInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">
                            {inv.numero}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              inv.statut === "payee"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {inv.statut.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Émise le {inv.date_emission}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-base font-bold text-slate-900">
                            {inv.total_ttc} {settings.devise}
                          </span>
                          {inv.reste_a_payer > 0 && (
                            <span className="text-[11px] text-rose-600 font-semibold block">
                              Reste : {inv.reste_a_payer} {settings.devise}
                            </span>
                          )}
                        </div>
                        {onPrintDocument && (
                          <button
                            onClick={() =>
                              onPrintDocument(
                                "invoice",
                                inv,
                                "Facture Médicale",
                              )
                            }
                            className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-lg"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {patientInvoices.length === 0 && (
                    <div className="text-center py-10 text-slate-400">
                      Aucune facture enregistrée pour ce patient.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NEW PATIENT REGISTRATION MODAL */}
      {isCreatingPatient && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-['Josefin_Sans']">
                  Nouveau Dossier Patient
                </h3>
                <p className="text-xs text-slate-500">
                  Enregistrement administratif et antécédents médicaux
                </p>
              </div>
              <button
                onClick={() => setIsCreatingPatient(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleCreatePatient}
              className="flex-1 overflow-y-auto p-4 space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Nom *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nom}
                    onChange={(e) =>
                      setFormData({ ...formData, nom: e.target.value })
                    }
                    placeholder="Ex: DUPONT"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.prenom}
                    onChange={(e) =>
                      setFormData({ ...formData, prenom: e.target.value })
                    }
                    placeholder="Ex: Jean"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Sexe
                  </label>
                  <select
                    value={formData.sexe}
                    onChange={(e) =>
                      setFormData({ ...formData, sexe: e.target.value as any })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                  >
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Date de Naissance *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date_naissance}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        date_naissance: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Groupe Sanguin
                  </label>
                  <select
                    value={formData.groupe_sanguin}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        groupe_sanguin: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-red-600"
                  >
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="Inconnu">Inconnu</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Téléphone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.telephone}
                    onChange={(e) =>
                      setFormData({ ...formData, telephone: e.target.value })
                    }
                    placeholder="+257 6..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="patient@email.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Adresse
                  </label>
                  <input
                    type="text"
                    value={formData.adresse}
                    onChange={(e) =>
                      setFormData({ ...formData, adresse: e.target.value })
                    }
                    placeholder="Numéro et rue..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Ville
                  </label>
                  <input
                    type="text"
                    value={formData.ville}
                    onChange={(e) =>
                      setFormData({ ...formData, ville: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="p-3 bg-teal-50/50 rounded-xl border border-teal-100 space-y-3">
                <div className="font-bold text-teal-900">Contact d'Urgence</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Nom du proche / lien (ex: Marie Dupont - Épouse)"
                    value={formData.personne_urgence_nom}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        personne_urgence_nom: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-white border border-teal-200 rounded-lg"
                  />
                  <input
                    type="tel"
                    placeholder="Téléphone d'urgence"
                    value={formData.personne_urgence_tel}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        personne_urgence_tel: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-white border border-teal-200 rounded-lg"
                  />
                </div>
              </div>

              {/* Medical Details */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="font-semibold text-red-700 block mb-1">
                    Allergies (séparées par des virgules)
                  </label>
                  <input
                    type="text"
                    value={formData.allergies}
                    onChange={(e) =>
                      setFormData({ ...formData, allergies: e.target.value })
                    }
                    placeholder="Ex: Pénicilline, Arachides, Iode"
                    className="w-full px-3 py-2 bg-red-50/50 border border-red-200 rounded-lg text-red-900"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Antécédents Médicaux (séparés par des virgules)
                  </label>
                  <input
                    type="text"
                    value={formData.antecedents_medicaux}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        antecedents_medicaux: e.target.value,
                      })
                    }
                    placeholder="Ex: HTA, Diabète Type 2, Asthme"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              {/* Insurance */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="assure_chk"
                    checked={formData.assure}
                    onChange={(e) =>
                      setFormData({ ...formData, assure: e.target.checked })
                    }
                    className="rounded text-teal-600"
                  />
                  <label
                    htmlFor="assure_chk"
                    className="font-semibold text-slate-800"
                  >
                    Patient titulaire d'une mutuelle / assurance santé
                  </label>
                </div>
                {formData.assure && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <input
                      type="text"
                      placeholder="Nom de l'organisme (ex: Harmonie Mutuelle)"
                      value={formData.assurance_nom}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          assurance_nom: e.target.value,
                        })
                      }
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="Numéro d'adhérent / police"
                      value={formData.assurance_numero}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          assurance_numero: e.target.value,
                        })
                      }
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreatingPatient(false)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-white bg-teal-600 hover:bg-teal-700 rounded-xl font-bold transition-colors shadow-xs"
                >
                  Enregistrer le Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

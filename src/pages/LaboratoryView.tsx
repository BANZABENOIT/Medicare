import {
  Clock,
  Edit,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "../components/ui/Toast";
import { apiService } from "../services/apiService";
import {
  refreshAfterBackendWrite,
  syncLabRequestCreate,
} from "../services/backendSync";
import { djangoApi, isBackendActive } from "../services/djangoApiClient";
import {
  ClinicSettings,
  Consultation,
  Doctor,
  LabRequest,
  LabResultItem,
  LabTest,
  Patient,
} from "../types";

interface LaboratoryViewProps {
  onPrintDocument?: (type: any, data: any, title: string) => void;
  settings: ClinicSettings;
}

export const LaboratoryView: React.FC<LaboratoryViewProps> = ({
  onPrintDocument,
  settings,
}) => {
  const [requests, setRequests] = useState<LabRequest[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Result entry / editing modal
  const [selectedRequest, setSelectedRequest] = useState<LabRequest | null>(
    null,
  );
  const [resultsList, setResultsList] = useState<LabResultItem[]>([]);
  const [conclusion, setConclusion] = useState("");

  // New Request modal
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: "",
    doctor_id: "",
    consultation_id: "",
    examen_id: "",
    laboratoire_id: "",
    examen_nom: "Numération Formule Sanguine (NFS) + CRP",
    categorie: "Hématologie" as LabRequest["categorie"],
    priorite: "normale" as LabRequest["priorite"],
    renseignements_cliniques: "",
    date_demande: new Date().toISOString().split("T")[0],
  });

  const laboratories = [
    { id: "lab-central", nom: "Laboratoire central", capacite: 3 },
    { id: "lab-urgence", nom: "Laboratoire d’urgence", capacite: 2 },
    { id: "lab-specialise", nom: "Laboratoire spécialisé", capacite: 2 },
  ];

  const loadData = () => {
    setRequests(apiService.lab.getAll());
    setPatients(apiService.patients.getAll());
    setDoctors(apiService.doctors.getAll());
    setConsultations(apiService.consultations.getAll());
    if (isBackendActive()) {
      void djangoApi.lab.tests
        .list()
        .then((data: any) => {
          const rows = Array.isArray(data) ? data : data?.results || [];
          setLabTests(rows);
        })
        .catch(() => setLabTests([]));
    }
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener("medicare_data_updated", handleUpdate);
    return () =>
      window.removeEventListener("medicare_data_updated", handleUpdate);
  }, []);

  const handleOpenResultEntry = (req: LabRequest) => {
    setSelectedRequest(req);
    setResultsList(
      req.resultats && req.resultats.length > 0
        ? [...req.resultats]
        : [
            {
              parametre: "Hémoglobine",
              valeur: "13.5",
              unite: "g/dL",
              normes: "12.0 - 16.0",
              est_anormal: false,
            },
            {
              parametre: "Leucocytes (GB)",
              valeur: "6800",
              unite: "/mm³",
              normes: "4000 - 10000",
              est_anormal: false,
            },
            {
              parametre: "Plaquettes",
              valeur: "240000",
              unite: "/mm³",
              normes: "150000 - 400000",
              est_anormal: false,
            },
            {
              parametre: "CRP Réactive",
              valeur: "4.2",
              unite: "mg/L",
              normes: "< 6.0",
              est_anormal: false,
            },
          ],
    );
    setConclusion(
      req.conclusion || "Bilan hématologique dans les limites de la normale.",
    );
  };

  const handleAddParameterRow = () => {
    setResultsList([
      ...resultsList,
      {
        parametre: "Nouveau paramètre",
        valeur: "",
        unite: "mg/dL",
        normes: "",
        est_anormal: false,
      },
    ]);
  };

  const handleSaveResults = (markValidated = true) => {
    if (!selectedRequest) return;
    apiService.lab.saveResults(
      selectedRequest.id,
      resultsList,
      conclusion,
      markValidated ? "Dr. Lab Technicien" : undefined,
    );
    setSelectedRequest(null);
  };

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const pat = patients.find((p) => p.id === formData.patient_id);
    const doc = doctors.find((d) => d.id === formData.doctor_id);
    const laboratoire = laboratories.find(
      (l) => l.id === formData.laboratoire_id,
    );

    if (!pat || !doc || !laboratoire) {
      toast.error(
        "Veuillez sélectionner un patient, un médecin et un laboratoire disponible.",
      );
      return;
    }

    const created = apiService.lab.createRequest({
      patient_id: pat.id,
      patient_nom: `${pat.nom} ${pat.prenom}`,
      doctor_id: doc.id,
      consultation_id: formData.consultation_id || undefined,
      doctor_nom: `${doc.titre || "Dr."} ${doc.prenom} ${doc.nom}`,
      laboratoire_id: laboratoire.id,
      laboratoire_nom: laboratoire.nom,
      examen_code: `EXAM-${Date.now().toString().slice(-4)}`,
      examen_id: formData.examen_id || undefined,
      examen_nom: formData.examen_nom,
      categorie: formData.categorie,
      priorite: formData.priorite,
      statut: "demandee",
      renseignements_cliniques: formData.renseignements_cliniques,
      date_demande: formData.date_demande,
      resultats: [],
    });

    setIsCreating(false);
    void syncLabRequestCreate(created).then(refreshAfterBackendWrite);
  };

  const filtered = requests.filter((r) => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      r.numero.toLowerCase().includes(q) ||
      r.patient_nom.toLowerCase().includes(q) ||
      r.examen_nom.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || r.statut === statusFilter;
    const matchCat = categoryFilter === "all" || r.categorie === categoryFilter;
    return matchSearch && matchStatus && matchCat;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-['Josefin_Sans']">
            Laboratoire d’Analyses Médicales
          </h1>
          <p className="text-xs text-slate-500">
            Examens de biologie médicale, saisie des valeurs de référence,
            alertes d'anomalies et validation
          </p>
        </div>

        <button
          onClick={() => {
            if (patients.length > 0 && doctors.length > 0) {
              const activeRequests = requests.filter((r) =>
                ["demandee", "en_cours", "prelevement", "analyse"].includes(
                  r.statut,
                ),
              );
              const firstAvailable = laboratories.find(
                (l) =>
                  activeRequests.filter((r) => r.laboratoire_id === l.id)
                    .length < l.capacite,
              );
              setFormData((prev) => ({
                ...prev,
                patient_id: patients[0].id,
                doctor_id: doctors[0].id,
                laboratoire_id: firstAvailable?.id || "",
                consultation_id:
                  consultations.find((c) => c.patient_id === patients[0].id)
                    ?.id || "",
                examen_id: labTests[0] ? String(labTests[0].id) : "",
              }));
            }
            setIsCreating(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle Demande d’Analyse</span>
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 text-xs">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par N°, patient, examen..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium">Catégorie:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-700"
          >
            <option value="all">Toutes</option>
            <option value="Hématologie">Hématologie</option>
            <option value="Biochimie">Biochimie</option>
            <option value="Sérologie">Sérologie</option>
            <option value="Parasitologie">Parasitologie</option>
            <option value="Microbiologie">Microbiologie</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium">Statut:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-700"
          >
            <option value="all">Tous</option>
            <option value="demandee">Demandée</option>
            <option value="en_cours">En cours d'analyse</option>
            <option value="validee">Validée</option>
          </select>
        </div>
      </div>

      {/* Lab Requests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((req) => (
          <div
            key={req.id}
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-teal-800 text-sm">
                    {req.numero}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      req.statut === "validee"
                        ? "bg-emerald-100 text-emerald-800"
                        : req.statut === "en_cours"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {req.statut.toUpperCase()}
                  </span>
                  {req.priorite === "urgente" && (
                    <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-rose-100 text-rose-800">
                      URGENT
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-slate-900 text-sm mt-1">
                  {req.patient_nom}
                </h3>
                <span className="text-[11px] text-teal-700 font-semibold">
                  {req.examen_nom}
                </span>
                {req.laboratoire_nom && (
                  <span className="block text-[10px] text-slate-500 mt-1">
                    Affecté à : {req.laboratoire_nom}
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-800 block">
                  {req.doctor_nom}
                </span>
                <span className="text-[10px] text-slate-400">
                  Demande: {req.date_demande}
                </span>
              </div>
            </div>

            {/* Results Preview */}
            {req.resultats && req.resultats.length > 0 ? (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
                {req.resultats.map((res, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="font-medium text-slate-700">
                      {res.parametre}
                    </span>
                    <span
                      className={`font-mono font-bold ${res.est_anormal ? "text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded" : "text-slate-900"}`}
                    >
                      {res.valeur} {res.unite}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  En attente de prélèvement et de saisie des résultats
                  techniques
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <button
                onClick={() => handleOpenResultEntry(req)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold flex items-center gap-1.5"
              >
                <Edit className="w-3.5 h-3.5 text-teal-600" />
                <span>
                  {req.resultats?.length
                    ? "Modifier les Résultats"
                    : "Saisir les Résultats"}
                </span>
              </button>

              {req.statut === "validee" && onPrintDocument && (
                <button
                  onClick={() =>
                    onPrintDocument(
                      "lab_result",
                      req,
                      "Compte-Rendu d’Analyses Médicales",
                    )
                  }
                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer CR</span>
                </button>
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-2 py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            Aucun examen de laboratoire ne correspond aux critères.
          </div>
        )}
      </div>

      {/* LAB RESULT ENTRY & VALIDATION MODAL */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-['Josefin_Sans']">
                  Saisie & Validation des Résultats de Laboratoire
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedRequest.examen_nom} • Patient:{" "}
                  {selectedRequest.patient_nom}
                </p>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-800">
                  Paramètres Biologiques Mesurés
                </span>
                <button
                  type="button"
                  onClick={handleAddParameterRow}
                  className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold rounded-lg flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Ajouter un paramètre
                </button>
              </div>

              <div className="space-y-2">
                {resultsList.map((res, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border flex flex-wrap items-center gap-2 ${
                      res.est_anormal
                        ? "bg-rose-50/70 border-rose-200"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="flex-1 min-w-[140px]">
                      <label className="text-[10px] text-slate-500 block">
                        Paramètre
                      </label>
                      <input
                        type="text"
                        value={res.parametre}
                        onChange={(e) => {
                          const copy = [...resultsList];
                          copy[idx].parametre = e.target.value;
                          setResultsList(copy);
                        }}
                        className="w-full px-2 py-1 bg-white border rounded font-medium text-slate-800"
                      />
                    </div>

                    <div className="w-24">
                      <label className="text-[10px] text-slate-500 block">
                        Valeur
                      </label>
                      <input
                        type="text"
                        value={res.valeur}
                        onChange={(e) => {
                          const copy = [...resultsList];
                          copy[idx].valeur = e.target.value;
                          setResultsList(copy);
                        }}
                        className="w-full px-2 py-1 bg-white border rounded font-bold text-slate-900"
                      />
                    </div>

                    <div className="w-20">
                      <label className="text-[10px] text-slate-500 block">
                        Unité
                      </label>
                      <input
                        type="text"
                        value={res.unite}
                        onChange={(e) => {
                          const copy = [...resultsList];
                          copy[idx].unite = e.target.value;
                          setResultsList(copy);
                        }}
                        className="w-full px-2 py-1 bg-white border rounded text-slate-600"
                      />
                    </div>

                    <div className="w-32">
                      <label className="text-[10px] text-slate-500 block">
                        Normes
                      </label>
                      <input
                        type="text"
                        value={res.normes}
                        onChange={(e) => {
                          const copy = [...resultsList];
                          copy[idx].normes = e.target.value;
                          setResultsList(copy);
                        }}
                        placeholder="Ex: 12 - 16"
                        className="w-full px-2 py-1 bg-white border rounded text-slate-600"
                      />
                    </div>

                    <div className="flex items-center gap-1 mt-4">
                      <input
                        type="checkbox"
                        id={`anorm_${idx}`}
                        checked={res.est_anormal}
                        onChange={(e) => {
                          const copy = [...resultsList];
                          copy[idx].est_anormal = e.target.checked;
                          setResultsList(copy);
                        }}
                        className="rounded text-rose-600"
                      />
                      <label
                        htmlFor={`anorm_${idx}`}
                        className="text-[11px] font-bold text-rose-700 cursor-pointer"
                      >
                        Anormal ⚠️
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const copy = [...resultsList];
                        copy.splice(idx, 1);
                        setResultsList(copy);
                      }}
                      className="text-slate-400 hover:text-rose-600 p-1 mt-4"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Conclusion & Interprétation Biologique
                </label>
                <textarea
                  rows={3}
                  value={conclusion}
                  onChange={(e) => setConclusion(e.target.value)}
                  placeholder="Commentaire général du biologiste..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveResults(false)}
                  className="px-4 py-2 text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl font-bold"
                >
                  Sauvegarder Brouillon
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveResults(true)}
                  className="px-5 py-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold shadow-xs flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Valider le Compte-Rendu</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW REQUEST MODAL */}
      {isCreating && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-['Josefin_Sans']">
                  Nouvelle Demande d’Analyses
                </h3>
                <p className="text-xs text-slate-500">
                  Prescrire un examen pour le laboratoire
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
              onSubmit={handleCreateRequest}
              className="p-4 space-y-4 text-xs"
            >
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
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
                  Médecin Prescripteur *
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

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Laboratoire d’affectation *
                </label>
                <select
                  required
                  value={formData.laboratoire_id}
                  onChange={(e) =>
                    setFormData({ ...formData, laboratoire_id: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                >
                  <option value="">Choisir selon la disponibilité</option>
                  {laboratories.map((laboratoire) => {
                    const activeCount = requests.filter(
                      (r) =>
                        r.laboratoire_id === laboratoire.id &&
                        [
                          "demandee",
                          "en_cours",
                          "prelevement",
                          "analyse",
                        ].includes(r.statut),
                    ).length;
                    const available = activeCount < laboratoire.capacite;
                    return (
                      <option
                        key={laboratoire.id}
                        value={laboratoire.id}
                        disabled={!available}
                      >
                        {laboratoire.nom} -{" "}
                        {available
                          ? `${laboratoire.capacite - activeCount} place(s)`
                          : "complet"}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Consultation liée {isBackendActive() ? "*" : ""}
                </label>
                <select
                  required={isBackendActive()}
                  value={formData.consultation_id}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      consultation_id: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="">Sélectionner la consultation</option>
                  {consultations
                    .filter(
                      (c) =>
                        !formData.patient_id ||
                        c.patient_id === formData.patient_id,
                    )
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.date} - {c.patient_nom} -{" "}
                        {c.diagnostic_principal || c.motif}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Examen Demandé *
                </label>
                {labTests.length > 0 ? (
                  <select
                    required
                    value={formData.examen_id}
                    onChange={(e) => {
                      const test = labTests.find(
                        (t) => String(t.id) === e.target.value,
                      );
                      setFormData({
                        ...formData,
                        examen_id: e.target.value,
                        examen_nom:
                          test?.nom ||
                          (test as any)?.name ||
                          formData.examen_nom,
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                  >
                    <option value="">
                      Sélectionner une analyse du catalogue
                    </option>
                    {labTests.map((test) => (
                      <option key={test.id} value={test.id}>
                        {test.nom || (test as any).name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    value={formData.examen_nom}
                    onChange={(e) =>
                      setFormData({ ...formData, examen_nom: e.target.value })
                    }
                    placeholder="Ex: Glycémie à jeun + HbA1c"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Discipline
                  </label>
                  <select
                    value={formData.categorie}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        categorie: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="Hématologie">Hématologie</option>
                    <option value="Biochimie">Biochimie</option>
                    <option value="Sérologie">Sérologie</option>
                    <option value="Parasitologie">Parasitologie</option>
                    <option value="Microbiologie">Microbiologie</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Priorité
                  </label>
                  <select
                    value={formData.priorite}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        priorite: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="normale">Normale</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Renseignements Cliniques
                </label>
                <textarea
                  rows={2}
                  value={formData.renseignements_cliniques}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      renseignements_cliniques: e.target.value,
                    })
                  }
                  placeholder="Symptômes, traitement en cours..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-white bg-teal-600 hover:bg-teal-700 rounded-xl font-bold shadow-xs"
                >
                  Envoyer au Laboratoire
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import {
  Building2,
  Mail,
  Phone,
  Plus,
  Search,
  Stethoscope,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "../components/ui/Toast";
import { apiService } from "../services/apiService";
import { hydrateFromBackend, syncDoctorCreate } from "../services/backendSync";
import { isBackendActive } from "../services/djangoApiClient";
import { ClinicSettings, Doctor, MedicalService } from "../types";

interface DoctorsViewProps {
  settings: ClinicSettings;
}

export const DoctorsView: React.FC<DoctorsViewProps> = ({ settings }) => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [services, setServices] = useState<MedicalService[]>([]);
  const [activeTab, setActiveTab] = useState<"doctors" | "services">("doctors");
  const [searchTerm, setSearchTerm] = useState("");

  // Doctor Creation Modal
  const [isCreatingDoctor, setIsCreatingDoctor] = useState(false);
  const [newDoctor, setNewDoctor] = useState({
    nom: "",
    prenom: "",
    titre: "Dr.",
    specialite: "Médecine Générale",
    service_id: "",
    telephone: "+257 70 50 60 70",
    email: "",
    numero_ordre: "OMB-2026-00199",
    tarif_consultation: 25,
    jours_disponibles: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"],
    heures_debut: "08:30",
    heures_fin: "17:30",
  });

  const loadData = () => {
    setDoctors(apiService.doctors.getAll());
    setServices(apiService.services.getAll());
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener("medicare_data_updated", handleUpdate);
    return () =>
      window.removeEventListener("medicare_data_updated", handleUpdate);
  }, []);

  const handleCreateDoctor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoctor.nom || !newDoctor.prenom) {
      toast.error("Veuillez renseigner le nom et le prénom du médecin.");
      return;
    }

    const srv = services.find((s) => s.id === newDoctor.service_id);
    if (!srv) {
      toast.error(
        "Aucun service backend disponible pour affecter ce praticien.",
      );
      return;
    }

    const created = apiService.doctors.create({
      nom: newDoctor.nom,
      prenom: newDoctor.prenom,
      titre: newDoctor.titre,
      specialite: newDoctor.specialite,
      service_id: srv?.id || "srv-1",
      service_nom: srv?.nom || "Médecine Générale",
      telephone: newDoctor.telephone,
      email:
        newDoctor.email ||
        `${newDoctor.prenom.toLowerCase()}.${newDoctor.nom.toLowerCase()}@medicare.bi`,
      matricule: newDoctor.numero_ordre,
      numero_ordre: newDoctor.numero_ordre,
      tarif_consultation: Number(newDoctor.tarif_consultation),
      statut: "actif",
      jours_disponibles: newDoctor.jours_disponibles,
      heures_debut: newDoctor.heures_debut,
      heures_fin: newDoctor.heures_fin,
    });

    setIsCreatingDoctor(false);
    void syncDoctorCreate(created).then(() => {
      if (isBackendActive()) void hydrateFromBackend();
    });
  };

  const filteredDoctors = doctors.filter((d) => {
    const q = searchTerm.toLowerCase();
    return (
      d.nom.toLowerCase().includes(q) ||
      d.prenom.toLowerCase().includes(q) ||
      d.specialite.toLowerCase().includes(q) ||
      d.service_nom.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-['Josefin_Sans']">
            Corps Médical & Services de Soins
          </h1>
          <p className="text-xs text-slate-500">
            Annuaire des praticiens, spécialités, plannings de consultation et
            départements
          </p>
        </div>

        <button
          onClick={() => {
            if (services.length > 0) {
              setNewDoctor((prev) => ({ ...prev, service_id: services[0].id }));
            }
            setIsCreatingDoctor(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter un Praticien</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("doctors")}
          className={`pb-3 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "doctors"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          <span>Médecins & Praticiens ({doctors.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("services")}
          className={`pb-3 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "services"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Départements Médicaux ({services.length})</span>
        </button>
      </div>

      {/* TAB 1: DOCTORS */}
      {activeTab === "doctors" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher un praticien par nom, spécialité ou service..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredDoctors.map((doc) => (
              <div
                key={doc.id}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4 hover:border-teal-300 transition-all"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 text-sm">
                        {doc.titre || "Dr."} {doc.prenom} {doc.nom}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-teal-700 block mt-0.5">
                      {doc.specialite}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      N° {doc.numero_ordre}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Département:</span>
                    <span className="font-semibold text-slate-800">
                      {doc.service_nom}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Tarif Consultation:</span>
                    <span className="font-bold text-teal-800 font-['Josefin_Sans']">
                      {doc.tarif_consultation} {settings.devise}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Disponibilité:</span>
                    <span className="font-mono font-medium text-slate-700">
                      {doc.heures_debut} - {doc.heures_fin}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{doc.telephone}</span>
                  </div>
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{doc.email}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-1">
                  {(doc.jours_disponibles || []).map((j, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-medium text-slate-600"
                    >
                      {typeof j === "string" ? j.slice(0, 3) : j}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: SERVICES */}
      {activeTab === "services" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {services.map((srv) => {
            const serviceDocs = doctors.filter((d) => d.service_id === srv.id);
            return (
              <div
                key={srv.id}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800">
                    Actif
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 text-base font-['Josefin_Sans']">
                    {srv.nom}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {srv.description}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
                  <span className="text-slate-500">Praticiens affectés :</span>
                  <span className="font-bold text-teal-800 font-['Josefin_Sans']">
                    {serviceDocs.length} médecin(s)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* NEW DOCTOR MODAL */}
      {isCreatingDoctor && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-['Josefin_Sans']">
                  Ajouter un Praticien
                </h3>
                <p className="text-xs text-slate-500">
                  Profil médical et plannings de consultation
                </p>
              </div>
              <button
                onClick={() => setIsCreatingDoctor(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleCreateDoctor}
              className="p-4 space-y-3 text-xs"
            >
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Titre
                  </label>
                  <select
                    value={newDoctor.titre}
                    onChange={(e) =>
                      setNewDoctor({ ...newDoctor, titre: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                  >
                    <option value="Dr.">Dr.</option>
                    <option value="Pr.">Pr.</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Nom *
                  </label>
                  <input
                    type="text"
                    required
                    value={newDoctor.nom}
                    onChange={(e) =>
                      setNewDoctor({ ...newDoctor, nom: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    required
                    value={newDoctor.prenom}
                    onChange={(e) =>
                      setNewDoctor({ ...newDoctor, prenom: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Spécialité *
                  </label>
                  <input
                    type="text"
                    required
                    value={newDoctor.specialite}
                    onChange={(e) =>
                      setNewDoctor({ ...newDoctor, specialite: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Service d'Affectation
                  </label>
                  <select
                    value={newDoctor.service_id}
                    onChange={(e) =>
                      setNewDoctor({ ...newDoctor, service_id: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nom}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    N° Ordre / Immatriculation *
                  </label>
                  <input
                    type="text"
                    required
                    value={newDoctor.numero_ordre}
                    onChange={(e) =>
                      setNewDoctor({
                        ...newDoctor,
                        numero_ordre: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Tarif Consultation ({settings.devise})
                  </label>
                  <input
                    type="number"
                    value={newDoctor.tarif_consultation}
                    onChange={(e) =>
                      setNewDoctor({
                        ...newDoctor,
                        tarif_consultation: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-teal-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={newDoctor.telephone}
                    onChange={(e) =>
                      setNewDoctor({ ...newDoctor, telephone: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newDoctor.email}
                    onChange={(e) =>
                      setNewDoctor({ ...newDoctor, email: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreatingDoctor(false)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-white bg-teal-600 hover:bg-teal-700 rounded-xl font-bold shadow-xs"
                >
                  Enregistrer le Praticien
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

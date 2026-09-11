import {
  AlertOctagon,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  History,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "../components/ui/Toast";
import { apiService } from "../services/apiService";
import {
  hydrateFromBackend,
  syncInvoiceCreate,
  syncMedicationCreate,
} from "../services/backendSync";
import { isBackendActive } from "../services/djangoApiClient";
import { ClinicSettings, Medication, Patient, StockMovement } from "../types";

interface PharmacyViewProps {
  settings: ClinicSettings;
}

export const PharmacyView: React.FC<PharmacyViewProps> = ({ settings }) => {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [activeTab, setActiveTab] = useState<"inventory" | "movements">(
    "inventory",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [isSelling, setIsSelling] = useState(false);
  const [saleData, setSaleData] = useState({
    patient_id: "",
    medication_id: "",
    quantite: 1,
  });

  // Restock Modal
  const [selectedMedForStock, setSelectedMedForStock] =
    useState<Medication | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState({
    type: "entree" as StockMovement["type"],
    quantite: 50,
    motif: "Réapprovisionnement grossiste",
  });

  // New Drug Creation Modal
  const [isCreatingMed, setIsCreatingMed] = useState(false);
  const [newMedData, setNewMedData] = useState({
    nom: "",
    forme: "Comprimé",
    dosage: "500 mg",
    categorie: "Antalgique",
    stock_actuel: 100,
    seuil_alerte: 20,
    prix_unitaire: 5.0,
    emplacement: "Rayon A1",
    date_peremption: "2028-12-31",
    numero_lot: "LOT-2026-001",
    sur_ordonnance_uniquement: true,
  });

  const loadData = () => {
    setMedications(apiService.medications.getAll());
    setMovements(apiService.medications.getMovements());
    setPatients(apiService.patients.getAll());
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener("medicare_data_updated", handleUpdate);
    return () =>
      window.removeEventListener("medicare_data_updated", handleUpdate);
  }, []);

  const handleAdjustStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedForStock) return;

    apiService.medications.adjustStock(
      selectedMedForStock.id,
      Number(stockAdjustment.quantite),
      stockAdjustment.type,
      stockAdjustment.motif,
      "Dr. Pharmacien",
    );

    setSelectedMedForStock(null);
  };

  const handleCreateMed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedData.nom) {
      toast.error("Veuillez renseigner le nom du médicament.");
      return;
    }

    const created = apiService.medications.create({
      nom: newMedData.nom,
      forme: newMedData.forme,
      dosage: newMedData.dosage,
      categorie: newMedData.categorie,
      stock_actuel: Number(newMedData.stock_actuel),
      seuil_alerte: Number(newMedData.seuil_alerte),
      prix_unitaire: Number(newMedData.prix_unitaire),
      emplacement: newMedData.emplacement,
      date_peremption: newMedData.date_peremption,
      numero_lot: newMedData.numero_lot,
      sur_ordonnance_uniquement: newMedData.sur_ordonnance_uniquement,
    });

    setIsCreatingMed(false);
    void syncMedicationCreate(created).then(() => {
      if (isBackendActive()) void hydrateFromBackend();
    });
  };

  const handleSellMedication = (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find((p) => p.id === saleData.patient_id);
    const medication = medications.find((m) => m.id === saleData.medication_id);
    if (!patient || !medication) {
      toast.error("Veuillez sélectionner un patient et un médicament.");
      return;
    }
    const invoice = apiService.billing.createMedicationSale({
      patient_id: patient.id,
      patient_nom: `${patient.nom} ${patient.prenom}`,
      patient_numero: patient.numero,
      medication,
      quantite: Number(saleData.quantite),
      user_nom: "Pharmacien",
    });
    if (!invoice) {
      toast.error("Stock insuffisant pour cette vente.");
      return;
    }
    void syncInvoiceCreate(invoice).then(() => {
      if (isBackendActive()) void hydrateFromBackend();
    });
    toast.success(`Vente enregistrée et facture ${invoice.numero} créée.`);
    setIsSelling(false);
    setSaleData({ patient_id: "", medication_id: "", quantite: 1 });
  };

  const filtered = medications.filter((m) => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      m.nom.toLowerCase().includes(q) ||
      m.dosage.toLowerCase().includes(q) ||
      m.emplacement.toLowerCase().includes(q);
    const matchCat = filterCategory === "all" || m.categorie === filterCategory;
    return matchSearch && matchCat;
  });

  const lowStockCount = medications.filter(
    (m) => m.stock_actuel <= m.seuil_alerte,
  ).length;

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-['Josefin_Sans']">
            Pharmacie & Gestion des Stocks
          </h1>
          <p className="text-xs text-slate-500">
            Inventaire des médicaments, mouvements d'entrées/sorties, alertes de
            péremption et de rupture
          </p>
        </div>

        <button
          onClick={() => {
            setSaleData({
              patient_id: patients[0]?.id || "",
              medication_id:
                medications.find((m) => m.stock_actuel > 0)?.id || "",
              quantite: 1,
            });
            setIsSelling(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Vendre un médicament</span>
        </button>
        <button
          onClick={() => setIsCreatingMed(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter une Spécialité</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold block">
            Références en Stock
          </span>
          <div className="text-2xl font-bold text-slate-900 font-['Josefin_Sans'] mt-1">
            {medications.length} produits
          </div>
          <span className="text-[11px] text-slate-400">
            Catalogue disponible
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-rose-700 font-semibold block flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Alertes
            Stock Faible
          </span>
          <div className="text-2xl font-bold text-rose-700 font-['Josefin_Sans'] mt-1">
            {lowStockCount} référence(s)
          </div>
          <span className="text-[11px] text-rose-600 font-medium">
            Réapprovisionnement requis
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-teal-700 font-semibold block flex items-center gap-1">
            <History className="w-3.5 h-3.5 text-teal-600" /> Mouvements
            Réalisés
          </span>
          <div className="text-2xl font-bold text-teal-800 font-['Josefin_Sans'] mt-1">
            {movements.length} traçabilités
          </div>
          <span className="text-[11px] text-slate-400">
            Entrées, sorties & délivrances
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("inventory")}
          className={`pb-3 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "inventory"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Inventaire & Catalogues</span>
        </button>
        <button
          onClick={() => setActiveTab("movements")}
          className={`pb-3 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "movements"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Journal des Mouvements ({movements.length})</span>
        </button>
      </div>

      {/* TAB 1: INVENTORY */}
      {activeTab === "inventory" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 text-xs">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par médicament, dosage, emplacement..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Catégorie:</span>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-700"
              >
                <option value="all">Toutes</option>
                <option value="Antalgique">Antalgique</option>
                <option value="Antibiotique">Antibiotique</option>
                <option value="Anti-inflammatoire">Anti-inflammatoire</option>
                <option value="Antidiabétique">Antidiabétique</option>
                <option value="Cardiologie">Cardiologie</option>
                <option value="Antipaludéen">Antipaludéen</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Spécialité & Forme</th>
                    <th className="py-3 px-4">Catégorie</th>
                    <th className="py-3 px-4 text-center">Stock Disponible</th>
                    <th className="py-3 px-4">Prix Unitaire</th>
                    <th className="py-3 px-4">Emplacement / Lot</th>
                    <th className="py-3 px-4">Péremption</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((med) => {
                    const isLowStock = med.stock_actuel <= med.seuil_alerte;
                    return (
                      <tr
                        key={med.id}
                        className={`hover:bg-slate-50 transition-colors ${isLowStock ? "bg-rose-50/30" : ""}`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">
                            {med.nom}
                          </div>
                          <span className="text-[11px] text-slate-500">
                            {med.forme} • {med.dosage}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">
                            {med.categorie}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full font-bold text-xs ${
                              isLowStock
                                ? "bg-rose-100 text-rose-800 animate-pulse"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {med.stock_actuel} unités
                          </span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">
                            Seuil: {med.seuil_alerte}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {med.prix_unitaire} {settings.devise}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-slate-800 font-medium">
                            {med.emplacement}
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">
                            {med.numero_lot}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-mono">
                          {med.date_peremption}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setSelectedMedForStock(med)}
                            className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg font-bold flex items-center gap-1 inline-flex"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Mouvement</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MOVEMENTS JOURNAL */}
      {activeTab === "movements" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date & Heure</th>
                  <th className="py-3 px-4">Médicament</th>
                  <th className="py-3 px-4">Type de Mouvement</th>
                  <th className="py-3 px-4 text-center">Quantité</th>
                  <th className="py-3 px-4">Motif / Justificatif</th>
                  <th className="py-3 px-4">Opérateur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.map((mov) => (
                  <tr key={mov.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {mov.date} • {mov.heure}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {mov.medicament_nom}
                    </td>
                    <td className="py-3 px-4">
                      {mov.type === "entree" && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold inline-flex items-center gap-1">
                          <ArrowDownRight className="w-3 h-3" /> Entrée de stock
                        </span>
                      )}
                      {mov.type === "sortie" && (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold inline-flex items-center gap-1">
                          <ArrowUpRight className="w-3 h-3" /> Délivrance /
                          Sortie
                        </span>
                      )}
                      {mov.type === "ajustement" && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold inline-flex items-center gap-1">
                          <RefreshCw className="w-3 h-3" /> Ajustement
                          inventaire
                        </span>
                      )}
                      {mov.type === "perte" && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold inline-flex items-center gap-1">
                          <AlertOctagon className="w-3 h-3" /> Perte / Périmé
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-900 font-mono">
                      {mov.type === "entree"
                        ? `+${mov.quantite}`
                        : `-${mov.quantite}`}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{mov.motif}</td>
                    <td className="py-3 px-4 text-slate-500 font-medium">
                      {mov.effectue_par_nom}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STOCK ADJUSTMENT MODAL */}
      {isSelling && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Vente de médicament
                </h3>
                <p className="text-xs text-slate-500">
                  La facture et la sortie de stock seront créées ensemble.
                </p>
              </div>
              <button
                onClick={() => setIsSelling(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <form
              onSubmit={handleSellMedication}
              className="p-4 space-y-4 text-xs"
            >
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Patient *
                </label>
                <select
                  required
                  value={saleData.patient_id}
                  onChange={(e) =>
                    setSaleData({ ...saleData, patient_id: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="">Sélectionner un patient</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nom} {p.prenom} ({p.numero})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Médicament *
                </label>
                <select
                  required
                  value={saleData.medication_id}
                  onChange={(e) =>
                    setSaleData({ ...saleData, medication_id: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="">Sélectionner un médicament</option>
                  {medications
                    .filter((m) => m.stock_actuel > 0)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nom} - {m.prix_unitaire} {settings.devise} (
                        {m.stock_actuel} disponibles)
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Quantité *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={saleData.quantite}
                  onChange={(e) =>
                    setSaleData({
                      ...saleData,
                      quantite: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                />
              </div>
              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsSelling(false)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-white bg-teal-600 hover:bg-teal-700 rounded-xl font-bold"
                >
                  Créer la vente et la facture
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedMedForStock && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-['Josefin_Sans']">
                  Mouvement de Stock
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedMedForStock.nom} ({selectedMedForStock.dosage})
                </p>
              </div>
              <button
                onClick={() => setSelectedMedForStock(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleAdjustStock}
              className="p-4 space-y-4 text-xs"
            >
              <div className="p-3 bg-teal-50 rounded-xl text-teal-900 font-semibold flex justify-between">
                <span>Stock Actuel :</span>
                <strong>{selectedMedForStock.stock_actuel} unités</strong>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Type d'opération *
                </label>
                <select
                  value={stockAdjustment.type}
                  onChange={(e) =>
                    setStockAdjustment({
                      ...stockAdjustment,
                      type: e.target.value as any,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                >
                  <option value="entree">
                    Entrée / Réapprovisionnement (+)
                  </option>
                  <option value="sortie">Sortie manuelle (-)</option>
                  <option value="ajustement">
                    Ajustement inventaire physique
                  </option>
                  <option value="perte">
                    Perte / Dégradation / Périmé (-)
                  </option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Quantité (unités) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={stockAdjustment.quantite}
                  onChange={(e) =>
                    setStockAdjustment({
                      ...stockAdjustment,
                      quantite: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Motif / Justification *
                </label>
                <input
                  type="text"
                  required
                  value={stockAdjustment.motif}
                  onChange={(e) =>
                    setStockAdjustment({
                      ...stockAdjustment,
                      motif: e.target.value,
                    })
                  }
                  placeholder="Ex: Facture Fournisseur N°1024"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedMedForStock(null)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-white bg-teal-600 hover:bg-teal-700 rounded-xl font-bold shadow-xs"
                >
                  Enregistrer le Mouvement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW MEDICATION MODAL */}
      {isCreatingMed && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-['Josefin_Sans']">
                  Ajouter un Médicament au Catalogue
                </h3>
                <p className="text-xs text-slate-500">
                  Nouvelle référence en pharmacie
                </p>
              </div>
              <button
                onClick={() => setIsCreatingMed(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMed} className="p-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nom commercial / DCI *
                </label>
                <input
                  type="text"
                  required
                  value={newMedData.nom}
                  onChange={(e) =>
                    setNewMedData({ ...newMedData, nom: e.target.value })
                  }
                  placeholder="Ex: Amoxicilline"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Forme
                  </label>
                  <input
                    type="text"
                    value={newMedData.forme}
                    onChange={(e) =>
                      setNewMedData({ ...newMedData, forme: e.target.value })
                    }
                    placeholder="Gélule, Comprimé, Sirop..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Dosage
                  </label>
                  <input
                    type="text"
                    value={newMedData.dosage}
                    onChange={(e) =>
                      setNewMedData({ ...newMedData, dosage: e.target.value })
                    }
                    placeholder="500 mg, 1g..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Catégorie Thérapeutique
                  </label>
                  <input
                    type="text"
                    value={newMedData.categorie}
                    onChange={(e) =>
                      setNewMedData({
                        ...newMedData,
                        categorie: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Prix Unitaire ({settings.devise})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newMedData.prix_unitaire}
                    onChange={(e) =>
                      setNewMedData({
                        ...newMedData,
                        prix_unitaire: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-teal-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Stock Initial
                  </label>
                  <input
                    type="number"
                    value={newMedData.stock_actuel}
                    onChange={(e) =>
                      setNewMedData({
                        ...newMedData,
                        stock_actuel: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Seuil d'Alerte
                  </label>
                  <input
                    type="number"
                    value={newMedData.seuil_alerte}
                    onChange={(e) =>
                      setNewMedData({
                        ...newMedData,
                        seuil_alerte: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Date Péremption
                  </label>
                  <input
                    type="date"
                    value={newMedData.date_peremption}
                    onChange={(e) =>
                      setNewMedData({
                        ...newMedData,
                        date_peremption: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Emplacement
                  </label>
                  <input
                    type="text"
                    value={newMedData.emplacement}
                    onChange={(e) =>
                      setNewMedData({
                        ...newMedData,
                        emplacement: e.target.value,
                      })
                    }
                    placeholder="Rayon B2"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreatingMed(false)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-white bg-teal-600 hover:bg-teal-700 rounded-xl font-bold shadow-xs"
                >
                  Ajouter au Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

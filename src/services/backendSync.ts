import {
  Appointment,
  AuditLog,
  Consultation,
  Doctor,
  Invoice,
  LabRequest,
  MedicalService,
  Medication,
  Patient,
  Payment,
  Prescription,
} from "../types";
import {
  djangoApi,
  isBackendActive,
  setBackendActive,
} from "./djangoApiClient";

// Prélève la première valeur trouvée parmi plusieurs clés candidates du backend.
const pick = (obj: any, keys: string[], fallback: any = ""): any => {
  if (!obj || typeof obj !== "object") return fallback;
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return fallback;
};

const pickNum = (obj: any, keys: string[], fallback: number = 0): number => {
  const v = pick(obj, keys, fallback);
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const pickBool = (obj: any, keys: string[]): boolean => {
  const v = pick(obj, keys, false);
  if (typeof v === "boolean") return v;
  return String(v).toLowerCase() === "true" || String(v) === "1";
};

const pickArr = (obj: any, keys: string[]): any[] => {
  const v = pick(obj, keys);
  return Array.isArray(v) ? v : [];
};

const idStr = (obj: any): string =>
  String(pick(obj, ["id", "pk", "uuid", "code"], "")).trim();

const relationId = (obj: any, keys: string[]): string => {
  const value = pick(obj, keys);
  if (value && typeof value === "object") return idStr(value);
  return s(value);
};

const normalizeList = (res: any): any[] => {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.results)) return res.results;
  return [];
};

const valid = <T>(arr: T[]): T[] =>
  arr.filter(
    (x: any) => x && x.id !== undefined && x.id !== null && x.id !== "",
  );

const s = (v: any): string => (v === undefined || v === null ? "" : String(v));

// Aide à la normalisation des formats backend -> formats locaux de l'application.
const fmtDate = (v: any): string => {
  const t = s(v).trim();
  const m = t.match(/^\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : t;
};

const fmtTime = (v: any): string => {
  const t = s(v).trim();
  const m = t.match(/T(\d{2}):(\d{2})/);
  if (m) return `${m[1]}:${m[2]}`;
  const m2 = t.match(/^\d{1,2}:\d{2}/);
  return m2 ? m2[0] : t;
};

const APPT_STATUTS: Appointment["statut"][] = [
  "programme",
  "confirme",
  "en_attente",
  "en_consultation",
  "termine",
  "annule",
];
const mapAppointmentStatut = (v: any): Appointment["statut"] => {
  switch (s(v).trim().toUpperCase()) {
    case "SCHEDULED":
      return "programme";
    case "CONFIRMED":
      return "confirme";
    case "WAITING":
      return "en_attente";
    case "IN_PROGRESS":
      return "en_consultation";
    case "COMPLETED":
      return "termine";
    case "NO_SHOW":
    case "CANCELLED":
      return "annule";
  }
  const low = s(v).trim().toLowerCase();
  return (APPT_STATUTS as string[]).includes(low)
    ? (low as Appointment["statut"])
    : "programme";
};

const PRESC_STATUTS: Prescription["statut"][] = [
  "brouillon",
  "validee",
  "delivree",
  "annulee",
];
const mapPrescriptionStatut = (v: any): Prescription["statut"] => {
  switch (s(v).trim().toUpperCase()) {
    case "DRAFT":
      return "brouillon";
    case "VALIDATED":
    case "PARTIALLY_DISPENSED":
      return "validee";
    case "DISPENSED":
      return "delivree";
    case "CANCELLED":
      return "annulee";
  }
  const low = s(v).trim().toLowerCase();
  return (PRESC_STATUTS as string[]).includes(low)
    ? (low as Prescription["statut"])
    : "validee";
};

const LAB_STATUTS: LabRequest["statut"][] = [
  "demandee",
  "en_cours",
  "prelevement",
  "analyse",
  "resultat_disponible",
  "validee",
  "annulee",
];
const mapLabStatut = (v: any): LabRequest["statut"] => {
  switch (s(v).trim().toUpperCase()) {
    case "REQUESTED":
      return "demandee";
    case "SAMPLE_COLLECTED":
      return "prelevement";
    case "IN_PROGRESS":
      return "en_cours";
    case "RESULT_AVAILABLE":
      return "resultat_disponible";
    case "VALIDATED":
      return "validee";
    case "CANCELLED":
      return "annulee";
  }
  const low = s(v).trim().toLowerCase();
  return (LAB_STATUTS as string[]).includes(low)
    ? (low as LabRequest["statut"])
    : "demandee";
};

const INVOICE_STATUTS: Invoice["statut"][] = [
  "emise",
  "brouillon",
  "impayee",
  "partiellement_payee",
  "payee",
  "annulee",
];
const mapInvoiceStatut = (v: any): Invoice["statut"] => {
  switch (s(v).trim().toUpperCase()) {
    case "UNPAID":
      return "impayee";
    case "PARTIALLY_PAID":
      return "partiellement_payee";
    case "PAID":
      return "payee";
    case "CANCELLED":
      return "annulee";
  }
  const low = s(v).trim().toLowerCase();
  return (INVOICE_STATUTS as string[]).includes(low)
    ? (low as Invoice["statut"])
    : "impayee";
};

const PAYMENT_MODES: Payment["mode"][] = [
  "especes",
  "carte",
  "carte_bancaire",
  "virement",
  "mobile_money",
  "assurance",
  "cheque",
  "tiers_payant",
];
const mapPaymentMode = (v: any): Payment["mode"] => {
  switch (s(v).trim().toUpperCase().replace(/[ -]/g, "_")) {
    case "CASH":
      return "especes";
    case "MOBILE_MONEY":
    case "MOMO":
      return "mobile_money";
    case "CARD":
    case "CARTE":
      return "carte";
    case "BANK":
    case "VIREMENT":
      return "virement";
    case "INSURANCE":
    case "ASSURANCE":
      return "assurance";
    case "CHEQUE":
      return "cheque";
    case "TIERS_PAYANT":
      return "tiers_payant";
  }
  const low = s(v).trim().toLowerCase();
  return (PAYMENT_MODES as string[]).includes(low)
    ? (low as Payment["mode"])
    : "especes";
};

// ---------- MAPPERS ----------
const mapPatient = (o: any): Patient => ({
  id: idStr(o),
  numero: s(
    pick(o, [
      "numero",
      "patient_number",
      "numero_patient",
      "no_patient",
      "code",
    ]),
  ),
  nom: s(pick(o, ["nom", "nom_famille", "last_name"])).toUpperCase(),
  prenom: s(pick(o, ["prenom", "first_name"])).toUpperCase(),
  sexe: (() => {
    const g = String(pick(o, ["sexe", "sex", "genre"], "")).toUpperCase();
    return ["M", "MALE", "HOMME", "H"].includes(g)
      ? "M"
      : ["F", "FEMALE", "FEMME"].includes(g)
        ? "F"
        : "Autre";
  })(),
  date_naissance: s(
    pick(o, ["date_naissance", "birth_date", "date_of_birth", "naissance"]),
  ),
  telephone: s(
    pick(
      o,
      ["telephone", "phone", "tel"],
      typeof o.user === "object"
        ? pick(o.user, ["telephone", "phone", "tel"])
        : "",
    ),
  ),
  email: s(
    pick(
      o,
      ["email"],
      typeof o.user === "object" ? pick(o.user, ["email"]) : "",
    ),
  ),
  adresse: s(pick(o, ["adresse", "address"])),
  ville: s(pick(o, ["ville", "city"])),
  personne_urgence_nom: s(
    pick(o, ["personne_urgence_nom", "contact_urgence", "emergency_contact"]),
  ),
  personne_urgence_tel: s(
    pick(o, ["personne_urgence_tel", "contact_urgence_tel", "emergency_phone"]),
  ),
  groupe_sanguin: s(
    pick(o, ["groupe_sanguin", "blood_group"], "Inconnu"),
  ) as Patient["groupe_sanguin"],
  allergies: pickArr(o, ["allergies"]).map(s),
  antecedents_medicaux: pickArr(o, ["antecedents_medicaux", "antecedents"]).map(
    s,
  ),
  assure: pickBool(o, ["assure", "assure_", "is_insured"]),
  statut:
    String(pick(o, ["statut", "status"], "actif")) === "archive"
      ? "archive"
      : "actif",
  date_creation: s(pick(o, ["date_creation", "created_at", "created"])),
});

const mapDoctor = (o: any): Doctor => ({
  id: idStr(o),
  nom: s(
    pick(
      o,
      ["nom", "last_name", "name"],
      typeof o.user === "object" ? pick(o.user, ["last_name", "nom"]) : "",
    ),
  ).toUpperCase(),
  prenom: s(
    pick(
      o,
      ["prenom", "first_name"],
      typeof o.user === "object" ? pick(o.user, ["first_name", "prenom"]) : "",
    ),
  ).toUpperCase(),
  specialite: s(
    typeof o.specialty === "object"
      ? pick(o.specialty, ["name", "nom"])
      : pick(o, ["specialite", "specialty"]),
  ),
  service_id: relationId(o, ["service_id", "service"]),
  service_nom: s(
    typeof o.service === "object"
      ? pick(o.service, ["nom", "name"])
      : pick(o, ["service_nom", "service"]),
  ),
  telephone: s(
    pick(
      o,
      ["telephone", "phone", "tel"],
      typeof o.user === "object"
        ? pick(o.user, ["telephone", "phone", "tel"])
        : "",
    ),
  ),
  email: s(
    pick(
      o,
      ["email"],
      typeof o.user === "object" ? pick(o.user, ["email"]) : "",
    ),
  ),
  titre: s(pick(o, ["titre", "title"])),
  matricule: s(
    pick(
      o,
      ["matricule", "license", "registration_number"],
      typeof o.user === "object" ? pick(o.user, ["matricule"]) : "",
    ),
  ),
  statut:
    String(pick(o, ["statut", "status"], "actif")) === "inactif"
      ? "inactif"
      : "actif",
});

const mapService = (o: any): MedicalService => ({
  id: idStr(o),
  nom: s(pick(o, ["nom", "name"])),
  code: s(pick(o, ["code"])),
  description: s(pick(o, ["description"])),
  responsable_nom: s(pick(o, ["responsable_nom", "responsable"])),
  statut:
    String(pick(o, ["statut", "status"], "actif")) === "inactif"
      ? "inactif"
      : "actif",
  tarif_consultation: pickNum(o, ["tarif_consultation", "tarif", "price"]),
});

const mapAppointment = (o: any): Appointment => ({
  id: idStr(o),
  patient_id: s(pick(o, ["patient_id", "patient"])),
  patient_nom: s(pick(o, ["patient_nom"])),
  patient_numero: s(pick(o, ["patient_numero"])),
  doctor_id: s(pick(o, ["doctor_id", "medecin_id", "doctor"])),
  doctor_nom: s(pick(o, ["doctor_nom", "medecin_nom"])),
  service_id: s(pick(o, ["service_id", "service"])),
  service_nom: s(pick(o, ["service_nom"])),
  date: fmtDate(pick(o, ["date", "jour", "appointment_date"])),
  heure: fmtTime(pick(o, ["heure", "horaire", "time", "appointment_time"])),
  duree_minutes: pickNum(o, ["duree_minutes", "duree"], 30),
  motif: s(pick(o, ["motif", "reason"])),
  priorite: String(pick(o, ["priorite", "priority"], "normale")).includes(
    "urge",
  )
    ? "urgente"
    : String(pick(o, ["priorite", "priority"], "")).includes("sui")
      ? "suivi"
      : "normale",
  statut: mapAppointmentStatut(pick(o, ["statut", "status"], "programme")),
  notes: s(pick(o, ["notes", "commentaires"])),
  date_creation: s(pick(o, ["date_creation", "created_at"])),
});

const mapConsultation = (o: any): Consultation => ({
  id: idStr(o),
  patient_id: s(pick(o, ["patient_id", "patient"])),
  patient_nom: s(pick(o, ["patient_nom"])),
  patient_numero: s(pick(o, ["patient_numero"])),
  doctor_id: s(pick(o, ["doctor_id", "doctor"])),
  doctor_nom: s(pick(o, ["doctor_nom"])),
  doctor_specialite: s(pick(o, ["doctor_specialite", "specialite"])),
  date: fmtDate(pick(o, ["date", "consultation_date"])),
  heure: fmtTime(pick(o, ["heure", "time", "consultation_date"])),
  motif: s(pick(o, ["motif", "reason"])),
  histoire_maladie: s(pick(o, ["histoire_maladie", "history"])),
  symptomes: (() => {
    const v = pick(o, ["symptomes", "symptoms"], "");
    if (Array.isArray(v)) return v.map(s);
    return v
      ? String(v)
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean)
      : [];
  })(),
  constantes: (() => {
    if (
      o?.constantes &&
      typeof o.constantes === "object" &&
      !Array.isArray(o.constantes)
    )
      return o.constantes;
    const bp = s(o?.blood_pressure).split("/");
    const c: Record<string, any> = {};
    if (o?.temperature !== undefined && o?.temperature !== null)
      c.temperature = Number(o.temperature);
    if (o?.weight !== undefined && o?.weight !== null)
      c.poids = Number(o.weight);
    if (o?.height !== undefined && o?.height !== null)
      c.taille = Number(o.height);
    if (bp[0]) c.tension_systolique = Number(bp[0].trim());
    if (bp[1]) c.tension_diastolique = Number(bp[1].trim());
    if (o?.heart_rate !== undefined && o?.heart_rate !== null)
      c.pouls = Number(o.heart_rate);
    return c;
  })(),
  examen_physique: s(pick(o, ["examen_physique", "examen"])),
  diagnostic_principal: s(pick(o, ["diagnostic_principal", "diagnostic"])),
  code_cim10: s(pick(o, ["code_cim10", "cim10"])),
  plan_traitement: s(
    pick(o, ["plan_traitement", "traitement", "treatment_plan"]),
  ),
  notes_medicales: s(pick(o, ["notes_medicales", "notes", "observations"])),
  date_creation: s(pick(o, ["date_creation", "created_at"])),
});

const mapPrescription = (o: any): Prescription => ({
  id: idStr(o),
  numero: s(pick(o, ["numero", "number", "prescription_number"])),
  patient_id: s(pick(o, ["patient_id", "patient"])),
  patient_nom: s(pick(o, ["patient_nom"])),
  doctor_id: s(pick(o, ["doctor_id", "doctor"])),
  doctor_nom: s(pick(o, ["doctor_nom"])),
  doctor_specialite: s(pick(o, ["doctor_specialite"])),
  date: fmtDate(pick(o, ["date", "prescription_date"])),
  statut: mapPrescriptionStatut(pick(o, ["statut", "status"], "validee")),
  items: pickArr(o, ["items", "lignes", "medicaments"]).map((it: any) => ({
    id:
      idStr(it) || `rx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    medicament_nom: s(pick(it, ["medicament_nom", "nom", "medicament"])),
    forme: s(pick(it, ["forme"])),
    dosage: s(pick(it, ["dosage"])),
    posologie: s(pick(it, ["posologie"])),
    frequence: s(pick(it, ["frequence"])),
    duree: s(pick(it, ["duree"])),
    quantite_prescrite: pickNum(it, ["quantite_prescrite", "quantite"], 1),
  })),
  date_creation: s(pick(o, ["date_creation", "created_at"])),
});

const mapLab = (o: any): LabRequest => ({
  id: idStr(o),
  numero: s(pick(o, ["numero", "number", "request_number"])),
  patient_id: s(pick(o, ["patient_id", "patient"])),
  patient_nom: s(pick(o, ["patient_nom"])),
  doctor_id: s(pick(o, ["doctor_id", "doctor"])),
  doctor_nom: s(pick(o, ["doctor_nom"])),
  examen_code: s(pick(o, ["examen_code", "code"])),
  examen_nom: s(pick(o, ["examen_nom", "examen"])),
  categorie: s(
    pick(o, ["categorie", "category"], "Hématologie"),
  ) as LabRequest["categorie"],
  priorite: ["URGENT", "CRITICAL", "URGENTE", "URGENCE"].includes(
    s(pick(o, ["priorite", "priority"])).toUpperCase(),
  )
    ? "urgente"
    : "normale",
  statut: mapLabStatut(pick(o, ["statut", "status"], "demandee")),
  renseignements_cliniques: s(
    pick(o, ["renseignements_cliniques", "clinical_information"]),
  ),
  date_demande: fmtDate(pick(o, ["date_demande", "date", "requested_at"])),
  date_prelevement: fmtDate(pick(o, ["date_prelevement", "date_collecte"])),
  date_validation: s(pick(o, ["date_validation"])),
  resultats: pickArr(o, ["resultats", "results"]).map((r: any) => ({
    parametre: s(pick(r, ["parametre", "parameter", "nom"])),
    valeur: pick(r, ["valeur", "value"], ""),
    unite: s(pick(r, ["unite", "unit"])),
    normes: s(pick(r, ["normes", "reference"])),
    est_anormal: pickBool(r, ["est_anormal", "anormal"]),
  })),
  conclusion: s(pick(o, ["conclusion"])),
  date_creation: s(pick(o, ["date_creation", "created_at"])),
});

const mapMedication = (o: any): Medication => ({
  id: idStr(o),
  code: s(pick(o, ["code"])),
  nom: s(pick(o, ["nom", "name"])),
  dci: s(pick(o, ["dci", "generic_name"])),
  forme: s(pick(o, ["forme", "form"])),
  dosage: s(pick(o, ["dosage"])),
  categorie: s(
    typeof o.category === "object"
      ? pick(o.category, ["nom", "name"])
      : pick(o, ["categorie", "category", "category_name"]),
  ),
  prix_unitaire: pickNum(o, ["prix_unitaire", "prix", "unit_price", "price"]),
  stock_actuel: pickNum(o, [
    "stock_actuel",
    "stock",
    "quantite_stock",
    "current_stock",
    "stock_quantity",
    "available_quantity",
  ]),
  seuil_alerte: pickNum(
    o,
    ["seuil_alerte", "alerte_stock", "alerte", "minimum_stock"],
    5,
  ),
  emplacement: s(pick(o, ["emplacement", "location", "storage_location"])),
  numero_lot: s(pick(o, ["numero_lot", "lot_number", "batch_number"])),
  date_peremption: s(
    pick(o, [
      "date_peremption",
      "date_expiration",
      "expiration_date",
      "expiry_date",
    ]),
  ),
  sur_ordonnance_uniquement: pickBool(o, [
    "sur_ordonnance_uniquement",
    "sur_ordonnance",
    "prescription_only",
  ]),
});

const mapInvoice = (o: any): Invoice => ({
  id: idStr(o),
  numero: s(pick(o, ["numero", "number", "invoice_number"])),
  patient_id: s(pick(o, ["patient_id", "patient"])),
  patient_nom: s(pick(o, ["patient_nom"])),
  patient_numero: s(pick(o, ["patient_numero"])),
  date_emission: fmtDate(pick(o, ["date_emission", "date", "invoice_date"])),
  statut: mapInvoiceStatut(pick(o, ["statut", "status"], "impayee")),
  items: pickArr(o, ["items", "lignes"]).map((it: any) => ({
    id:
      idStr(it) ||
      `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    description: s(pick(it, ["description", "designation", "libelle"])),
    type: "consultation" as const,
    quantite: pickNum(it, ["quantite", "qte", "quantity"], 1),
    prix_unitaire: pickNum(it, ["prix_unitaire", "prix", "pu", "unit_price"]),
    total: pickNum(it, ["total", "sous_total"]),
  })),
  total_ht: pickNum(o, ["total_ht", "montant_ht", "subtotal"]),
  tva: pickNum(o, ["tva", "taxe", "tax"]),
  total_ttc: pickNum(o, ["total_ttc", "montant_ttc", "total"]),
  montant_paye: pickNum(o, [
    "montant_paye",
    "montant_paie",
    "paye",
    "amount_paid",
  ]),
  reste_a_payer: pickNum(o, ["reste_a_payer", "restant", "solde", "balance"]),
  date_creation: s(pick(o, ["date_creation", "created_at"])),
});

const mapPayment = (o: any): Payment => ({
  id: idStr(o),
  recu_numero: s(
    pick(o, ["recu_numero", "numero_recu", "recu", "payment_number"]),
  ),
  invoice_id: s(pick(o, ["invoice_id", "facture_id", "invoice"])),
  invoice_numero: s(pick(o, ["invoice_numero", "facture_numero"])),
  patient_nom: s(pick(o, ["patient_nom"])),
  montant: pickNum(o, ["montant", "amount"]),
  mode: mapPaymentMode(pick(o, ["mode", "method"], "especes")),
  reference_transaction: s(pick(o, ["reference_transaction", "reference"])),
  date: fmtDate(pick(o, ["date", "payment_date"])),
  heure: fmtTime(pick(o, ["heure", "time", "payment_date"])),
  encaisse_par_nom: s(pick(o, ["encaisse_par_nom", "par"])),
});

const mapAudit = (o: any): AuditLog => ({
  id: idStr(o),
  user_nom: s(pick(o, ["user_nom", "utilisateur", "user"])),
  action: s(pick(o, ["action", "type"])),
  module: s(pick(o, ["module"])),
  description: s(pick(o, ["description", "details"])),
  date: s(pick(o, ["date"])),
  heure: s(pick(o, ["heure", "time"])),
});

// ---------- LOADER ----------
interface ModuleDef<T> {
  key: string;
  fetch: () => Promise<any>;
  map: (o: any) => T;
  storageKey: string;
}

const MODULES: ModuleDef<any>[] = [
  {
    key: "patients",
    fetch: () => djangoApi.patients.list(),
    map: mapPatient,
    storageKey: "medicare_patients_v2",
  },
  {
    key: "doctors",
    fetch: () => djangoApi.doctors.list(),
    map: mapDoctor,
    storageKey: "medicare_doctors_v2",
  },
  {
    key: "services",
    fetch: () => djangoApi.services.list(),
    map: mapService,
    storageKey: "medicare_services_v2",
  },
  {
    key: "appointments",
    fetch: () => djangoApi.appointments.list(),
    map: mapAppointment,
    storageKey: "medicare_appointments_v2",
  },
  {
    key: "consultations",
    fetch: () => djangoApi.consultations.list(),
    map: mapConsultation,
    storageKey: "medicare_consultations_v2",
  },
  {
    key: "prescriptions",
    fetch: () => djangoApi.prescriptions.list(),
    map: mapPrescription,
    storageKey: "medicare_prescriptions_v2",
  },
  {
    key: "lab",
    fetch: () => djangoApi.lab.requests.list(),
    map: mapLab,
    storageKey: "medicare_lab_requests_v2",
  },
  {
    key: "medications",
    fetch: () => djangoApi.medications.list(),
    map: mapMedication,
    storageKey: "medicare_medications_v2",
  },
  {
    key: "invoices",
    fetch: () => djangoApi.billing.invoices.list(),
    map: mapInvoice,
    storageKey: "medicare_invoices_v2",
  },
  {
    key: "payments",
    fetch: () => djangoApi.billing.payments.list(),
    map: mapPayment,
    storageKey: "medicare_payments_v2",
  },
  {
    key: "audit",
    fetch: () => djangoApi.audit.list(),
    map: mapAudit,
    storageKey: "medicare_audit_logs_v2",
  },
];

// Sauvegarde une fois les données locales existantes (pour pouvoir les restaurer ensuite).
const backupLocalData = (): void => {
  for (const mod of MODULES) {
    const backupKey = `${mod.storageKey}__backup`;
    try {
      const current = localStorage.getItem(mod.storageKey);
      if (current && !localStorage.getItem(backupKey)) {
        localStorage.setItem(backupKey, current);
      }
    } catch {
      // ignore
    }
  }
};

// Restaure les données locales depuis la sauvegarde (retour en mode local).
export const restoreLocalData = (): void => {
  let changed = false;
  for (const mod of MODULES) {
    const backupKey = `${mod.storageKey}__backup`;
    try {
      const backup = localStorage.getItem(backupKey);
      if (backup) {
        localStorage.setItem(mod.storageKey, backup);
        changed = true;
      }
      localStorage.removeItem(backupKey);
    } catch {
      // ignore
    }
  }
  if (changed) {
    window.dispatchEvent(new Event("medicare_data_updated"));
  }
};

// Enrichit les listes récupérées depuis le backend avec les noms liés
// (les serializers Django ne renvoient que des identifiants de FK).
const enrichBackendNames = async (
  lists: Record<string, any[]>,
  rawLists: Record<string, any[]>,
): Promise<void> => {
  const byId = (arr: any[] = []) => new Map(arr.map((x) => [String(x.id), x]));
  const patients = byId(lists.patients);
  const doctors = byId(lists.doctors);
  const services = byId(lists.services);
  const medications = byId(lists.medications);
  const invoices = byId(lists.invoices);

  // 1. Récupère les comptes utilisateurs backend : les profils médecin ne
  //    renvoient que la FK `user`, jamais les noms.
  const backendUsers = new Map<string, { nom: string; prenom: string }>();
  if ((rawLists.doctors || []).length) {
    try {
      const users = await djangoApi.auth.list();
      for (const u of users) {
        backendUsers.set(String(u.id), { nom: u.nom, prenom: u.prenom });
      }
    } catch {
      // comptes backend indisponibles : noms vides pour les médecins backend
    }
  }

  // 2. Spécialités backend : les profils médecin ne renvoient que la FK `specialty`.
  const specialties = new Map<string, string>();
  if (
    (rawLists.doctors || []).some(
      (d: any) => d?.specialty !== undefined && d?.specialty !== null,
    )
  ) {
    try {
      const raw = normalizeList(await djangoApi.specialties.list());
      for (const s of raw)
        specialties.set(String(s.id), String(s.name || s.nom || ""));
    } catch {
      // spécialités indisponibles
    }
  }

  // 3. Noms d'examens backend : les demandes ne renvoient que la FK `lab_test`.
  const labTests = new Map<string, string>();
  if (
    (rawLists.lab || []).some(
      (l: any) => l?.lab_test !== undefined && l?.lab_test !== null,
    )
  ) {
    try {
      const raw = normalizeList(await djangoApi.lab.tests.list());
      for (const t of raw)
        labTests.set(String(t.id), String(t.name || t.nom || ""));
    } catch {
      // analyses backend indisponibles
    }
  }

  // 4. Stock des médicaments backend : le backend le calcule via les lots
  //    (MedicationBatch), les listes Medication n'ont pas de champ stock.
  if ((lists.medications || []).length) {
    try {
      const batches = normalizeList(await djangoApi.medicationBatches.list());
      const stockByMed = new Map<string, number>();
      const firstBatchByMed = new Map<string, any>();
      for (const b of batches) {
        const medId = relationId(b, [
          "medication",
          "medication_id",
          "medicament",
        ]);
        const q = Number(
          b.quantity_remaining ??
            b.remaining_quantity ??
            b.current_quantity ??
            b.available_quantity ??
            b.quantity ??
            b.quantite_restante ??
            b.quantite ??
            0,
        );
        stockByMed.set(medId, (stockByMed.get(medId) || 0) + q);
        if (!firstBatchByMed.has(medId)) firstBatchByMed.set(medId, b);
      }
      for (const m of lists.medications || []) {
        if (stockByMed.has(String(m.id))) {
          (m as any).stock_actuel = stockByMed.get(String(m.id));
        }
        const batch = firstBatchByMed.get(String(m.id));
        if (batch) {
          if (!m.numero_lot) {
            m.numero_lot = s(
              pick(batch, ["numero_lot", "lot_number", "batch_number"]),
            );
          }
          if (!m.date_peremption) {
            m.date_peremption = s(
              pick(batch, [
                "date_peremption",
                "date_expiration",
                "expiration_date",
                "expiry_date",
              ]),
            );
          }
        }
      }
    } catch {
      // lots indisponibles : stock_actuel reste à sa valeur (0)
    }
  }

  // 5. Enrichit les profils médecins (noms via user, spécialité, service).
  const rawDoctors = rawLists.doctors || [];
  for (let i = 0; i < rawDoctors.length; i++) {
    const d = (lists.doctors || [])[i];
    if (!d) continue;
    const raw = rawDoctors[i];
    if (!d.nom && !d.prenom) {
      const u = backendUsers.get(relationId(raw, ["user"]));
      if (u) {
        d.nom = u.nom.toUpperCase();
        d.prenom = u.prenom.toUpperCase();
      }
    }
    const sp = raw?.specialty;
    if (sp !== undefined && sp !== null && !d.specialite)
      d.specialite = specialties.get(relationId(raw, ["specialty"])) || "";
    const svc = raw?.service;
    if (svc !== undefined && svc !== null && !d.service_nom) {
      const named = services.get(relationId(raw, ["service"]));
      if (named) d.service_nom = named.nom;
    }
  }

  const joinPatient = (o: any) => {
    const p = patients.get(String(o.patient_id));
    if (p) {
      if (!o.patient_nom) o.patient_nom = `${p.prenom} ${p.nom}`.trim();
      if (!o.patient_numero) o.patient_numero = p.numero;
    }
  };
  const joinDoctor = (o: any) => {
    const d = doctors.get(String(o.doctor_id));
    if (d) {
      if (!o.doctor_nom) o.doctor_nom = `${d.prenom} ${d.nom}`.trim();
      if (!o.doctor_specialite) o.doctor_specialite = d.specialite;
    }
  };

  for (const a of lists.appointments || []) {
    joinPatient(a);
    joinDoctor(a);
    if (!a.service_nom) {
      const svc = services.get(String(a.service_id));
      if (svc) a.service_nom = svc.nom;
    }
  }
  for (const c of lists.consultations || []) {
    joinPatient(c);
    joinDoctor(c);
  }
  for (const p of lists.prescriptions || []) {
    joinPatient(p);
    joinDoctor(p);
  }

  // Lignes de prescription : rattache les médicaments (FK -> libellé).
  const rawPrescItems: any[] = [];
  for (const rp of rawLists.prescriptions || [])
    rawPrescItems.push(...((rp.items || []) as any[]));
  for (const p of lists.prescriptions || []) {
    for (const it of p.items || []) {
      if (it.medicament_nom) continue;
      const raw = rawPrescItems.find((r) => String(r.id) === String(it.id));
      if (raw && raw.medication !== undefined && raw.medication !== null) {
        const med = medications.get(String(raw.medication));
        if (med) it.medicament_nom = med.nom;
      }
    }
  }

  for (let i = 0; i < (lists.lab || []).length; i++) {
    const l = (lists.lab || [])[i];
    const raw = (rawLists.lab || [])[i];
    joinPatient(l);
    joinDoctor(l);
    if (
      raw &&
      raw.lab_test !== undefined &&
      raw.lab_test !== null &&
      !l.examen_nom
    ) {
      l.examen_nom = labTests.get(relationId(raw, ["lab_test"])) || "";
    }
  }

  for (const inv of lists.invoices || []) {
    joinPatient(inv);
  }
  for (const pm of lists.payments || []) {
    const inv = invoices.get(String(pm.invoice_id));
    if (inv) {
      if (!pm.patient_nom) pm.patient_nom = inv.patient_nom;
      if (!pm.invoice_numero) pm.invoice_numero = inv.numero;
    }
  }
};

// Charge les données du backend dans la couche de lecture locale (qui est ensuite consommée
// par apiService). Si le backend est indisponible, on conserve les données locales existantes
// et on désactive le mode backend. Les données locales sont masquées tant que le backend est
// la source privilégiée, puis restaurées comme repli si on revient en mode local.
export const hydrateFromBackend = async (): Promise<void> => {
  if (!isBackendActive()) return;

  // Sauvegarde les données locales avant tout écrasement (non destructif).
  backupLocalData();

  const lists: Record<string, any[]> = {};
  const rawLists: Record<string, any[]> = {};
  let firstNetworkError = false;
  for (const mod of MODULES) {
    try {
      const res = normalizeList(await mod.fetch());
      const mapped = valid<unknown>(res.map(mod.map));
      if (firstNetworkError) continue;
      rawLists[mod.key] = res;
      lists[mod.key] = mapped;
    } catch (err: any) {
      const msg = String((err && err.message) || "");
      const isNetwork = /failed to fetch|network|load failed|fetch/i.test(msg);
      if (isNetwork && !firstNetworkError) {
        firstNetworkError = true;
        // Backend indisponible : on reste sur les données locales et on désactive le mode backend.
        setBackendActive(false);
      }
      // Pour une erreur métier (ex. 403/404 sur un module), on garde les données locales du module.
    }
  }

  if (Object.keys(lists).length) {
    await enrichBackendNames(lists, rawLists);
    for (const mod of MODULES) {
      // Source de vérité = backend : on remplace la liste locale même si vide.
      if (lists[mod.key] === undefined) continue;
      try {
        localStorage.setItem(mod.storageKey, JSON.stringify(lists[mod.key]));
      } catch {
        // stockage plein : on ignore
      }
    }
  }
  window.dispatchEvent(new Event("medicare_data_updated"));
};

// À appeler après toute écriture distante : le cache local ne devient
// visible qu'après relecture de la réponse Django.
export const refreshAfterBackendWrite = async (): Promise<void> => {
  if (isBackendActive()) await hydrateFromBackend();
};

// ============================================================================
// SYNCHRONISATION EN ÉCRITURE (Local -> Backend)
// ----------------------------------------------------------------------------
// Chaque création locale est répliquée côté backend en mode « best-effort » :
// si le backend est injoignable ou rejette le payload, on ne bloque jamais le
// flux local (capture silencieuse + journalisation console).
// Pour les entités liées par clés étrangères (consultation, RV, prescription,
// labo, facture, paiement) on résout l'id backend via un référentiel local.
// ============================================================================

const REFS_KEY = "medicare_backend_refs_v2";

type RefMap = Record<string, Record<string, number | string>>;

const loadRefs = (): RefMap => {
  try {
    return JSON.parse(localStorage.getItem(REFS_KEY) || "{}") as RefMap;
  } catch {
    return {};
  }
};

const saveRefs = (refs: RefMap): void => {
  try {
    localStorage.setItem(REFS_KEY, JSON.stringify(refs));
  } catch {
    // stockage plein : on ignore
  }
};

const setRef = (
  kind: string,
  localId: string,
  backendId: number | string,
): void => {
  const refs = loadRefs();
  if (!refs[kind]) refs[kind] = {};
  refs[kind][String(localId)] = backendId;
  saveRefs(refs);
};

const getRef = (kind: string, localId: string): number | string | undefined => {
  const refs = loadRefs();
  return refs[kind]?.[String(localId)];
};

const asNum = (ref: number | string | undefined): number | undefined => {
  if (ref === undefined || ref === null) return undefined;
  const n = Number(ref);
  return Number.isFinite(n) ? n : undefined;
};

// Les objets hydratés depuis Django ont déjà leur identifiant distant comme id;
// les objets créés localement utilisent la table de références.
const backendId = (
  kind: string,
  localId: string | undefined,
): number | undefined => {
  if (!localId) return undefined;
  return asNum(getRef(kind, localId) ?? localId);
};

// Capture silencieuse : renvoie true si envoi réussi, false sinon.
const safeSend = async (fn: () => Promise<any>): Promise<any> => {
  try {
    return await fn();
  } catch (err: any) {
    const msg = String((err && err.message) || err || "");
    // Erreur métier (validation, doublon, FK manquante…) : on n'embête pas l'utilisateur.
    console.warn("[sync] Création backend ignorée :", msg);
    return undefined;
  }
};

const stripEmpty = (o: Record<string, any>): Record<string, any> => {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
};

// ---- Patients ----
export const syncPatientCreate = async (local: any): Promise<void> => {
  if (!local?.id) return;
  // Convention Patient côté backend : first_name = prénom, last_name = nom de famille.
  const backend = await safeSend(() =>
    djangoApi.patients.create(
      stripEmpty({
        patient_number: local.numero || `PAT-${Date.now()}`,
        first_name: local.prenom,
        last_name: local.nom,
        gender:
          (local.sexe || "OTHER") === "F"
            ? "FEMALE"
            : local.sexe === "M"
              ? "MALE"
              : "OTHER",
        date_of_birth: local.date_naissance || null,
        phone: local.telephone,
        email: local.email,
        address: [local.adresse, local.ville].filter(Boolean).join(", "),
        blood_group:
          local.groupe_sanguin === "Inconnu" ? "" : local.groupe_sanguin,
        allergies: Array.isArray(local.allergies)
          ? local.allergies.join(", ")
          : local.allergies,
        status: "ACTIVE",
      }),
    ),
  );
  if (backend?.id) setRef("patients", local.id, backend.id);
};

// ---- Médecins ----
// Le backend exige une FK `user` obligatoire. On crée donc d'abord le compte
// utilisateur (rôle medecin), puis on retrouve (ou crée) son profil Doctor.
export const syncDoctorCreate = async (local: any): Promise<void> => {
  if (!local?.id) return;
  const email = String(
    local.email ||
      `md-${String(local.id)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")}@medicare.local`,
  );
  const password = `Medicare-${String(local.matricule || local.id).replace(/\W/g, "") || "2026"}`;

  // 1. Réutilise un compte backend existant si le même email est déjà enregistré.
  let userId: any;
  try {
    const users = await djangoApi.auth.list();
    const found = users.find(
      (u: any) => String(u.email || "").toLowerCase() === email.toLowerCase(),
    );
    if (found) userId = found.id;
  } catch {
    // liste des comptes indisponible
  }
  if (userId === undefined) {
    const created = await safeSend(() =>
      djangoApi.auth.register(
        stripEmpty({
          email,
          password,
          nom: local.nom,
          prenom: local.prenom,
          role: "medecin",
          telephone: local.telephone,
          specialite: local.specialite || "Médecine Générale",
          matricule: local.matricule || local.numero_ordre,
        }) as Parameters<typeof djangoApi.auth.register>[0],
      ),
    );
    if (created?.user?.id) userId = created.user.id;
  }
  if (userId === undefined) return;

  // 2. Retrouve ou crée le profil médecin lié à ce compte.
  let docId: any;
  try {
    const docs = normalizeList(await djangoApi.doctors.list());
    const existing = docs.find((d: any) => String(d.user) === String(userId));
    if (existing?.id) docId = existing.id;
  } catch {
    // liste des médecins indisponible
  }
  if (docId === undefined) {
    let specialtyId: number | undefined;
    try {
      const specialties = normalizeList(await djangoApi.specialties.list());
      const found = specialties.find(
        (item: any) =>
          String(item.name || item.nom || "").toLowerCase() ===
          String(local.specialite || "").toLowerCase(),
      );
      specialtyId = asNum(found?.id);
    } catch {
      // La spécialité peut être optionnelle selon le serializer Django.
    }
    const backend = await safeSend(() =>
      djangoApi.doctors.create(
        stripEmpty({
          user: userId,
          registration_number: local.matricule || local.numero_ordre,
          consultation_fee: local.tarif_consultation,
          specialty: specialtyId,
          service: backendId("services", local.service_id),
          is_available: true,
        }),
      ),
    );
    if (backend?.id) docId = backend.id;
  }
  if (docId !== undefined) setRef("doctors", local.id, docId);
};

// ---- Rendez-vous ----
export const syncAppointmentCreate = async (local: any): Promise<void> => {
  const patientId = asNum(getRef("patients", local.patient_id));
  const doctorId = asNum(getRef("doctors", local.doctor_id));
  if (!local?.id || !patientId || !doctorId) return;
  await safeSend(() =>
    djangoApi.appointments.create(
      stripEmpty({
        appointment_number: `RDV-${Date.now()}`,
        patient: patientId,
        doctor: doctorId,
        service: asNum(getRef("services", local.service_id)),
        appointment_date: local.date,
        appointment_time: local.heure,
        reason: local.motif,
        status: "SCHEDULED",
        notes: local.notes,
      }),
    ),
  );
};

// ---- Consultations ----
export const syncConsultationCreate = async (local: any): Promise<void> => {
  const patientId = asNum(getRef("patients", local.patient_id));
  const doctorId = asNum(getRef("doctors", local.doctor_id));
  if (!local?.id || !patientId || !doctorId) return;
  const c = local.constantes || {};
  const backend = await safeSend(() =>
    djangoApi.consultations.create(
      stripEmpty({
        consultation_number: `CONS-${Date.now()}`,
        patient: patientId,
        doctor: doctorId,
        reason: local.motif,
        symptoms: Array.isArray(local.symptomes)
          ? local.symptomes.join(", ")
          : local.symptomes,
        temperature: c.temperature,
        weight: c.poids,
        height: c.taille,
        blood_pressure: c.tension_systolique
          ? `${c.tension_systolique}/${c.tension_diastolique}`
          : "",
        heart_rate: c.pouls,
        diagnosis: local.diagnostic_principal,
        observations: local.notes_medicales || local.histoire_maladie,
        treatment_plan: local.plan_traitement,
        status: "COMPLETED",
      }),
    ),
  );
  if (backend?.id) setRef("consultations", local.id, backend.id);
};

// ---- Prescriptions ----
export const syncPrescriptionCreate = async (local: any): Promise<void> => {
  const patientId = asNum(getRef("patients", local.patient_id));
  const doctorId = asNum(getRef("doctors", local.doctor_id));
  const consultationId = asNum(getRef("consultations", local.consultation_id));
  if (!local?.id || !patientId || !doctorId || !consultationId) return;
  const backend = await safeSend(() =>
    djangoApi.prescriptions.create(
      stripEmpty({
        prescription_number: `RX-${Date.now()}`,
        consultation: consultationId,
        patient: patientId,
        doctor: doctorId,
        instructions: local.instructions_generales,
        status: "VALIDATED",
      }),
    ),
  );
  if (backend?.id) {
    setRef("prescriptions", local.id, backend.id);
    // Les lignes (PrescriptionItem) sont gérées à part côté backend.
    for (const it of Array.isArray(local.items) ? local.items : []) {
      const medId = asNum(getRef("medications", it.medicament_id || it.id));
      if (medId === undefined) continue;
      await safeSend(() =>
        djangoApi.prescriptionItems.create(
          stripEmpty({
            prescription: backend.id,
            medication: medId,
            dosage: it.dosage,
            frequency: it.frequence,
            duration: it.duree,
            quantity: it.quantite_prescrite,
            instructions: it.instructions || it.posologie,
          }),
        ),
      );
    }
  }
};

// ---- Demandes de laboratoire ----
export const syncLabRequestCreate = async (local: any): Promise<void> => {
  const patientId = backendId("patients", local.patient_id);
  const doctorId = backendId("doctors", local.doctor_id);
  const consultationId = backendId("consultations", local.consultation_id);
  if (!local?.id || !patientId || !doctorId) return;

  // Résout le test de laboratoire backend (par référence ou par libellé).
  let labTestId = asNum(
    getRef("lab_tests", local.examen_id || local.examen_nom),
  );
  if (labTestId === undefined) {
    const name = local.examen_nom || local.examen_code;
    if (!name) return;
    try {
      const tests = normalizeList(await djangoApi.lab.tests.list());
      const found = tests.find(
        (t: any) =>
          String(t.name || t.nom || "").toLowerCase() ===
          String(name).toLowerCase(),
      );
      if (found?.id) labTestId = asNum(found.id);
    } catch {
      // analyse backend indisponible
    }
  }
  if (labTestId === undefined) return;

  const backend = await safeSend(() =>
    djangoApi.lab.requests.create(
      stripEmpty({
        request_number: `LAB-${Date.now()}`,
        consultation: consultationId,
        patient: patientId,
        doctor: doctorId,
        lab_test: labTestId,
        priority:
          (local.priorite || "normale") === "urgente" ? "URGENT" : "NORMAL",
        clinical_information: local.renseignements_cliniques,
        status: "REQUESTED",
      }),
    ),
  );
  if (backend?.id) setRef("lab", local.id, backend.id);
};

// ---- Médicaments ----
export const syncMedicationCreate = async (local: any): Promise<void> => {
  if (!local?.id || !local.nom) return;
  const backend = await safeSend(() =>
    djangoApi.medications.create(
      stripEmpty({
        name: local.nom,
        generic_name: local.dci,
        form: local.forme,
        dosage: local.dosage,
        category: local.categorie,
        location: local.emplacement,
        unit: "unité",
        minimum_stock: local.seuil_alerte,
        unit_price: local.prix_unitaire,
        is_active: true,
      }),
    ),
  );
  if (backend?.id) {
    setRef("medications", local.id, backend.id);
    const batchNumber = local.numero_lot || `LOT-${Date.now()}`;
    const quantity = Number(local.stock_actuel) || 0;
    let batch = await safeSend(() =>
      djangoApi.medicationBatches.create(
        stripEmpty({
          medication: backend.id,
          batch_number: batchNumber,
          quantity,
          expiration_date: local.date_peremption || local.date_expiration,
          unit_cost: local.prix_unitaire,
        }),
      ),
    );

    // Certains backends exposent les noms du modèle métier plutôt que les
    // alias anglais utilisés par l'interface. On retente avec ces champs si
    // le premier serializer refuse le payload.
    if (!batch) {
      batch = await safeSend(() =>
        djangoApi.medicationBatches.create(
          stripEmpty({
            medication: backend.id,
            lot_number: batchNumber,
            initial_quantity: quantity,
            remaining_quantity: quantity,
            expiry_date: local.date_peremption || local.date_expiration,
            purchase_price: local.prix_unitaire,
          }),
        ),
      );
    }
  }
};

// ---- Factures ----
export const syncInvoiceCreate = async (local: any): Promise<void> => {
  const patientId = backendId("patients", local.patient_id);
  if (!local?.id || !patientId) return;
  const backend = await safeSend(() =>
    djangoApi.billing.invoices.create(
      stripEmpty({
        invoice_number: `FAC-${Date.now()}`,
        patient: patientId,
        subtotal: local.total_ht,
        tax: local.tva,
        total: local.total_ttc,
        amount_paid: local.montant_paye || 0,
        balance: local.reste_a_payer ?? local.total_ttc,
        status:
          local.statut === "payee"
            ? "PAID"
            : local.statut === "partiellement_payee"
              ? "PARTIALLY_PAID"
              : local.statut === "annulee"
                ? "CANCELLED"
                : "UNPAID",
      }),
    ),
  );
  if (backend?.id) {
    setRef("invoices", local.id, backend.id);
    for (const item of Array.isArray(local.items) ? local.items : []) {
      await safeSend(() =>
        djangoApi.billing.invoiceItems.create(
          stripEmpty({
            invoice: backend.id,
            medication:
              item.type === "medicament"
                ? backendId("medications", item.medicament_id)
                : undefined,
            description: item.description,
            item_type: item.type,
            quantity: item.quantite,
            unit_price: item.prix_unitaire,
            total: item.total,
          }),
        ),
      );
    }
  }
};

// ---- Paiements ----
export const syncPaymentCreate = async (local: any): Promise<void> => {
  const invoiceId = asNum(getRef("invoices", local.invoice_id));
  if (!invoiceId) return;
  await safeSend(() =>
    djangoApi.billing.payments.create(
      stripEmpty({
        payment_number: `PMT-${Date.now()}`,
        invoice: invoiceId,
        amount: local.montant,
        payment_method:
          (
            {
              especes: "CASH",
              carte: "CARD",
              carte_bancaire: "CARD",
              virement: "BANK",
              mobile_money: "MOBILE_MONEY",
              assurance: "INSURANCE",
              cheque: "CASH",
              tiers_payant: "MOBILE_MONEY",
            } as Record<string, string>
          )[String(local.mode || "especes").toLowerCase()] || "CASH",
        reference: local.reference_transaction,
        status: "COMPLETED",
        notes: local.notes,
      }),
    ),
  );
};

// ---- Mouvements de stock ----
export const syncStockMovementCreate = async (local: any): Promise<void> => {
  if (!local?.id) return;
  const medId = backendId("medications", local.medicament_id);
  if (medId === undefined) return;
  const typeMap: Record<string, string> = {
    entree: "IN",
    sortie: "OUT",
    delivrance: "OUT",
    ajustement: "ADJUSTMENT",
    perime: "EXPIRED",
    perte: "DAMAGED",
  };
  await safeSend(() =>
    djangoApi.stockMovements.create(
      stripEmpty({
        medication: medId,
        movement_type: typeMap[local.type] || "ADJUSTMENT",
        quantity: Math.abs(Number(local.quantite) || 0),
        reason: local.motif || local.reason,
        reference: local.reference_document || local.reference,
      }),
    ),
  );
  await refreshAfterBackendWrite();
};

// ============================================================================
// MISE À JOUR & SUPPRESSION (Local -> Backend)
// ----------------------------------------------------------------------------
// Les modifications locales sont reportées vers le backend (PATCH) dès lors
// qu'une référence d'entité existe (l'entité a déjà été répliquée). Sans
// référence, la modification reste locale (best-effort conservateur).
// ============================================================================

const BACKEND_APPT_STATUTS: Record<string, string> = {
  programme: "SCHEDULED",
  confirme: "CONFIRMED",
  en_attente: "WAITING",
  en_consultation: "IN_PROGRESS",
  termine: "COMPLETED",
  annule: "CANCELLED",
};
const BACKEND_PRESC_STATUTS: Record<string, string> = {
  brouillon: "DRAFT",
  validee: "VALIDATED",
  delivree: "DISPENSED",
  annulee: "CANCELLED",
};
const BACKEND_LAB_STATUTS: Record<string, string> = {
  demandee: "REQUESTED",
  prelevement: "SAMPLE_COLLECTED",
  en_cours: "IN_PROGRESS",
  analyse: "IN_PROGRESS",
  resultat_disponible: "RESULT_AVAILABLE",
  validee: "VALIDATED",
  annulee: "CANCELLED",
};
const BACKEND_INVOICE_STATUTS: Record<string, string> = {
  emise: "UNPAID",
  brouillon: "UNPAID",
  impayee: "UNPAID",
  partiellement_payee: "PARTIALLY_PAID",
  payee: "PAID",
  annulee: "CANCELLED",
};
const BACKEND_PAYMENT_MODES: Record<string, string> = {
  especes: "CASH",
  carte: "CARD",
  carte_bancaire: "CARD",
  virement: "BANK",
  mobile_money: "MOBILE_MONEY",
  assurance: "INSURANCE",
  cheque: "CASH",
  tiers_payant: "MOBILE_MONEY",
};

const genderToBackend = (g: string): string =>
  String(g || "")
    .toUpperCase()
    .includes("F")
    ? "FEMALE"
    : String(g || "")
          .toUpperCase()
          .includes("M")
      ? "MALE"
      : "OTHER";

// Construit le payload PATCH accepté par le backend à partir d'une entité locale.
const buildUpdatePayload = (kind: string, local: any): Record<string, any> => {
  if (!local) return {};
  switch (kind) {
    case "patients":
      return stripEmpty({
        patient_number: local.numero,
        first_name: local.prenom,
        last_name: local.nom,
        gender: genderToBackend(local.sexe),
        date_of_birth: local.date_naissance || null,
        phone: local.telephone,
        email: local.email,
        address: [local.adresse, local.ville].filter(Boolean).join(", "),
        blood_group:
          local.groupe_sanguin === "Inconnu" ? "" : local.groupe_sanguin,
        allergies: Array.isArray(local.allergies)
          ? local.allergies.join(", ")
          : local.allergies,
        status: local.statut === "archive" ? "ARCHIVED" : "ACTIVE",
      });
    case "doctors":
      return stripEmpty({
        registration_number: local.matricule || local.numero_ordre,
        consultation_fee: local.tarif_consultation,
        is_available: local.statut !== "inactif",
      });
    case "services":
      return stripEmpty({
        name: local.nom,
        description: local.description,
        price: local.tarif_consultation ?? local.tarif,
        is_active: local.statut !== "inactif",
      });
    case "appointments":
      return stripEmpty({
        appointment_date: local.date,
        appointment_time: local.heure,
        reason: local.motif,
        status: BACKEND_APPT_STATUTS[local.statut] || "SCHEDULED",
        notes: local.notes,
      });
    case "consultations":
      return stripEmpty({
        reason: local.motif,
        symptoms: Array.isArray(local.symptomes)
          ? local.symptomes.join(", ")
          : local.symptomes,
        temperature: local.constantes?.temperature,
        weight: local.constantes?.poids,
        height: local.constantes?.taille,
        blood_pressure: local.constantes?.tension_systolique
          ? `${local.constantes.tension_systolique}/${local.constantes.tension_diastolique}`
          : "",
        heart_rate: local.constantes?.pouls,
        diagnosis: local.diagnostic_principal,
        observations: local.notes_medicales || local.histoire_maladie,
        treatment_plan: local.plan_traitement,
      });
    case "prescriptions":
      return stripEmpty({
        instructions: local.instructions_generales,
        status: BACKEND_PRESC_STATUTS[local.statut] || "VALIDATED",
      });
    case "lab":
      return stripEmpty({
        result: local.resultats,
        conclusion: local.conclusion,
        status:
          BACKEND_LAB_STATUTS[String(local.statut || "").toLowerCase()] ||
          "REQUESTED",
      });
    case "medications":
      return stripEmpty({
        name: local.nom,
        generic_name: local.dci,
        form: local.forme,
        dosage: local.dosage,
        unit: "unité",
        minimum_stock: local.seuil_alerte,
        unit_price: local.prix_unitaire,
        is_active: local.statut !== "inactif",
      });
    case "invoices":
      return stripEmpty({
        subtotal: local.total_ht,
        tax: local.tva,
        total: local.total_ttc,
        amount_paid: local.montant_paye,
        balance: local.reste_a_payer ?? local.total_ttc,
        status: BACKEND_INVOICE_STATUTS[local.statut] || "UNPAID",
      });
    case "payments":
      return stripEmpty({
        amount: local.montant,
        payment_method: BACKEND_PAYMENT_MODES[local.mode] || "CASH",
        reference: local.reference_transaction,
        status: local.statut === "annule" ? "CANCELLED" : "COMPLETED",
      });
    default:
      return {};
  }
};

const resourceOf = (kind: string): any => {
  switch (kind) {
    case "patients":
      return djangoApi.patients;
    case "doctors":
      return djangoApi.doctors;
    case "services":
      return djangoApi.services;
    case "appointments":
      return djangoApi.appointments;
    case "consultations":
      return djangoApi.consultations;
    case "prescriptions":
      return djangoApi.prescriptions;
    case "medications":
      return djangoApi.medications;
    case "lab":
      return djangoApi.lab.requests;
    case "invoices":
      return djangoApi.billing.invoices;
    case "payments":
      return djangoApi.billing.payments;
    default:
      return null;
  }
};

// Reporte une modification locale vers le backend (PATCH) si l'entité y a déjà
// été répliquée. Dans le cas contraire, la modification reste locale.
export const syncEntityUpdate = async (
  kind: string,
  local: any,
): Promise<void> => {
  if (!local?.id) return;
  const ref = getRef(kind, local.id);
  if (ref === undefined) return;
  const resource = resourceOf(kind);
  if (!resource?.partialUpdate) return;
  const payload = buildUpdatePayload(kind, local);
  if (!Object.keys(payload).length) return;
  await safeSend(() => resource.partialUpdate(ref, payload));
  await refreshAfterBackendWrite();
};

// Supprime côté backend une entité déjà répliquée (aucun effet si absente).
export const syncEntityDelete = async (
  kind: string,
  localId: string,
): Promise<void> => {
  if (!localId) return;
  const ref = getRef(kind, localId);
  if (ref === undefined) return;
  const resource = resourceOf(kind);
  if (!resource?.destroy) return;
  await safeSend(() => resource.destroy(ref));
  await refreshAfterBackendWrite();
};

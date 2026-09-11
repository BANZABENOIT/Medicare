export type UserRole =
  | 'admin'
  | 'doctor'
  | 'receptionist'
  | 'lab_tech'
  | 'pharmacist'
  | 'cashier'
  | 'medecin'
  | 'infirmier'
  | 'receptionniste'
  | 'pharmacien'
  | 'laborantin'
  | 'caissier';

export type PrintDocumentType =
  | 'prescription'
  | 'invoice'
  | 'lab_result'
  | 'medical_record'
  | 'payment_receipt';

export interface User {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: UserRole;
  telephone?: string;
  avatar?: string;
  statut?: 'actif' | 'inactif';
  actif?: boolean;
  date_creation: string;
  derniere_connexion?: string;
  specialite?: string;
  service_id?: string;
  matricule?: string;
}

export interface Patient {
  id: string;
  numero: string; // e.g. PAT-2026-0042
  nom: string;
  prenom: string;
  sexe: 'M' | 'F' | 'Autre';
  date_naissance: string;
  age?: number;
  telephone: string;
  email?: string;
  adresse: string;
  ville?: string;
  personne_urgence_nom: string;
  personne_urgence_tel: string;
  personne_urgence_lien?: string;
  groupe_sanguin: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'Inconnu';
  allergies: string[];
  antecedents_medicaux: string[];
  antecedents_chirurgicaux?: string[];
  antecedents_familiaux?: string[];
  observations?: string;
  assure?: boolean;
  assurance_nom?: string;
  assurance_numero?: string;
  statut: 'actif' | 'archive';
  date_creation: string;
  derniere_visite?: string;
}

export interface MedicalService {
  id: string;
  nom: string;
  code: string;
  description: string;
  responsable_id?: string;
  responsable_nom?: string;
  statut: 'actif' | 'inactif';
  tarif_consultation: number;
}

export interface Doctor {
  id: string;
  user_id?: string;
  nom: string;
  prenom: string;
  titre?: string; // Dr, Pr
  matricule?: string;
  numero_ordre?: string;
  specialite: string;
  service_id: string;
  service_nom: string;
  telephone: string;
  email: string;
  disponibilites?: string[];
  jours_disponibles?: string[];
  heures_debut?: string;
  heures_fin?: string;
  tarif_consultation?: number;
  bureau?: string;
  statut?: 'actif' | 'inactif';
  avatar?: string;
}

export type AppointmentStatus = 'programme' | 'confirme' | 'en_attente' | 'en_consultation' | 'termine' | 'annule';

export interface Appointment {
  id: string;
  patient_id: string;
  patient_nom: string;
  patient_numero: string;
  doctor_id: string;
  doctor_nom: string;
  service_id: string;
  service_nom: string;
  date: string; // YYYY-MM-DD
  heure: string; // HH:mm
  duree_minutes: number;
  motif: string;
  priorite: 'normale' | 'urgente' | 'suivi';
  statut: AppointmentStatus;
  notes?: string;
  date_creation: string;
}

export interface Vitals {
  tension_systolique?: number; // mmHg
  tension_diastolique?: number; // mmHg
  pouls?: number; // bpm
  temperature?: number; // °C
  poids?: number; // kg
  taille?: number; // cm
  imc?: number; // kg/m²
  spo2?: number; // %
  frequence_respiratoire?: number; // /min
  glycemie_capillaire?: number; // g/L
}

export interface Consultation {
  id: string;
  patient_id: string;
  patient_nom: string;
  patient_numero: string;
  doctor_id: string;
  doctor_nom: string;
  doctor_specialite: string;
  appointment_id?: string;
  date: string;
  heure: string;
  motif: string;
  histoire_maladie?: string;
  symptomes: string[];
  constantes: Vitals;
  examen_physique?: string;
  diagnostic_principal: string;
  code_cim10?: string;
  diagnostics_associes?: string[];
  plan_traitement: string;
  notes_medicales?: string;
  ordonnance_id?: string;
  demande_labo_id?: string;
  arret_travail_jours?: number;
  date_creation: string;
}

export type PrescriptionStatus = 'brouillon' | 'validee' | 'delivree' | 'annulee';

export interface PrescriptionItem {
  id: string;
  medicament_id?: string;
  medicament_nom: string;
  forme: string;
  dosage: string;
  posologie: string;
  frequence: string;
  duree: string;
  instructions?: string;
  quantite_prescrite: number;
  delivre?: boolean;
}

export interface Prescription {
  id: string;
  numero: string;
  consultation_id?: string;
  patient_id: string;
  patient_nom: string;
  patient_age?: number;
  doctor_id: string;
  doctor_nom: string;
  doctor_specialite: string;
  date: string;
  statut: PrescriptionStatus;
  instructions_generales?: string;
  items: PrescriptionItem[];
  delivree_par?: string;
  date_delivrance?: string;
  date_creation: string;
}

export type LabStatus = 'demandee' | 'en_cours' | 'prelevement' | 'analyse' | 'resultat_disponible' | 'validee' | 'annulee';

export interface LabResultItem {
  parametre: string;
  valeur: string | number;
  unite: string;
  normes: string;
  est_anormal: boolean;
  remarque?: string;
}

export interface LabRequest {
  id: string;
  numero: string;
  consultation_id?: string;
  patient_id: string;
  patient_nom: string;
  doctor_id: string;
  doctor_nom: string;
  examen_code: string;
  examen_nom: string;
  categorie: 'Hématologie' | 'Biochimie' | 'Microbiologie' | 'Immunologie' | 'Sérologie' | 'Parasitologie';
  priorite: 'normale' | 'urgente';
  statut: LabStatus;
  renseignements_cliniques?: string;
  date_demande: string;
  date_prelevement?: string;
  date_analyse?: string;
  date_validation?: string;
  valide_par_nom?: string;
  valide_par_id?: string;
  resultats: LabResultItem[];
  conclusion?: string;
  date_creation: string;
}

export interface Medication {
  id: string;
  code?: string;
  nom: string;
  dci?: string;
  forme: string;
  dosage: string;
  categorie: string;
  prix_unitaire: number;
  stock_actuel: number;
  seuil_alerte: number;
  lot_numero?: string;
  numero_lot?: string;
  date_expiration?: string;
  date_peremption?: string;
  emplacement: string;
  ordonnance_obligatoire?: boolean;
  sur_ordonnance_uniquement?: boolean;
  statut?: 'disponible' | 'stock_faible' | 'rupture' | 'perime';
}

export interface StockMovement {
  id: string;
  medicament_id: string;
  medicament_nom: string;
  type: 'entree' | 'sortie' | 'delivrance' | 'ajustement' | 'perime' | 'perte';
  quantite: number;
  stock_avant?: number;
  stock_apres?: number;
  motif: string;
  reference_document?: string;
  user_nom?: string;
  effectue_par_nom?: string;
  date: string;
  heure?: string;
}

export type InvoiceStatus = 'emise' | 'brouillon' | 'impayee' | 'partiellement_payee' | 'payee' | 'annulee';

export interface InvoiceItem {
  id: string;
  description: string;
  type: 'consultation' | 'examen' | 'medicament' | 'acte' | 'autre';
  quantite: number;
  prix_unitaire: number;
  total: number;
}

export interface Invoice {
  id: string;
  numero: string;
  patient_id: string;
  patient_nom: string;
  patient_numero: string;
  date_emission: string;
  date_echeance?: string;
  statut: InvoiceStatus;
  items: InvoiceItem[];
  total_ht: number;
  remise_pourcentage?: number;
  remise_montant?: number;
  tva?: number;
  tva_montant?: number;
  total_ttc: number;
  montant_paye: number;
  reste_a_payer: number;
  prise_en_charge_part_assurance?: number;
  part_patient?: number;
  notes?: string;
  date_creation: string;
}

export interface Payment {
  id: string;
  recu_numero: string;
  invoice_id: string;
  invoice_numero?: string;
  patient_id?: string;
  patient_nom?: string;
  montant: number;
  mode: 'especes' | 'carte' | 'carte_bancaire' | 'virement' | 'mobile_money' | 'assurance' | 'cheque' | 'tiers_payant';
  reference_transaction?: string;
  date: string;
  heure: string;
  encaisse_par_nom?: string;
  notes?: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_nom: string;
  user_role?: UserRole;
  action: string;
  module: string;
  description: string;
  date: string;
  heure: string;
  adresse_ip?: string;
  ip?: string;
  statut?: 'succes' | 'alerte' | 'echec';
}

export interface ClinicSettings {
  nom: string;
  slogan: string;
  adresse: string;
  ville: string;
  pays: string;
  telephone: string;
  email: string;
  site_web?: string;
  numero_agrement: string;
  devise: string;
  taux_tva: number;
  directeur_medical: string;
}

export interface Specialty {
  id: string;
  nom: string;
  code?: string;
  description?: string;
}

export interface MedicalHistory {
  id: string;
  patient_id: string;
  type: 'antecedent' | 'chirurgie' | 'allergie' | 'chronique' | 'familial' | 'autre';
  description: string;
  date_diagnostic?: string;
  traitements_actuels?: string;
  severite?: 'legere' | 'moderee' | 'severe';
  notes?: string;
}

export interface MedicationBatch {
  id: string;
  medicament_id: string;
  medicament_nom?: string;
  numero_lot: string;
  date_fabrication?: string;
  date_expiration: string;
  quantite_initiale: number;
  quantite_restante: number;
  prix_achat?: number;
  fournisseur?: string;
  statut?: 'actif' | 'perime' | 'epuise' | 'quarantaine';
}

export interface LabTest {
  id: string;
  code: string;
  nom: string;
  categorie: 'Hématologie' | 'Biochimie' | 'Microbiologie' | 'Immunologie' | 'Sérologie' | 'Parasitologie' | 'Autre';
  description?: string;
  prix: number;
  delai_heures?: number;
  valeurs_reference?: string;
  unite?: string;
  actif?: boolean;
}

export interface BillingItem {
  id: string;
  code: string;
  designation: string;
  type: 'consultation' | 'examen' | 'medicament' | 'acte' | 'hospitalisation' | 'autre';
  tarif: number;
  description?: string;
  tva_applicable?: boolean;
  actif?: boolean;
}

export interface SystemNotification {
  id: string;
  titre: string;
  message: string;
  type: 'info' | 'succes' | 'alerte' | 'urgent';
  user_id?: string;
  lu: boolean;
  date_creation: string;
  lien?: string;
}

export interface DjangoApiConfig {
  baseUrl: string;
  useLiveBackend: boolean;
  accessToken?: string;
  refreshToken?: string;
  lastConnected?: string;
}



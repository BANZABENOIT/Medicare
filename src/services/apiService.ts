import {
  User,
  UserRole,
  Patient,
  Doctor,
  MedicalService,
  Appointment,
  Consultation,
  Prescription,
  LabRequest,
  Medication,
  StockMovement,
  Invoice,
  Payment,
  AuditLog,
  ClinicSettings
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_PATIENTS,
  INITIAL_DOCTORS,
  INITIAL_SERVICES,
  INITIAL_APPOINTMENTS,
  INITIAL_CONSULTATIONS,
  INITIAL_PRESCRIPTIONS,
  INITIAL_LAB_REQUESTS,
  INITIAL_MEDICATIONS,
  INITIAL_STOCK_MOVEMENTS,
  INITIAL_INVOICES,
  INITIAL_PAYMENTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_SETTINGS
} from './mockData';
import { djangoApi, getApiConfig, saveApiConfig, setBackendActive, isBackendActive } from './djangoApiClient';
import { syncEntityUpdate, syncStockMovementCreate } from './backendSync';

export { djangoApi, getApiConfig, saveApiConfig, setBackendActive, isBackendActive };

const STORAGE_KEYS = {
  USERS: 'medicare_users_v2',
  PATIENTS: 'medicare_patients_v2',
  DOCTORS: 'medicare_doctors_v2',
  SERVICES: 'medicare_services_v2',
  APPOINTMENTS: 'medicare_appointments_v2',
  CONSULTATIONS: 'medicare_consultations_v2',
  PRESCRIPTIONS: 'medicare_prescriptions_v2',
  LAB_REQUESTS: 'medicare_lab_requests_v2',
  MEDICATIONS: 'medicare_medications_v2',
  STOCK_MOVEMENTS: 'medicare_stock_movements_v2',
  INVOICES: 'medicare_invoices_v2',
  PAYMENTS: 'medicare_payments_v2',
  AUDIT_LOGS: 'medicare_audit_logs_v2',
  SETTINGS: 'medicare_settings_v2',
  CURRENT_USER: 'medicare_current_user_v1',
  AUTH_SESSION: 'medicare_auth_session_v1'
};

function getStored<T>(key: string, defaultVal: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) {
      localStorage.setItem(key, JSON.stringify(defaultVal));
      return defaultVal;
    }
    return JSON.parse(item);
  } catch {
    return defaultVal;
  }
}

function setStored<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
    window.dispatchEvent(new Event('medicare_data_updated'));
  } catch (err) {
    console.error(`Error saving ${key}:`, err);
  }
}

export const apiService = {
  // Reset database to initial medical seed data
  resetDatabase: () => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(INITIAL_PATIENTS));
    localStorage.setItem(STORAGE_KEYS.DOCTORS, JSON.stringify(INITIAL_DOCTORS));
    localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(INITIAL_SERVICES));
    localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(INITIAL_APPOINTMENTS));
    localStorage.setItem(STORAGE_KEYS.CONSULTATIONS, JSON.stringify(INITIAL_CONSULTATIONS));
    localStorage.setItem(STORAGE_KEYS.PRESCRIPTIONS, JSON.stringify(INITIAL_PRESCRIPTIONS));
    localStorage.setItem(STORAGE_KEYS.LAB_REQUESTS, JSON.stringify(INITIAL_LAB_REQUESTS));
    localStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(INITIAL_MEDICATIONS));
    localStorage.setItem(STORAGE_KEYS.STOCK_MOVEMENTS, JSON.stringify(INITIAL_STOCK_MOVEMENTS));
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(INITIAL_INVOICES));
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(INITIAL_PAYMENTS));
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(INITIAL_AUDIT_LOGS));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
    window.dispatchEvent(new Event('medicare_data_updated'));
  },
  resetAllData: () => {
    apiService.resetDatabase();
  },

  // Auth & Current User
  auth: {
    isAuthenticated: (): boolean => {
      try {
        const session = localStorage.getItem(STORAGE_KEYS.AUTH_SESSION);
        return session === 'true';
      } catch {
        return false;
      }
    },
    getCurrentUser: (): User => {
      const users = getStored<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
      const stored = getStored<User | null>(STORAGE_KEYS.CURRENT_USER, null);
      if (stored && stored.id) {
        // Le user stocké peut provenir du backend (non présent dans la liste locale).
        return stored;
      }
      const defaultUser = users[0] || INITIAL_USERS[0];
      setStored(STORAGE_KEYS.CURRENT_USER, defaultUser);
      return defaultUser;
    },
    switchRole: (role: UserRole) => {
      const users = getStored<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
      const targetUser = users.find(u => u.role === role) || users[0];
      setStored(STORAGE_KEYS.CURRENT_USER, targetUser);
      localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, 'true');
      apiService.audit.log(targetUser.id, targetUser.nom + ' ' + targetUser.prenom, role, 'CHANGEMENT_ROLE', 'Authentification', `Changement de rôle vers ${role}`);
      return targetUser;
    },
    login: (email: string): User | null => {
      const users = getStored<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (user) {
        setStored(STORAGE_KEYS.CURRENT_USER, user);
        localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, 'true');
        apiService.audit.log(user.id, user.nom + ' ' + user.prenom, user.role, 'CONNEXION', 'Authentification', `Connexion réussie de ${user.email}`);
        return user;
      }
      return null;
    },
    setAuthenticatedUser: (user: User) => {
      const normalized: User = {
        ...user,
        nom: String(user.nom || '').toUpperCase(),
        prenom: String(user.prenom || '').toUpperCase()
      };
      setStored(STORAGE_KEYS.CURRENT_USER, normalized);
      localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, 'true');
      apiService.audit.log(normalized.id, normalized.nom + ' ' + normalized.prenom, normalized.role, 'CONNEXION', 'Authentification', `Connexion de ${normalized.email || normalized.nom}`);
    },
    logout: () => {
      const curUser = apiService.auth.getCurrentUser();
      apiService.audit.log(curUser.id, curUser.nom, curUser.role, 'DECONNEXION', 'Authentification', `Déconnexion de l'utilisateur ${curUser.email || curUser.nom}`);
      localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
      setBackendActive(false);
      try {
        djangoApi.auth.logout();
      } catch {
        // ignore
      }
    }
  },

  // Patients Module
  patients: {
    getAll: (): Patient[] => getStored<Patient[]>(STORAGE_KEYS.PATIENTS, INITIAL_PATIENTS),
    getById: (id: string): Patient | undefined => {
      const patients = getStored<Patient[]>(STORAGE_KEYS.PATIENTS, INITIAL_PATIENTS);
      return patients.find(p => p.id === id);
    },
    create: (patientData: Omit<Patient, 'id' | 'numero' | 'date_creation'>): Patient => {
      const patients = getStored<Patient[]>(STORAGE_KEYS.PATIENTS, INITIAL_PATIENTS);
      const newNum = `PAT-2026-${String(patients.length + 1).padStart(4, '0')}`;
      const newPatient: Patient = {
        ...patientData,
        id: `pat-${Date.now()}`,
        numero: newNum,
        date_creation: new Date().toISOString().split('T')[0],
        statut: 'actif'
      };
      const updated = [newPatient, ...patients];
      setStored(STORAGE_KEYS.PATIENTS, updated);
      const curUser = apiService.auth.getCurrentUser();
      apiService.audit.log(curUser.id, curUser.nom, curUser.role, 'CREATION_PATIENT', 'Patients', `Création du patient ${newPatient.nom} ${newPatient.prenom} (${newPatient.numero})`);
      return newPatient;
    },
    update: (id: string, updates: Partial<Patient>): Patient | null => {
      const patients = getStored<Patient[]>(STORAGE_KEYS.PATIENTS, INITIAL_PATIENTS);
      const idx = patients.findIndex(p => p.id === id);
      if (idx === -1) return null;
      const updatedPatient = { ...patients[idx], ...updates };
      patients[idx] = updatedPatient;
      setStored(STORAGE_KEYS.PATIENTS, patients);
      if (isBackendActive()) void syncEntityUpdate('patients', updatedPatient);
      const curUser = apiService.auth.getCurrentUser();
      apiService.audit.log(curUser.id, curUser.nom, curUser.role, 'MODIFICATION_PATIENT', 'Patients', `Mise à jour fiche patient ${updatedPatient.numero}`);
      return updatedPatient;
    },
    archive: (id: string): boolean => {
      const patients = getStored<Patient[]>(STORAGE_KEYS.PATIENTS, INITIAL_PATIENTS);
      const idx = patients.findIndex(p => p.id === id);
      if (idx === -1) return false;
      patients[idx].statut = patients[idx].statut === 'archive' ? 'actif' : 'archive';
      setStored(STORAGE_KEYS.PATIENTS, patients);
      if (isBackendActive()) void syncEntityUpdate('patients', patients[idx]);
      return true;
    }
  },

  // Doctors & Services
  doctors: {
    getAll: (): Doctor[] => getStored<Doctor[]>(STORAGE_KEYS.DOCTORS, INITIAL_DOCTORS),
    create: (data: Omit<Doctor, 'id'>): Doctor => {
      const doctors = getStored<Doctor[]>(STORAGE_KEYS.DOCTORS, INITIAL_DOCTORS);
      const newDoc: Doctor = { ...data, id: `doc-${Date.now()}` };
      setStored(STORAGE_KEYS.DOCTORS, [...doctors, newDoc]);
      return newDoc;
    },
    update: (id: string, updates: Partial<Doctor>): Doctor | null => {
      const doctors = getStored<Doctor[]>(STORAGE_KEYS.DOCTORS, INITIAL_DOCTORS);
      const idx = doctors.findIndex(d => d.id === id);
      if (idx === -1) return null;
      doctors[idx] = { ...doctors[idx], ...updates };
      setStored(STORAGE_KEYS.DOCTORS, doctors);
      if (isBackendActive()) void syncEntityUpdate('doctors', doctors[idx]);
      return doctors[idx];
    }
  },

  services: {
    getAll: (): MedicalService[] => getStored<MedicalService[]>(STORAGE_KEYS.SERVICES, INITIAL_SERVICES),
    create: (data: Omit<MedicalService, 'id'>): MedicalService => {
      const services = getStored<MedicalService[]>(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
      const newSrv: MedicalService = { ...data, id: `srv-${Date.now()}` };
      setStored(STORAGE_KEYS.SERVICES, [...services, newSrv]);
      return newSrv;
    },
    update: (id: string, updates: Partial<MedicalService>): MedicalService | null => {
      const services = getStored<MedicalService[]>(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
      const idx = services.findIndex(s => s.id === id);
      if (idx === -1) return null;
      services[idx] = { ...services[idx], ...updates };
      setStored(STORAGE_KEYS.SERVICES, services);
      if (isBackendActive()) void syncEntityUpdate('services', services[idx]);
      return services[idx];
    }
  },

  // Appointments
  appointments: {
    getAll: (): Appointment[] => getStored<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS),
    create: (data: Omit<Appointment, 'id' | 'date_creation'>): { success: boolean; appointment?: Appointment; conflictMessage?: string } => {
      const appointments = getStored<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS);
      
      // Conflict detection check (same doctor, same date, overlapping time)
      const conflict = appointments.find(
        a => a.doctor_id === data.doctor_id &&
             a.date === data.date &&
             a.heure === data.heure &&
             a.statut !== 'annule'
      );
      if (conflict) {
        return {
          success: false,
          conflictMessage: `Conflit d'agenda : Le ${data.doctor_nom} a déjà un rendez-vous à ${data.heure} le ${data.date}.`
        };
      }

      const newApt: Appointment = {
        ...data,
        id: `apt-${Date.now()}`,
        date_creation: new Date().toISOString().split('T')[0]
      };
      setStored(STORAGE_KEYS.APPOINTMENTS, [newApt, ...appointments]);
      const curUser = apiService.auth.getCurrentUser();
      apiService.audit.log(curUser.id, curUser.nom, curUser.role, 'CREATION_RDV', 'Rendez-vous', `Nouveau RDV le ${newApt.date} à ${newApt.heure} pour ${newApt.patient_nom}`);
      return { success: true, appointment: newApt };
    },
    updateStatus: (id: string, statut: Appointment['statut']): Appointment | null => {
      const appointments = getStored<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS);
      const idx = appointments.findIndex(a => a.id === id);
      if (idx === -1) return null;
      appointments[idx].statut = statut;
      setStored(STORAGE_KEYS.APPOINTMENTS, appointments);
      if (isBackendActive()) void syncEntityUpdate('appointments', appointments[idx]);
      return appointments[idx];
    }
  },

  // Consultations & Medical Records
  consultations: {
    getAll: (): Consultation[] => getStored<Consultation[]>(STORAGE_KEYS.CONSULTATIONS, INITIAL_CONSULTATIONS),
    getByPatientId: (patientId: string): Consultation[] => {
      const all = getStored<Consultation[]>(STORAGE_KEYS.CONSULTATIONS, INITIAL_CONSULTATIONS);
      return all.filter(c => c.patient_id === patientId);
    },
    create: (data: Omit<Consultation, 'id' | 'date_creation'>): Consultation => {
      const consultations = getStored<Consultation[]>(STORAGE_KEYS.CONSULTATIONS, INITIAL_CONSULTATIONS);
      const newConsultation: Consultation = {
        ...data,
        id: `cst-${Date.now()}`,
        date_creation: new Date().toISOString().split('T')[0]
      };
      setStored(STORAGE_KEYS.CONSULTATIONS, [newConsultation, ...consultations]);
      
      // Update patient last visit
      apiService.patients.update(data.patient_id, {
        derniere_visite: data.date
      });

      // Update appointment status if linked
      if (data.appointment_id) {
        apiService.appointments.updateStatus(data.appointment_id, 'termine');
      }

      const curUser = apiService.auth.getCurrentUser();
      apiService.audit.log(curUser.id, curUser.nom, curUser.role, 'NOUVELLE_CONSULTATION', 'Consultations', `Consultation enregistrée pour ${data.patient_nom} - Diagnostic: ${data.diagnostic_principal}`);
      return newConsultation;
    }
  },

  // Prescriptions
  prescriptions: {
    getAll: (): Prescription[] => getStored<Prescription[]>(STORAGE_KEYS.PRESCRIPTIONS, INITIAL_PRESCRIPTIONS),
    getByPatientId: (patientId: string): Prescription[] => {
      const all = getStored<Prescription[]>(STORAGE_KEYS.PRESCRIPTIONS, INITIAL_PRESCRIPTIONS);
      return all.filter(p => p.patient_id === patientId);
    },
    create: (data: Omit<Prescription, 'id' | 'numero' | 'date_creation'>): Prescription => {
      const prescriptions = getStored<Prescription[]>(STORAGE_KEYS.PRESCRIPTIONS, INITIAL_PRESCRIPTIONS);
      const newNum = `ORD-2026-${String(prescriptions.length + 1).padStart(4, '0')}`;
      const newPrescription: Prescription = {
        ...data,
        id: `ord-${Date.now()}`,
        numero: newNum,
        date_creation: new Date().toISOString().split('T')[0]
      };
      setStored(STORAGE_KEYS.PRESCRIPTIONS, [newPrescription, ...prescriptions]);
      const curUser = apiService.auth.getCurrentUser();
      apiService.audit.log(curUser.id, curUser.nom, curUser.role, 'CREATION_ORDONNANCE', 'Prescriptions', `Ordonnance ${newPrescription.numero} créée pour ${data.patient_nom}`);
      return newPrescription;
    },
    updateStatus: (id: string, statut: Prescription['statut']): Prescription | null => {
      const prescriptions = getStored<Prescription[]>(STORAGE_KEYS.PRESCRIPTIONS, INITIAL_PRESCRIPTIONS);
      const idx = prescriptions.findIndex(p => p.id === id);
      if (idx === -1) return null;
      prescriptions[idx].statut = statut;
      setStored(STORAGE_KEYS.PRESCRIPTIONS, prescriptions);
      if (isBackendActive()) void syncEntityUpdate('prescriptions', prescriptions[idx]);
      return prescriptions[idx];
    },
    dispense: (id: string, pharmacistName: string): Prescription | null => {
      const prescriptions = getStored<Prescription[]>(STORAGE_KEYS.PRESCRIPTIONS, INITIAL_PRESCRIPTIONS);
      const idx = prescriptions.findIndex(p => p.id === id);
      if (idx === -1) return null;
      
      const p = prescriptions[idx];
      p.statut = 'delivree';
      p.delivree_par = pharmacistName;
      p.date_delivrance = new Date().toISOString().replace('T', ' ').substring(0, 16);
      p.items = (p.items || []).map(item => ({ ...item, delivre: true }));
      
      // Reduce stocks for each item
      (p.items || []).forEach(item => {
        if (item.medicament_id) {
          apiService.medications.recordMovement({
            medicament_id: item.medicament_id,
            medicament_nom: item.medicament_nom,
            type: 'delivrance',
            quantite: -(item.quantite_prescrite || 1),
            motif: `Délivrance ordonnance ${p.numero} (${p.patient_nom})`,
            reference_document: p.numero,
            user_nom: pharmacistName
          });
        }
      });

      setStored(STORAGE_KEYS.PRESCRIPTIONS, prescriptions);
      if (isBackendActive()) void syncEntityUpdate('prescriptions', p);
      const curUser = apiService.auth.getCurrentUser();
      apiService.audit.log(curUser.id, curUser.nom, curUser.role, 'DELIVRANCE_PHARMACIE', 'Pharmacie', `Délivrance ordonnance ${p.numero}`);
      return p;
    }
  },

  // Laboratory
  lab: {
    getAll: (): LabRequest[] => getStored<LabRequest[]>(STORAGE_KEYS.LAB_REQUESTS, INITIAL_LAB_REQUESTS),
    getByPatientId: (patientId: string): LabRequest[] => {
      const all = getStored<LabRequest[]>(STORAGE_KEYS.LAB_REQUESTS, INITIAL_LAB_REQUESTS);
      return all.filter(l => l.patient_id === patientId);
    },
    createRequest: (data: Omit<LabRequest, 'id' | 'numero' | 'date_creation'>): LabRequest => {
      const requests = getStored<LabRequest[]>(STORAGE_KEYS.LAB_REQUESTS, INITIAL_LAB_REQUESTS);
      const newNum = `LAB-2026-${String(requests.length + 1).padStart(4, '0')}`;
      const newRequest: LabRequest = {
        ...data,
        id: `lab-${Date.now()}`,
        numero: newNum,
        date_creation: new Date().toISOString().split('T')[0]
      };
      setStored(STORAGE_KEYS.LAB_REQUESTS, [newRequest, ...requests]);
      const curUser = apiService.auth.getCurrentUser();
      apiService.audit.log(curUser.id, curUser.nom, curUser.role, 'DEMANDE_LABORATOIRE', 'Laboratoire', `Demande d'examen ${newRequest.examen_nom} pour ${data.patient_nom}`);
      return newRequest;
    },
    updateResultsAndValidate: (id: string, results: LabRequest['resultats'], conclusion: string, validatorName: string): LabRequest | null => {
      const requests = getStored<LabRequest[]>(STORAGE_KEYS.LAB_REQUESTS, INITIAL_LAB_REQUESTS);
      const idx = requests.findIndex(l => l.id === id);
      if (idx === -1) return null;
      
      requests[idx].resultats = results;
      requests[idx].conclusion = conclusion;
      requests[idx].statut = 'validee';
      requests[idx].date_validation = new Date().toISOString().replace('T', ' ').substring(0, 16);
      requests[idx].valide_par_nom = validatorName;
      
      setStored(STORAGE_KEYS.LAB_REQUESTS, requests);
      if (isBackendActive()) void syncEntityUpdate('lab', requests[idx]);
      const curUser = apiService.auth.getCurrentUser();
      apiService.audit.log(curUser.id, curUser.nom, curUser.role, 'VALIDATION_LABO', 'Laboratoire', `Validation résultats ${requests[idx].numero} (${requests[idx].examen_nom})`);
      return requests[idx];
    },
    saveResults: (id: string, results: LabRequest['resultats'], conclusion: string, validatorName?: string): LabRequest | null => {
      const requests = getStored<LabRequest[]>(STORAGE_KEYS.LAB_REQUESTS, INITIAL_LAB_REQUESTS);
      const idx = requests.findIndex(l => l.id === id);
      if (idx === -1) return null;
      
      requests[idx].resultats = results;
      requests[idx].conclusion = conclusion;
      if (validatorName) {
        requests[idx].statut = 'validee';
        requests[idx].date_validation = new Date().toISOString().replace('T', ' ').substring(0, 16);
        requests[idx].valide_par_nom = validatorName;
      } else {
        requests[idx].statut = 'en_cours';
      }
      
      setStored(STORAGE_KEYS.LAB_REQUESTS, requests);
      if (isBackendActive()) void syncEntityUpdate('lab', requests[idx]);
      return requests[idx];
    },
    updateStatus: (id: string, statut: LabRequest['statut']): LabRequest | null => {
      const requests = getStored<LabRequest[]>(STORAGE_KEYS.LAB_REQUESTS, INITIAL_LAB_REQUESTS);
      const idx = requests.findIndex(l => l.id === id);
      if (idx === -1) return null;
      requests[idx].statut = statut;
      setStored(STORAGE_KEYS.LAB_REQUESTS, requests);
      if (isBackendActive()) void syncEntityUpdate('lab', requests[idx]);
      return requests[idx];
    }
  },

  // Medications & Pharmacy Stock
  medications: {
    getAll: (): Medication[] => getStored<Medication[]>(STORAGE_KEYS.MEDICATIONS, INITIAL_MEDICATIONS),
    create: (data: Omit<Medication, 'id' | 'statut'>): Medication => {
      const list = getStored<Medication[]>(STORAGE_KEYS.MEDICATIONS, INITIAL_MEDICATIONS);
      const statut = data.stock_actuel === 0 ? 'rupture' : data.stock_actuel <= data.seuil_alerte ? 'stock_faible' : 'disponible';
      const newMed: Medication = {
        ...data,
        id: `med-${Date.now()}`,
        statut
      };
      setStored(STORAGE_KEYS.MEDICATIONS, [...list, newMed]);
      return newMed;
    },
    adjustStock: (id: string, qty: number, type: StockMovement['type'], motif: string, user_nom: string): boolean => {
      const isNegative = type === 'sortie' || type === 'perte' || type === 'perime';
      const delta = isNegative ? -Math.abs(qty) : Math.abs(qty);
      const meds = getStored<Medication[]>(STORAGE_KEYS.MEDICATIONS, INITIAL_MEDICATIONS);
      const target = meds.find(m => m.id === id);
      if (!target) return false;
      return apiService.medications.recordMovement({
        medicament_id: target.id,
        medicament_nom: target.nom,
        type,
        quantite: delta,
        motif,
        user_nom
      });
    },
    recordMovement: (movementData: {
      medicament_id: string;
      medicament_nom: string;
      type: StockMovement['type'];
      quantite: number; // positive for in, negative for out
      motif: string;
      reference_document?: string;
      user_nom: string;
    }): boolean => {
      const meds = getStored<Medication[]>(STORAGE_KEYS.MEDICATIONS, INITIAL_MEDICATIONS);
      const movements = getStored<StockMovement[]>(STORAGE_KEYS.STOCK_MOVEMENTS, INITIAL_STOCK_MOVEMENTS);
      const idx = meds.findIndex(m => m.id === movementData.medicament_id);
      if (idx === -1) return false;

      const med = meds[idx];
      const stock_avant = med.stock_actuel;
      const stock_apres = Math.max(0, stock_avant + movementData.quantite);
      med.stock_actuel = stock_apres;
      med.statut = stock_apres === 0 ? 'rupture' : stock_apres <= med.seuil_alerte ? 'stock_faible' : 'disponible';

      const newMvt: StockMovement = {
        id: `mvt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        medicament_id: med.id,
        medicament_nom: med.nom,
        type: movementData.type,
        quantite: movementData.quantite,
        stock_avant,
        stock_apres,
        motif: movementData.motif,
        reference_document: movementData.reference_document,
        user_nom: movementData.user_nom,
        effectue_par_nom: movementData.user_nom,
        date: new Date().toISOString().split('T')[0],
        heure: new Date().toTimeString().substring(0, 5)
      };

      setStored(STORAGE_KEYS.MEDICATIONS, meds);
      setStored(STORAGE_KEYS.STOCK_MOVEMENTS, [newMvt, ...movements]);
      if (isBackendActive()) void syncStockMovementCreate(newMvt);
      return true;
    },
    getMovements: (): StockMovement[] => getStored<StockMovement[]>(STORAGE_KEYS.STOCK_MOVEMENTS, INITIAL_STOCK_MOVEMENTS),
    getStockMovements: (): StockMovement[] => getStored<StockMovement[]>(STORAGE_KEYS.STOCK_MOVEMENTS, INITIAL_STOCK_MOVEMENTS)
  },

  // Invoices & Billing
  billing: {
    getInvoices: (): Invoice[] => getStored<Invoice[]>(STORAGE_KEYS.INVOICES, INITIAL_INVOICES),
    getPayments: (): Payment[] => getStored<Payment[]>(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS),
    createInvoice: (data: any): Invoice => {
      const invoices = getStored<Invoice[]>(STORAGE_KEYS.INVOICES, INITIAL_INVOICES);
      const newNum = `FACT-2026-${String(invoices.length + 1).padStart(4, '0')}`;
      
      const total_ht = data.total_ht || data.items.reduce((sum: number, it: any) => sum + (it.quantite * it.prix_unitaire), 0);
      const total_ttc = data.total_ttc || total_ht;
      const montant_paye = data.montant_paye || 0;
      const reste_a_payer = data.reste_a_payer !== undefined ? data.reste_a_payer : Math.max(0, total_ttc - montant_paye);

      const newInvoice: Invoice = {
        ...data,
        id: `fac-${Date.now()}`,
        numero: newNum,
        total_ht,
        total_ttc,
        montant_paye,
        reste_a_payer,
        statut: data.statut || 'emise',
        date_creation: new Date().toISOString().split('T')[0]
      };

      setStored(STORAGE_KEYS.INVOICES, [newInvoice, ...invoices]);
      const curUser = apiService.auth.getCurrentUser();
      apiService.audit.log(curUser.id, curUser.nom, curUser.role, 'EMISSION_FACTURE', 'Facturation', `Facture ${newInvoice.numero} générée pour ${data.patient_nom} (${total_ttc} FBu)`);
      return newInvoice;
    },
    recordPayment: (
      invoiceIdOrData: string | any,
      montant?: number,
      mode?: any,
      reference_transaction?: string,
      user_nom?: string,
      notes?: string
    ): Payment | null => {
      const invoices = getStored<Invoice[]>(STORAGE_KEYS.INVOICES, INITIAL_INVOICES);
      const payments = getStored<Payment[]>(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);

      let invoice_id = '';
      let amount = 0;
      let payMode = 'especes';
      let refTrx = '';
      let userName = 'Caissier';
      let payNotes = '';

      if (typeof invoiceIdOrData === 'string') {
        invoice_id = invoiceIdOrData;
        amount = montant || 0;
        payMode = mode || 'especes';
        refTrx = reference_transaction || '';
        userName = user_nom || 'Caissier';
        payNotes = notes || '';
      } else {
        invoice_id = invoiceIdOrData.invoice_id;
        amount = invoiceIdOrData.montant;
        payMode = invoiceIdOrData.mode;
        refTrx = invoiceIdOrData.reference_transaction || '';
        userName = invoiceIdOrData.encaisse_par_nom || 'Caissier';
        payNotes = invoiceIdOrData.notes || '';
      }

      const invIdx = invoices.findIndex(i => i.id === invoice_id);
      if (invIdx === -1) return null;

      const invoice = invoices[invIdx];
      const newPayNum = `REC-2026-${String(payments.length + 1).padStart(4, '0')}`;
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().substring(0, 5);

      const newPayment: Payment = {
        id: `pay-${Date.now()}`,
        recu_numero: newPayNum,
        invoice_id: invoice.id,
        invoice_numero: invoice.numero,
        patient_id: invoice.patient_id,
        patient_nom: invoice.patient_nom,
        montant: amount,
        mode: payMode as any,
        reference_transaction: refTrx,
        encaisse_par_nom: userName,
        notes: payNotes,
        date: dateStr,
        heure: timeStr
      };

      // Update invoice paid amounts
      invoice.montant_paye += amount;
      invoice.reste_a_payer = Math.max(0, invoice.total_ttc - invoice.montant_paye);
      if (invoice.reste_a_payer <= 0) {
        invoice.statut = 'payee';
      } else {
        invoice.statut = 'partiellement_payee';
      }

      setStored(STORAGE_KEYS.INVOICES, invoices);
      setStored(STORAGE_KEYS.PAYMENTS, [newPayment, ...payments]);
      if (isBackendActive()) void syncEntityUpdate('invoices', invoice);
      const curUser = apiService.auth.getCurrentUser();
      apiService.audit.log(curUser.id, curUser.nom, curUser.role, 'ENCAISSEMENT', 'Facturation', `Reçu ${newPayment.recu_numero} émis pour facture ${invoice.numero} - Montant: ${amount}`);
      return newPayment;
    }
  },

  // Users & Staff
  users: {
    getAll: (): User[] => getStored<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS),
    getCurrentUser: (): User => apiService.auth.getCurrentUser(),
    setCurrentUser: (user: User) => {
      setStored(STORAGE_KEYS.CURRENT_USER, user);
    },
    create: (data: Omit<User, 'id' | 'date_creation'>): User => {
      const users = getStored<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
      const newUser: User = {
        ...data,
        id: `usr-${Date.now()}`,
        statut: 'actif',
        date_creation: new Date().toISOString().split('T')[0]
      };
      setStored(STORAGE_KEYS.USERS, [...users, newUser]);
      return newUser;
    },
    toggleStatus: (id: string): User | null => {
      const users = getStored<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
      const idx = users.findIndex(u => u.id === id);
      if (idx === -1) return null;
      users[idx].statut = users[idx].statut === 'actif' ? 'inactif' : 'actif';
      setStored(STORAGE_KEYS.USERS, users);
      return users[idx];
    }
  },

  // Audit Logs
  audit: {
    getAll: (): AuditLog[] => getStored<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS),
    log: (userId: string, userNom: string, userRole: UserRole, action: string, module: string, description: string) => {
      const logs = getStored<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
      const now = new Date();
      const newLog: AuditLog = {
        id: `log-${Date.now()}`,
        user_id: userId,
        user_nom: userNom,
        user_role: userRole,
        action,
        module,
        description,
        date: now.toISOString().split('T')[0],
        heure: now.toTimeString().substring(0, 8),
        adresse_ip: '192.168.1.45',
        statut: 'succes'
      };
      setStored(STORAGE_KEYS.AUDIT_LOGS, [newLog, ...logs.slice(0, 99)]);
    }
  },

  // Settings
  settings: {
    get: (): ClinicSettings => getStored<ClinicSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS),
    update: (updates: Partial<ClinicSettings>): ClinicSettings => {
      const current = getStored<ClinicSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
      const updated = { ...current, ...updates };
      setStored(STORAGE_KEYS.SETTINGS, updated);
      return updated;
    }
  },

  // Direct Django REST Framework backend instance
  django: djangoApi
};

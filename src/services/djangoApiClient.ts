import {
  User,
  Patient,
  Doctor,
  MedicalService,
  Specialty,
  MedicalHistory,
  Appointment,
  Consultation,
  Prescription,
  PrescriptionItem,
  Medication,
  MedicationBatch,
  StockMovement,
  LabTest,
  LabRequest,
  LabResultItem,
  BillingItem,
  Invoice,
  InvoiceItem,
  Payment,
  SystemNotification,
  AuditLog,
  UserRole,
  DjangoApiConfig
} from '../types';

const CONFIG_STORAGE_KEY = 'medicare_django_config_v1';
const TOKEN_KEY = 'medicare_jwt_access_token';
const REFRESH_TOKEN_KEY = 'medicare_jwt_refresh_token';

export const getApiConfig = (): DjangoApiConfig => {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load api config', e);
  }
  return {
    baseUrl: (typeof window !== 'undefined' && (window as any).__MEDICARE_API_URL__) || ((import.meta as any)?.env?.VITE_API_BASE_URL as string) || 'http://localhost:8000/api',
    useLiveBackend: false,
    accessToken: localStorage.getItem(TOKEN_KEY) || '',
    refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY) || ''
  };
};

export const saveApiConfig = (config: Partial<DjangoApiConfig>): DjangoApiConfig => {
  const current = getApiConfig();
  const updated = { ...current, ...config };
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(updated));
    if (updated.accessToken) localStorage.setItem(TOKEN_KEY, updated.accessToken);
    if (updated.refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, updated.refreshToken);
  } catch (e) {
    console.error('Failed to save api config', e);
  }
  return updated;
};

const BACKEND_ACTIVE_KEY = 'medicare_backend_active_v1';

export const setBackendActive = (active: boolean): void => {
  try {
    localStorage.setItem(BACKEND_ACTIVE_KEY, active ? 'true' : 'false');
  } catch (e) {
    // ignore
  }
};

// Renvoie true si la session courante exploite le backend comme source de données.
export const isBackendActive = (): boolean => {
  try {
    return localStorage.getItem(BACKEND_ACTIVE_KEY) === 'true'
      && !!getApiConfig().baseUrl
      && !!(localStorage.getItem(TOKEN_KEY) || getApiConfig().accessToken);
  } catch {
    return false;
  }
};

// Normalise un utilisateur renvoyé par le backend vers le type local de l'application.
const normalizeUser = (raw: any): User | null => {
  if (!raw) return null;
  const role = String(raw.role || raw.user_role || raw.role_name || '').toLowerCase();
  const validRoles: UserRole[] = ['admin', 'doctor', 'receptionist', 'lab_tech', 'pharmacist', 'cashier', 'medecin', 'infirmier', 'receptionniste', 'pharmacien', 'laborantin', 'caissier'];
  const roleNorm = validRoles.includes(role as UserRole)
    ? (role as UserRole)
    : (role.includes('pharm') ? 'pharmacist'
      : role.includes('lab') ? 'lab_tech'
      : role.includes('rec') ? 'receptionist'
      : role.includes('doc') || role.includes('med') ? 'doctor'
      : role.includes('admin') ? 'admin'
      : role.includes('cash') || role.includes('cais') ? 'cashier'
      : 'doctor');
  return {
    id: String(raw.id ?? raw.pk ?? raw.user_id ?? ''),
    nom: String(raw.nom || raw.first_name || raw.last_name || raw.name || '').toUpperCase(),
    prenom: String(raw.prenom || raw.last_name || raw.first_name || '').toUpperCase(),
    email: raw.email || '',
    role: roleNorm,
    telephone: raw.telephone || raw.phone || undefined,
    date_creation: raw.date_creation || new Date().toISOString().split('T')[0],
    derniere_connexion: raw.derniere_connexion || raw.last_login || undefined,
    specialite: raw.specialite || raw.specialty || undefined,
    service_id: raw.service_id || undefined,
    matricule: raw.matricule || raw.registration_number || undefined,
    actif: typeof raw.actif === 'boolean' ? raw.actif
      : typeof raw.is_active === 'boolean' ? raw.is_active
      : raw.status ? raw.status.toUpperCase() !== 'INACTIVE' && raw.status.toUpperCase() !== 'SUSPENDED'
      : true
  };
};

// Generic REST client for Django REST Framework (drf-spectacular / DefaultRouter)
class DjangoApiClient {
  private get baseUrl(): string {
    const config = getApiConfig();
    let url = config.baseUrl.trim();
    if (!url.endsWith('/')) {
      url += '/';
    }
    return url;
  }

  private get authHeaders(): Record<string, string> {
    const token = localStorage.getItem(TOKEN_KEY) || getApiConfig().accessToken;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const url = `${this.baseUrl}${cleanEndpoint}`;

    const headers = {
      ...this.authHeaders,
      ...(options.headers as Record<string, string> || {})
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (response.status === 401) {
        // Attempt automatic refresh
        const refreshed = await this.refreshToken();
        if (refreshed) {
          headers['Authorization'] = `Bearer ${localStorage.getItem(TOKEN_KEY)}`;
          const retryResponse = await fetch(url, {
            ...options,
            headers
          });
          if (!retryResponse.ok) {
            throw new Error(`API error ${retryResponse.status}: ${retryResponse.statusText}`);
          }
          return retryResponse.status === 204 ? (null as unknown as T) : await retryResponse.json();
        }
      }

      if (!response.ok) {
        const errorBody = await response.text();
        let detail = errorBody || response.statusText;
        try {
          const parsed = JSON.parse(errorBody);
          if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed.non_field_errors)) {
              detail = parsed.non_field_errors.join(', ');
            } else if (typeof parsed.detail === 'string') {
              detail = parsed.detail;
            } else {
              const parts: string[] = [];
              Object.entries(parsed).forEach(([k, v]) => {
                const val = Array.isArray(v) ? v.join(', ') : String(v);
                parts.push(`${k}: ${val}`);
              });
              detail = parts.join(' ; ') || detail;
            }
          }
        } catch {
          // corps non JSON, on garde le texte brut
        }
        throw new Error(`Erreur ${response.status}: ${detail}`);
      }

      if (response.status === 204) {
        return null as unknown as T;
      }

      return await response.json();
    } catch (err: any) {
      throw err;
    }
  }

  private async refreshToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${this.baseUrl}auth/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.access) {
          localStorage.setItem(TOKEN_KEY, data.access);
          return true;
        }
      }
    } catch (e) {
      console.warn('Refresh token expired or failed', e);
    }
    return false;
  }

  // Health / Connection Test
  async testConnection(): Promise<{ ok: boolean; message: string; data?: any }> {
    try {
      const endpointsToTry = ['schema/', 'services/', 'patients/', 'docs/'];
      for (const ep of endpointsToTry) {
        try {
          const res = await fetch(`${this.baseUrl}${ep}`, {
            headers: { 'Accept': 'application/json' }
          });
          if (res.ok || res.status === 401 || res.status === 403) {
            return {
              ok: true,
              message: `Connecté avec succès au backend Django REST (${this.baseUrl}) - Statut: ${res.status} OK`
            };
          }
        } catch {
          // try next
        }
      }
      return {
        ok: false,
        message: `Impossible de contacter le serveur Django sur ${this.baseUrl}. Vérifiez que 'python manage.py runserver' est actif et que CORS est configuré (django-cors-headers).`
      };
    } catch (err: any) {
      return {
        ok: false,
        message: err.message || 'Erreur de connexion réseau'
      };
    }
  }

  // Generic DRF Resource Factory for DefaultRouter endpoints
  private createResource<T>(path: string) {
    const cleanPath = path.replace(/^\/|\/$/g, '');
    return {
      list: (params?: Record<string, any>) => {
        let query = '';
        if (params) {
          const search = new URLSearchParams();
          Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null) search.append(k, String(v));
          });
          query = `?${search.toString()}`;
        }
        return this.request<T[] | { count: number; results: T[] }>(`${cleanPath}/${query}`);
      },
      retrieve: (id: string | number) => this.request<T>(`${cleanPath}/${id}/`),
      create: (data: Partial<T>) => this.request<T>(`${cleanPath}/`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
      update: (id: string | number, data: Partial<T>) => this.request<T>(`${cleanPath}/${id}/`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
      partialUpdate: (id: string | number, data: Partial<T>) => this.request<T>(`${cleanPath}/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),
      destroy: (id: string | number) => this.request<void>(`${cleanPath}/${id}/`, {
        method: 'DELETE'
      })
    };
  }

  // 1. Authentification & utilisateurs (api/auth/)
  auth = {
    login: async (credentials: { email?: string; username?: string; password: string }) => {
      const data = await this.request<{ access: string; refresh: string; user?: any }>(`auth/login/`, {
        method: 'POST',
        body: JSON.stringify(credentials)
      });
      if (data.access) {
        localStorage.setItem(TOKEN_KEY, data.access);
        if (data.refresh) localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh);
      }
      let user = normalizeUser(data.user);
      if (!user && data.access) {
        try {
          user = normalizeUser(await this.request<any>(`auth/profile/`));
        } catch {
          // profil indisponible, on garde un objet minimal
        }
      }
      return { ...data, user };
    },
    register: async (payload: {
      email: string;
      password: string;
      nom?: string;
      prenom?: string;
      role?: string;
      telephone?: string;
      specialite?: string;
      [key: string]: any;
    }) => {
      const data = await this.request<any>(`auth/register/`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const user = normalizeUser(data.user || data);
      return { ...data, user };
    },
    refresh: async (refresh: string) => {
      const data = await this.request<{ access: string }>(`auth/refresh/`, {
        method: 'POST',
        body: JSON.stringify({ refresh })
      });
      if (data.access) localStorage.setItem(TOKEN_KEY, data.access);
      return data;
    },
    logout: async () => {
      const refresh = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (refresh) {
        try {
          await this.request(`auth/logout/`, {
            method: 'POST',
            body: JSON.stringify({ refresh })
          });
        } catch {
          // ignore
        }
      }
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    },
    passwordReset: (email: string) => this.request(`auth/password-reset/`, {
      method: 'POST',
      body: JSON.stringify({ email })
    }),
    passwordResetConfirm: (payload: { uid: string; token: string; new_password: string }) => this.request(`auth/password-reset-confirm/`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
    getProfile: () => this.request<User>(`auth/profile/`),
    // Le backend ne propose pas de PATCH /auth/profile/ (lecture seule). Une mise
    // à jour locale de la session courante est conservée comme repli cohérent.
    updateProfile: (data: Partial<User>): User | null => {
      try {
        const raw = localStorage.getItem('medicare_current_user_v1');
        const current = raw ? JSON.parse(raw) : null;
        if (!current) return null;
        const merged = { ...current, ...data };
        localStorage.setItem('medicare_current_user_v1', JSON.stringify(merged));
        return merged as User;
      } catch {
        return null;
      }
    },
    toggleActive: (userId: string | number, action: 'deactivate' | 'reactivate') => this.request<{ detail: string; user: User }>(`auth/profile/toggle-active/`, {
      method: 'POST',
      body: JSON.stringify({ user_id: Number(userId), action })
    }),
    updateUserStatus: (userId: string | number, status: 'ACTIVE' | 'INACTIVE') =>
      this.request<User>(`auth/${userId}/status/`, {
        method: 'POST',
        body: JSON.stringify({ status })
      }),
    // Liste des comptes enregistrés côté backend (comptes distants sur le serveur Django).
    list: async (): Promise<User[]> => {
      const data: any = await this.request<any>(`auth/users/`);
      const list = Array.isArray(data) ? data : (data?.results || []);
      return list
        .map((u: any) => normalizeUser(u))
        .filter((u: User | null): u is User => !!u);
    }
  };

  // 2. Services médicaux (api/services/)
  services = this.createResource<MedicalService>('services');

  // 3. Spécialités (api/specialties/)
  specialties = this.createResource<Specialty>('specialties');

  // 4. Médecins (api/doctors/)
  doctors = this.createResource<Doctor>('doctors');

  // 5. Patients (api/patients/)
  patients = this.createResource<Patient>('patients');

  // 6. Historique médical (api/medical-history/)
  medicalHistory = this.createResource<MedicalHistory>('medical-history');

  // 7. Rendez-vous (api/appointments/)
  appointments = this.createResource<Appointment>('appointments');

  // 8. Consultations (api/consultations/)
  consultations = this.createResource<Consultation>('consultations');

  // 9. Prescriptions & Prescription Items (api/prescriptions/, api/prescription-items/)
  prescriptions = this.createResource<Prescription>('prescriptions');
  prescriptionItems = this.createResource<PrescriptionItem>('prescription-items');

  // 10. Pharmacie (api/medications/, api/medication-batches/, api/stock-movements/)
  medications = this.createResource<Medication>('medications');
  medicationBatches = this.createResource<MedicationBatch>('medication-batches');
  stockMovements = this.createResource<StockMovement>('stock-movements');

  // 11. Laboratoire (api/lab/tests/, api/lab/requests/, api/lab/results/)
  lab = {
    tests: this.createResource<LabTest>('lab/tests'),
    requests: this.createResource<LabRequest>('lab/requests'),
    results: this.createResource<LabResultItem>('lab/results')
  };

  // 12. Facturation (api/billing-items/, api/invoices/, api/invoice-items/, api/payments/)
  billing = {
    items: this.createResource<BillingItem>('billing-items'),
    invoices: this.createResource<Invoice>('invoices'),
    invoiceItems: this.createResource<InvoiceItem>('invoice-items'),
    payments: this.createResource<Payment>('payments')
  };

  // 13. Notifications (api/notifications/)
  notifications = this.createResource<SystemNotification>('notifications');

  // 14. Audit (api/audit/)
  audit = this.createResource<AuditLog>('audit');

  // 15. OpenAPI & Docs
  getSchemaUrl() {
    return `${this.baseUrl}schema/`;
  }

  getDocsUrl() {
    return `${this.baseUrl}docs/`;
  }
}

export const djangoApi = new DjangoApiClient();

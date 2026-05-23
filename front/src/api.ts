/**
 * MedEase API Client
 * Facilitates typed connection to FastAPI backend endpoints.
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// ==========================================
// Authentication Token Helpers
// ==========================================
export const getAuthToken = (): string | null => localStorage.getItem('medease_token');
export const setAuthToken = (token: string) => localStorage.setItem('medease_token', token);
export const removeAuthToken = () => localStorage.removeItem('medease_token');

// ==========================================
// Type Definitions matching FastAPI schemas
// ==========================================
export type MedicationType = 'prescription' | 'supplement' | 'over_the_counter' | 'other';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night' | 'as_needed';

export interface MedicationBase {
  name: string;
  purpose: string;
  type: MedicationType;
  dosage: string;
  frequency: string;
  optimal_time?: TimeOfDay[];
  reminder_times?: string[];
  with_food?: boolean;
  interactions_to_avoid?: string[];
  special_instructions?: string;
  side_effects?: string[];
  when_to_avoid?: string;
  simplified_explanation?: string;
  rxcui?: string[];
}

export interface MedicationResponse extends MedicationBase {
  id: string;
  created_at: string;
}

export interface ScheduledTimeSlot {
  time: string; // HH:MM
  label: string;
  medications: string[];
  instructions?: string;
  warnings?: string[];
}

export interface GeneratedMasterSchedule {
  schedule_slots: ScheduledTimeSlot[];
  notes?: string;
}

export interface ChatResponse {
  reply: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

// ==========================================
// API Helper Wrapper
// ==========================================
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Auto-set Content-Type if body is present and not FormData
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    removeAuthToken();
    localStorage.removeItem('medease_username');
    localStorage.removeItem('medease_email');
    window.dispatchEvent(new CustomEvent('medease-unauthorized'));
    throw new Error('Session expired. Please log in again.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `API request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// ==========================================
// Exported API Services
// ==========================================
export const medeaseApi = {
  // Auth Operations
  auth: {
    register: async (username: string, email: string, password: string): Promise<{ username: string; email: string }> => {
      return apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
      });
    },

    login: async (username: string, password: string): Promise<Token> => {
      // OAuth2PasswordRequestForm expects form-url-encoded body
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Login failed');
      }

      const tokenData = (await response.json()) as Token;
      setAuthToken(tokenData.access_token);
      return tokenData;
    },

    logout: () => {
      removeAuthToken();
    }
  },

  // Medication Operations
  medications: {
    // Scan a bottle label photo and/or verify name to auto-register via Gemini AI + openFDA
    scan: async (imageFile: File | null, drugName?: string): Promise<MedicationResponse> => {
      const formData = new FormData();
      if (imageFile) {
        formData.append('image', imageFile);
      }
      if (drugName) {
        formData.append('drug_name', drugName);
      }

      return apiRequest<MedicationResponse>('/medications/scan', {
        method: 'POST',
        body: formData,
      });
    },

    // Save a medication permanently to MongoDB
    create: async (medication: MedicationBase): Promise<MedicationResponse> => {
      return apiRequest<MedicationResponse>('/medications/', {
        method: 'POST',
        body: JSON.stringify(medication),
      });
    },

    // List all user medications from MongoDB
    list: async (): Promise<MedicationResponse[]> => {
      return apiRequest<MedicationResponse[]>('/medications/');
    },

    // Delete a medication from MongoDB
    delete: async (medicationId: string): Promise<{ status: string; message: string }> => {
      return apiRequest<{ status: string; message: string }>(`/medications/${medicationId}`, {
        method: 'DELETE',
      });
    },

    // Ask AI to generate structured daily timeslots spacing medications to avoid interactions
    generateSchedule: async (medicationIds: string[]): Promise<GeneratedMasterSchedule> => {
      return apiRequest<GeneratedMasterSchedule>('/medications/schedule/generate', {
        method: 'POST',
        body: JSON.stringify({ medication_ids: medicationIds }),
      });
    }
  },

  // AI Assistant Chat Operation
  chat: {
    send: async (message: string): Promise<ChatResponse> => {
      return apiRequest<ChatResponse>('/chat/', {
        method: 'POST',
        body: JSON.stringify({ message }),
      });
    }
  }
};

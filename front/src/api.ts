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
  optimal_time?: string[];
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

export interface ScheduleTimeSlot {
  time: string; // HH:MM
  medication_names: string[];
  instructions: string;
  interaction_warnings?: string;
}

export interface GeneratedMasterSchedule {
  slots: ScheduleTimeSlot[];
  general_advice: string;
}

export interface DailyActionPlanEntry {
  medication_id: string;
  medication_name: string;
  dosage: string;
  scheduled_time: string; // ISO datetime string
  status: 'pending' | 'taken' | 'missed' | 'skipped';
  taken_at?: string | null; // ISO datetime string
}

export interface ChatResponse {
  reply: string;
}

export interface MedicationAdvisingInfo {
  id: string;
  name: string;
  purpose: string;
  dosage: string;
  frequency: string;
  similarity: number;
}

export interface ChatAdvisingResponse {
  reply: string;
  retrieved_medications: MedicationAdvisingInfo[];
  action?: string;
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
    },
    getProfile: async (): Promise<{ username: string; email: string; webhook_url?: string }> => {
      return apiRequest<{ username: string; email: string; webhook_url?: string }>('/auth/me', {
        method: 'GET',
      });
    },
    updateProfile: async (webhookUrl: string): Promise<{ username: string; email: string; webhook_url?: string }> => {
      return apiRequest<{ username: string; email: string; webhook_url?: string }>('/auth/me', {
        method: 'PUT',
        body: JSON.stringify({ webhook_url: webhookUrl }),
      });
    }
  },

  // Medication Operations
  medications: {
    // Scan a bottle label photo and/or verify name to auto-register via Gemini AI + openFDA
    scan: async (imageFile: File | null, drugName?: string, audioFile?: File | null): Promise<MedicationResponse> => {
      const formData = new FormData();
      if (imageFile) {
        formData.append('image', imageFile);
      }
      if (drugName) {
        formData.append('drug_name', drugName);
      }
      if (audioFile) {
        formData.append('audio', audioFile);
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
    generateSchedule: async (
      medicationIds: string[],
      wakeTime: string,
      sleepTime: string,
      breakfastTime: string,
      lunchTime: string,
      dinnerTime: string,
      routineNotes?: string
    ): Promise<GeneratedMasterSchedule> => {
      return apiRequest<GeneratedMasterSchedule>('/medications/schedule/generate', {
        method: 'POST',
        body: JSON.stringify({
          medication_ids: medicationIds,
          wake_time: wakeTime,
          sleep_time: sleepTime,
          breakfast_time: breakfastTime,
          lunch_time: lunchTime,
          dinner_time: dinnerTime,
          routine_notes: routineNotes
        }),
      });
    },

    // Persist a daily schedule in MongoDB
    persistSchedule: async (slots: ScheduleTimeSlot[], generalAdvice: string): Promise<GeneratedMasterSchedule & { updated_at: string }> => {
      return apiRequest<GeneratedMasterSchedule & { updated_at: string }>('/medications/schedule', {
        method: 'POST',
        body: JSON.stringify({ slots, general_advice: generalAdvice }),
      });
    },

    // Get the persisted schedule from MongoDB
    getPersistedSchedule: async (): Promise<GeneratedMasterSchedule & { updated_at: string }> => {
      return apiRequest<GeneratedMasterSchedule & { updated_at: string }>('/medications/schedule');
    },

    // Update optimal_time for a specific medication
    updateTimes: async (medicationId: string, times: string[]): Promise<MedicationResponse> => {
      return apiRequest<MedicationResponse>(`/medications/${medicationId}/times`, {
        method: 'PUT',
        body: JSON.stringify(times),
      });
    },

    // Log/upsert a DailyActionPlanEntry in history
    logHistoryEntry: async (entry: DailyActionPlanEntry): Promise<DailyActionPlanEntry> => {
      return apiRequest<DailyActionPlanEntry>('/medications/history', {
        method: 'POST',
        body: JSON.stringify(entry),
      });
    },

    // Retrieve all DailyActionPlanEntry records for history calendar
    getHistory: async (): Promise<DailyActionPlanEntry[]> => {
      return apiRequest<DailyActionPlanEntry[]>('/medications/history');
    },
    triggerDemoReminder: async (): Promise<{ status: string; message: string }> => {
      return apiRequest<{ status: string; message: string }>('/medications/schedule/demo-reminder', {
        method: 'POST',
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
    },
    advising: async (message: string, imageFile?: File | null, audioFile?: File | null, history?: string): Promise<ChatAdvisingResponse> => {
      const formData = new FormData();
      formData.append('message', message);
      if (imageFile) {
        formData.append('image', imageFile);
      }
      if (audioFile) {
        formData.append('audio', audioFile);
      }
      if (history) {
        formData.append('history', history);
      }
      return apiRequest<ChatAdvisingResponse>('/chat/chat_advising', {
        method: 'POST',
        body: formData,
      });
    },
    /** Returns a raw fetch Response for SSE streaming */
    advisingStream: async (message: string, imageFile?: File | null, audioFile?: File | null, history?: string): Promise<Response> => {
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const formData = new FormData();
      formData.append('message', message);
      if (imageFile) formData.append('image', imageFile);
      if (audioFile) formData.append('audio', audioFile);
      if (history) formData.append('history', history);

      const response = await fetch(`${API_BASE_URL}/chat/chat_advising_stream`, {
        method: 'POST',
        headers,
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`Stream request failed with status ${response.status}`);
      }
      return response;
    }
  }
};

/* ═══════════════════════════════════════════════════
   TypeScript Types — Mirrors backend Zod schemas
   ═══════════════════════════════════════════════════ */

// ── Auth ──────────────────────────────────────────
export type Role = 'OWNER' | 'VET' | 'TUTOR'

export interface User {
  id: string
  email: string
  name: string
  role: Role
  avatarUrl?: string | null
  crmv?: string | null
  clinicId?: string
  createdAt: string
  updatedAt: string
}

export interface Clinic {
  id: string
  name: string
  cnpj?: string | null
  address?: string | null
  phone?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface UpdateClinicRequest {
  name?: string
  cnpj?: string | null
  address?: string | null
  phone?: string | null
}

export interface UpdateUserProfileRequest {
  name?: string
  crmv?: string | null
}

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
  clinicName: string
  clinicCnpj?: string
  clinicAddress?: string
  clinicPhone?: string
  crmv?: string
}

// ── Tutor ─────────────────────────────────────────
export interface Tutor {
  id: string
  userId?: string | null
  fullName: string
  cpf: string
  phone: string
  email?: string | null
  address?: string | null
  insurance?: string | null
  createdAt: string
  updatedAt: string
  patients?: Patient[]
}

export interface CreateTutorRequest {
  fullName: string
  cpf: string
  phone: string
  email?: string
  address?: string
  insurance?: string
}

export interface UpdateTutorRequest {
  fullName?: string
  phone?: string
  email?: string
  address?: string
  insurance?: string
}

// ── Patient ───────────────────────────────────────
export interface Patient {
  id: string
  name: string
  photoUrl?: string | null
  birthDate?: string | null
  sex?: string | null
  weightKg?: number | null
  observations?: string | null
  microchip?: string | null
  allergies?: string | null
  species: string
  breed?: string | null
  tutorId: string
  createdAt: string
  updatedAt: string
  tutor?: Tutor
}

export interface CreatePatientRequest {
  name: string
  tutorId: string
  species: string
  breed?: string
  birthDate?: string
  sex?: string
  weightKg?: number
  observations?: string
  microchip?: string
  allergies?: string
  photoUrl?: string
}

export interface UpdatePatientRequest {
  name?: string
  species?: string
  breed?: string
  birthDate?: string
  sex?: string
  weightKg?: number
  observations?: string
  microchip?: string
  allergies?: string
  photoUrl?: string
}

/* Combined request for registering patient + tutor in one form */
export interface RegisterPatientFormData {
  // Patient
  petName: string
  birthDate: string
  species: string
  breed: string
  sex: string
  weightKg: string
  hasMicrochip: string
  observations: string
  // Tutor
  tutorFullName: string
  tutorCpf: string
  tutorPhone: string
  tutorEmail: string
  tutorInsurance: string
  // Address
  cep: string
  state: string
  city: string
  neighborhood: string
  street: string
  addressNumber: string
  complement: string
}

// ── Appointments ──────────────────────────────────
export type AppointmentCategory = 'VACCINATION' | 'OBSERVATION' | 'EXAM' | 'SURGICAL'
export type AppointmentStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export interface Appointment {
  id: string
  patientId: string
  vetId: string
  dateTime: string
  endDateTime?: string | null
  category: AppointmentCategory
  status: AppointmentStatus
  observation?: string | null
  cancelReason?: string | null
  createdAt: string
  updatedAt: string
  patient?: Pick<Patient, 'id' | 'name' | 'species' | 'photoUrl'>
  vet?: Pick<User, 'id' | 'name'>
}

export interface CreateAppointmentRequest {
  patientId: string
  vetId: string
  dateTime: string
  endDateTime?: string
  category: AppointmentCategory
  observation?: string
}

// ── Clinical Records ──────────────────────────────
export interface ClinicalRecord {
  id: string
  patientId: string
  vetId: string
  appointmentId?: string | null
  weightKg?: number | null
  clinicalNotes?: string | null
  diagnosis?: string | null
  pendingDiagnosis?: string | null
  prescriptions?: string | null
  breathingNotes?: string | null
  routineGuidance?: string | null
  aiSummary?: string | null
  finalized: boolean
  createdAt: string
  updatedAt: string
  vet?: Pick<User, 'id' | 'name'>
}

export interface ClinicalHistoryItem extends ClinicalRecord {
  appointment?: {
    id: string
    category: AppointmentCategory
    dateTime: string
    vet?: Pick<User, 'id' | 'name'>
  } | null
}

export interface ClinicHistoryListItem {
  id: string
  patientId: string
  patientName: string
  tutorName: string
  date: string
  species: string
  vetName: string
  record: ClinicalHistoryItem
  patient: Patient
}

export interface UpdateClinicalRecordRequest {
  weightKg?: number
  clinicalNotes?: string
  diagnosis?: string
  pendingDiagnosis?: string
  prescriptions?: string
  breathingNotes?: string
  routineGuidance?: string
}

// ── Vaccinations ──────────────────────────────────
export type VaccinationStatus = 'UP_TO_DATE' | 'PENDING' | 'OVERDUE'

export interface Vaccination {
  id: string
  patientId: string
  vaccineName: string
  appliedAt?: string | null
  nextDoseAt?: string | null
  status: VaccinationStatus
  createdAt: string
  patient?: Pick<Patient, 'id' | 'name'>
}

export interface CreateVaccinationRequest {
  patientId: string
  vaccineName: string
  appliedAt?: string
  nextDoseAt?: string
  status: VaccinationStatus
}

// ── Exam Files ────────────────────────────────────
export interface ExamFile {
  id: string
  patientId: string
  clinicalRecordId?: string | null
  fileName: string
  fileUrl: string
  fileType: 'pdf' | 'image'
  uploadedAt: string
}

// ── Dashboard ─────────────────────────────────────
export interface DailyOverview {
  totalAppointments: number
  scheduled: number
  inProgress: number
  completed: number
  cancelled: number
}

export interface AdminMetrics {
  totalPatients: number
  appointmentsThisWeek: number
  appointmentsThisMonth: number
  timeline: {
    past: number
    future: number
  }
  week: {
    total: number
    scheduled: number
    inProgress: number
    completed: number
    cancelled: number
  }
  month: {
    total: number
    scheduled: number
    inProgress: number
    completed: number
    cancelled: number
  }
  categories: {
    week: {
      observation: number
      vaccination: number
      exam: number
      surgical: number
    }
    month: {
      observation: number
      vaccination: number
      exam: number
      surgical: number
    }
  }
}

export interface AdminAppointmentsTrendPoint {
  date: string
  totalAppointments: number
}

export interface AdminAppointmentsTrendResponse {
  days: number
  trend: AdminAppointmentsTrendPoint[]
}

// ── Portal ────────────────────────────────────────
export interface TutorDashboard {
  tutor: Pick<Tutor, 'id' | 'fullName' | 'email'>
  pets: Array<Pick<Patient, 'id' | 'name' | 'species' | 'breed'>>
  recentAppointments: Appointment[]
  upcomingVaccinations: Vaccination[]
}

export interface TutorAlert {
  type: 'overdue_vaccine' | 'upcoming_vaccine' | 'vet_recommendation'
  message: string
  patientName: string
  date?: string
}

export interface TutorPortalClinicalRecord {
  id: string
  createdAt: string
  diagnosis?: string | null
  pendingDiagnosis?: string | null
  prescriptions?: string | null
  routineGuidance?: string | null
  aiSummary?: string | null
  weightKg?: number | null
  finalized: boolean
  vet?: {
    name: string
  }
  /**
   * Agendamento que originou o prontuario. Define o tipo de atendimento
   * exibido no historico do tutor. Nulo quando o prontuario foi aberto
   * fora da agenda (Appointment.category vive em ClinicalRecord.appointment).
   */
  appointment?: {
    category: AppointmentCategory
    dateTime: string
  } | null
}

export interface TutorPortalPatientHistory {
  patient: Patient
  clinicalRecords: TutorPortalClinicalRecord[]
  vaccinations: Vaccination[]
  examFiles: ExamFile[]
}

export interface CreateTutorAccountResponse {
  userId: string
  email: string
  temporaryPassword: string
}

// ── Paginated ─────────────────────────────────────
export interface PaginatedResponse<T> {
  items?: T[]
  tutors?: T[]
  patients?: T[]
  total: number
  page: number
  perPage: number
}

// ── API Error ─────────────────────────────────────
export interface ApiError {
  statusCode: number
  error?: string
  message?: string
  issues?: Record<string, string[]>
}

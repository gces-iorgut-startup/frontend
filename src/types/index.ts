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
  code?: string
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
  // Os tokens de sessão vão em cookies HttpOnly; o body traz só o token CSRF.
  csrfToken: string
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

export interface RegisterVetRequest {
  name: string
  email: string
  password: string
  crmv: string
  clinicCode: string
}

// ── Tutor ─────────────────────────────────────────
export interface TutorAlternateContact {
  name: string
  phone: string
  relationship: string
  hasWhatsApp: boolean
}

export interface Tutor {
  id: string
  userId?: string | null
  fullName: string
  cpf: string
  phone: string
  email?: string | null
  address?: string | null
  insurance?: string | null
  alternateContacts?: TutorAlternateContact[] | null
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
  alternateContacts?: TutorAlternateContact[]
}

export interface UpdateTutorRequest {
  fullName?: string
  phone?: string
  email?: string
  address?: string
  insurance?: string
  alternateContacts?: TutorAlternateContact[]
}

// ── Patient ───────────────────────────────────────
export type PatientSpecies = 'CANINE' | 'FELINE' | 'BIRD' | 'RODENT' | 'REPTILE'
export type PatientSex = 'MALE' | 'FEMALE' | 'UNDETERMINED'
export type ReproductiveCondition = 'FERTILE' | 'NEUTERED'

export interface Patient {
  id: string
  name: string
  photoUrl?: string | null
  birthDate?: string | null
  sex?: PatientSex | string | null
  weightKg?: number | null
  observations?: string | null
  microchip?: string | null
  allergies?: string | null
  species: PatientSpecies | string
  breed?: string | null
  reproductiveCondition?: ReproductiveCondition | null
  coatDescription?: string | null
  tutorId: string
  createdAt: string
  updatedAt: string
  tutor?: Tutor
}

export interface CreatePatientRequest {
  name: string
  tutorId: string
  species: PatientSpecies
  breed?: string
  birthDate?: string
  sex: PatientSex
  reproductiveCondition?: ReproductiveCondition
  coatDescription?: string
  weightKg?: number
  observations?: string
  microchip?: string
  allergies?: string
  photoUrl?: string
}

export interface UpdatePatientRequest {
  name?: string
  species?: PatientSpecies
  breed?: string
  birthDate?: string
  sex?: PatientSex
  reproductiveCondition?: ReproductiveCondition | null
  coatDescription?: string | null
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
  species: PatientSpecies | ''
  breed: string
  sex: PatientSex | ''
  reproductiveCondition: ReproductiveCondition | ''
  coatDescription: string
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
export type AppointmentCategory =
  | 'GENERAL'
  | 'RETURN'
  | 'SURGICAL_EVALUATION'
  | 'VACCINATION'
  | 'OBSERVATION'
  | 'EXAM'
  | 'SURGICAL'
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

export interface UpdateAppointmentRequest {
  category?: AppointmentCategory
  observation?: string | null
  dateTime?: string
  endDateTime?: string | null
  vetId?: string
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
  /** CLI-01 — observações do atendimento, campo próprio. */
  observations?: string | null
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
  observations?: string
}

// ── Vaccinations ──────────────────────────────────
export type VaccinationStatus = 'UP_TO_DATE' | 'PENDING' | 'OVERDUE'

export interface Vaccination {
  id: string
  patientId: string
  vaccineName: string
  appliedAt?: string | null
  nextDoseAt?: string | null
  doseNumber?: number | null
  intervalDays?: number | null
  status: VaccinationStatus
  createdAt: string
  patient?: Pick<Patient, 'id' | 'name'>
}

// ── Vaccination Alerts (EVO-06) ───────────────────
export type VaccinationAlertStatus = 'OVERDUE' | 'UPCOMING'

export interface VaccinationAlertPatient {
  id: string
  name: string
  species: string
}

export interface VaccinationAlertTutor {
  id: string
  fullName: string
  phone: string
}

export interface VaccinationAlertItem {
  id: string
  vaccineName: string
  doseNumber: number | null
  nextDoseAt: string
  status: VaccinationAlertStatus
  daysDifference: number
  daysOverdue?: number
  daysUntilDue?: number
  patient: VaccinationAlertPatient
  tutor: VaccinationAlertTutor
}

export interface VaccinationAlertsResponse {
  items: VaccinationAlertItem[]
  total: number
}

export interface CreateVaccinationRequest {
  patientId: string
  vaccineName: string
  appliedAt?: string
  nextDoseAt?: string
  doseNumber?: number | null
  intervalDays?: number | null
  status: VaccinationStatus
}

// ── Exam Files ────────────────────────────────────
export const CLINICAL_EXAM_TYPES = [
  'HEMOGRAMA',
  'BIOQUIMICO',
  'RAIO_X',
  'ULTRASSOM',
  'URINA_FEZES',
  'CITOLOGIA_BIOPSIA',
  'CARDIOLOGICO',
  'OUTRO',
] as const

export type ClinicalExamType = (typeof CLINICAL_EXAM_TYPES)[number]

export const CLINICAL_EXAM_LABELS: Record<ClinicalExamType, string> = {
  HEMOGRAMA: 'Hemograma',
  BIOQUIMICO: 'Bioquímico',
  RAIO_X: 'Raio-X',
  ULTRASSOM: 'Ultrassom',
  URINA_FEZES: 'Urina / Fezes',
  CITOLOGIA_BIOPSIA: 'Citologia / Biópsia',
  CARDIOLOGICO: 'Cardiológico',
  OUTRO: 'Outro',
}

export interface ExamFile {
  id: string
  patientId: string
  clinicalRecordId?: string | null
  fileName: string
  fileUrl: string
  fileType: 'pdf' | 'image'
  clinicalType?: ClinicalExamType | string | null
  uploadedAt: string
}

// ── Chronic Conditions (CLI-02) ───────────────────
export type ChronicConditionStatus = 'ACTIVE' | 'INACTIVE' | 'RESOLVED'

export interface ChronicCondition {
  id: string
  patientId: string
  name: string
  diagnosedAt: string | null
  status: ChronicConditionStatus
  observations: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateChronicConditionRequest {
  patientId: string
  name: string
  diagnosedAt?: string
  status?: ChronicConditionStatus
  observations?: string
}

export interface UpdateChronicConditionRequest {
  name?: string
  diagnosedAt?: string | null
  status?: ChronicConditionStatus
  observations?: string | null
}

// ── Patient Photos ────────────────────────────────
export interface PatientPhoto {
  id: string
  patientId: string
  photoUrl: string
  description?: string | null
  takenAt: string
  createdAt: string
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

export interface RecentAppointmentActivity {
  id: string
  patientId: string
  patientName: string
  activityType: 'APPOINTMENT_UPDATED'
  updatedAt: string
}

export interface RecentPatientActivity {
  id: string
  name: string
  tutorName: string
  activityType: 'PATIENT_CREATED'
  createdAt: string
}

export interface RecentActivities {
  recentAppointments: RecentAppointmentActivity[]
  recentPatients: RecentPatientActivity[]
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
  patientId?: string
  vaccineName?: string
  doseNumber?: number
  date?: string
  daysDifference?: number
}

export interface RequestAppointmentInput {
  patientId: string
  category: AppointmentCategory
  dateTime: string
  observation?: string
}

export interface TutorPortalClinicalRecord {
  id: string
  createdAt: string
  diagnosis?: string | null
  pendingDiagnosis?: string | null
  prescriptions?: string | null
  routineGuidance?: string | null
  /** CLI-01 — observações do atendimento, campo próprio. */
  observations?: string | null
  aiSummary?: string | null
  weightKg?: number | null
  finalized: boolean
  vet?: {
    name: string
  }
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

// ── Hospitalizations (EVO-05) ─────────────────────
export type HospitalizationStatus = 'ADMITTED' | 'CRITICAL' | 'DISCHARGED'

/** Resumo do veterinário que o backend embute na internação e na evolução. */
export interface HospitalizationVet {
  id: string
  name: string
}

export interface HospitalizationPatientCard {
  id: string
  name: string
  species: string
  photoUrl: string | null
}

export interface Hospitalization {
  id: string
  clinicId: string
  patientId: string
  admittedByVetId: string
  bedIdentifier: string
  reason: string
  status: HospitalizationStatus
  admittedAt: string
  dischargedAt: string | null
  dischargeNotes: string | null
  createdAt: string
  updatedAt: string
  patient?: HospitalizationPatientCard
  admittedByVet?: HospitalizationVet
}

export interface HospitalizationEvolution {
  id: string
  hospitalizationId: string
  recordedByVetId: string
  temperature: number | null
  heartRate: number | null
  respiratoryRate: number | null
  mucousMembranes: string | null
  notes: string
  recordedAt: string
  recordedByVet?: HospitalizationVet
}

export interface HospitalizationDetails extends Hospitalization {
  evolutions: HospitalizationEvolution[]
}

/** Status que mantêm o leito ocupado. A alta tem rota própria no backend. */
export type OpenHospitalizationStatus = Exclude<HospitalizationStatus, 'DISCHARGED'>

export interface AdmitPatientRequest {
  patientId: string
  bedIdentifier: string
  reason: string
  /** Em branco, o backend usa ADMITTED. */
  status?: OpenHospitalizationStatus
}

export interface AddHospitalizationEvolutionRequest {
  temperature?: number
  heartRate?: number
  respiratoryRate?: number
  mucousMembranes?: string
  notes: string
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

export * from './budget'

import axios, { AxiosInstance } from 'axios';
import { ENV, TEST_DATA, TEST_PASSWORD } from '../config/test.config';

export interface TestUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: string;
  accessToken: string;
  refreshToken: string;
  clinicId?: string;
}

export interface TestTutor {
  id: string;
  fullName: string;
  cpf: string;
  userId?: string;
  email?: string;
  password?: string;
}

export interface TestPatient {
  id: string;
  name: string;
  tutorId: string;
  species: string;
}

export interface TestAppointment {
  id: string;
}

export interface TestContext {
  users: TestUser[];
  tutors: TestTutor[];
  patients: TestPatient[];
  appointments: TestAppointment[];
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

// As rotas /test do backend exigem o segredo no header x-e2e-secret
function testRouteHeaders(): Record<string, string> {
  return ENV.E2E_TEST_SECRET ? { 'x-e2e-secret': ENV.E2E_TEST_SECRET } : {};
}

function createApiClient(): AxiosInstance {
  // Sem Content-Type fixo: o axios o define como JSON quando há corpo. Com o header
  // fixo, DELETE sem corpo é recusado pelo Fastify com 400.
  return axios.create({
    baseURL: ENV.API_URL,
    timeout: ENV.TIMEOUT,
  });
}

export function createTestContext(): TestContext {
  return {
    users: [],
    tutors: [],
    patients: [],
    appointments: [],
  };
}

export async function registerOwner(
  ctx: TestContext,
  data: { name: string; email: string; password?: string; clinicName: string } = {
    name: TEST_DATA.OWNER_NAME,
    email: TEST_DATA.OWNER_EMAIL,
    clinicName: TEST_DATA.CLINIC_NAME,
  }
): Promise<TestUser> {
  const client = createApiClient();
  const password = data.password || TEST_PASSWORD;

  await client.post('/auth/register', {
    name: data.name,
    email: data.email,
    password,
    clinicName: data.clinicName,
  });

  const loginRes = await client.post('/auth/login', {
    email: data.email,
    password,
  });

  const user: TestUser = {
    id: loginRes.data.user.id,
    email: data.email,
    password,
    name: data.name,
    role: loginRes.data.user.role,
    accessToken: loginRes.data.accessToken,
    refreshToken: loginRes.data.refreshToken,
    clinicId: loginRes.data.user.clinicId,
  };

  ctx.users.push(user);
  return user;
}

export async function registerVet(
  ctx: TestContext,
  ownerUser: TestUser,
  data: { name: string; email: string; password?: string } = {
    name: TEST_DATA.VET_NAME,
    email: TEST_DATA.VET_EMAIL,
  }
): Promise<TestUser> {
  const client = createApiClient();
  const password = data.password || TEST_PASSWORD;

  await client.post(
    '/auth/register/vet',
    {
      name: data.name,
      email: data.email,
      password,
    },
    { headers: authHeaders(ownerUser.accessToken) }
  );

  const loginRes = await client.post('/auth/login', {
    email: data.email,
    password,
  });

  const user: TestUser = {
    id: loginRes.data.user.id,
    email: data.email,
    password,
    name: data.name,
    role: loginRes.data.user.role,
    accessToken: loginRes.data.accessToken,
    refreshToken: loginRes.data.refreshToken,
  };

  ctx.users.push(user);
  return user;
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ user: Record<string, unknown>; accessToken: string; refreshToken: string }> {
  const client = createApiClient();
  const res = await client.post('/auth/login', { email, password });
  return res.data;
}

/**
 * Define o CRMV do usuário (PATCH /auth/me). O OWNER só consegue iniciar um
 * prontuário se tiver CRMV cadastrado, e a tela de cadastro não tem esse campo.
 */
export async function setUserCrmv(
  email: string,
  password: string,
  crmv: string
): Promise<void> {
  const { accessToken } = await loginUser(email, password);
  const client = createApiClient();
  await client.patch('/auth/me', { crmv }, { headers: authHeaders(accessToken) });
}

export async function refreshUserToken(user: TestUser): Promise<void> {
  const client = createApiClient();
  try {
    const res = await client.post('/auth/login', {
      email: user.email,
      password: user.password,
    });
    user.accessToken = res.data.accessToken;
    user.refreshToken = res.data.refreshToken;
  } catch { /* ignore */ }
}

export async function changeUserRole(
  user: TestUser,
  role: string
): Promise<void> {
  user.role = role;
}

export async function createTutor(
  ctx: TestContext,
  user: TestUser,
  data: { fullName: string; cpf: string; phone: string; email: string } = {
    fullName: TEST_DATA.TUTOR_NAME,
    cpf: TEST_DATA.TUTOR_CPF,
    phone: TEST_DATA.TUTOR_PHONE,
    email: TEST_DATA.TUTOR_EMAIL,
  }
): Promise<TestTutor> {
  const client = createApiClient();

  const res = await client.post(
    '/tutors',
    {
      fullName: data.fullName,
      cpf: data.cpf,
      phone: data.phone,
      email: data.email,
    },
    { headers: authHeaders(user.accessToken) }
  );

  const tutorData = res.data.tutor || res.data;

  const tutor: TestTutor = {
    id: tutorData.id,
    fullName: data.fullName,
    cpf: data.cpf,
    email: data.email,
  };

  ctx.tutors.push(tutor);
  return tutor;
}

export async function createTutorAccount(
  ctx: TestContext,
  user: TestUser,
  tutorId: string,
  email: string = TEST_DATA.TUTOR_ACCOUNT_EMAIL
): Promise<{ userId: string; email: string; password: string }> {
  const client = createApiClient();
  const res = await client.post(
    `/tutors/${tutorId}/account`,
    { email },
    { headers: authHeaders(user.accessToken) }
  );

  // A API não devolve mais senha temporária: o tutor define a senha no primeiro acesso
  const password = await activateTutorAccount(res.data.email);

  if (res.data.userId) {
    const tutorUser: TestUser = {
      id: res.data.userId,
      email: res.data.email,
      password,
      name: 'Tutor',
      role: 'TUTOR',
      accessToken: '',
      refreshToken: '',
    };
    ctx.users.push(tutorUser);

    const tutor = ctx.tutors.find((t) => t.id === tutorId);
    if (tutor) {
      tutor.userId = res.data.userId;
      tutor.email = res.data.email;
      tutor.password = password;
    }
  }

  return { ...res.data, password };
}

/**
 * Define a senha de uma conta de tutor usando o fluxo de primeiro acesso.
 * Como o CI não envia e-mails, o token é gerado pela rota de teste
 * POST /test/first-access-token (disponível apenas com NODE_ENV=test).
 */
export async function activateTutorAccount(
  email: string,
  password: string = TEST_PASSWORD
): Promise<string> {
  const client = createApiClient();

  const tokenRes = await client.post(
    '/test/first-access-token',
    { email },
    { headers: testRouteHeaders() }
  );
  await client.post('/auth/set-password', {
    token: tokenRes.data.token,
    newPassword: password,
  });

  return password;
}

export async function createPatient(
  ctx: TestContext,
  user: TestUser,
  tutorId: string,
  name: string = TEST_DATA.PET_DOG_NAME,
  species: string = 'Cachorro'
): Promise<TestPatient> {
  const client = createApiClient();

  const res = await client.post(
    '/patients',
    {
      name,
      tutorId,
      species,
      breed: 'Vira-lata',
      sex: 'Masculino',
      birthDate: '2023-01-15',
      weightKg: 12.5,
    },
    { headers: authHeaders(user.accessToken) }
  );

  const data = res.data.patient || res.data;

  const patient: TestPatient = {
    id: data.id,
    name,
    tutorId,
    species,
  };

  ctx.patients.push(patient);
  return patient;
}

export async function createAppointment(
  ctx: TestContext,
  user: TestUser,
  patientId: string,
  dateTime: string,
  category: string = 'OBSERVATION'
): Promise<TestAppointment> {
  const client = createApiClient();
  const end = new Date(new Date(dateTime).getTime() + 30 * 60000).toISOString();

  const res = await client.post(
    '/appointments',
    {
      patientId,
      vetId: user.id,
      dateTime,
      endDateTime: end,
      category,
    },
    { headers: authHeaders(user.accessToken) }
  );

  const data = res.data.appointment || res.data;
  const appt: TestAppointment = { id: data.id };
  ctx.appointments.push(appt);
  return appt;
}

export async function cleanupTestClinic(owner: TestUser): Promise<void> {
  if (!owner.clinicId) return;
  const client = createApiClient();
  await client.delete(
    `/test/clinics/${owner.clinicId}`,
    { headers: { ...authHeaders(owner.accessToken), ...testRouteHeaders() } }
  );
}

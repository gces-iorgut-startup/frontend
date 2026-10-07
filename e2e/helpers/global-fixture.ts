import {
  registerOwner,
  registerVet,
  createTutor,
  createPatient,
  createTutorAccount,
  createAppointment,
  cleanupTestClinic,
  createTestContext,
  loginUser,
  TestUser,
  TestTutor,
  TestPatient,
  TestAppointment,
  TestContext,
} from './api.helper';
import { TEST_DATA, TEST_PASSWORD } from '../config/test.config';

export interface SharedData {
  ctx: TestContext;
  owner: TestUser;
  vet: TestUser;
  tutor: TestTutor;
  patientDog: TestPatient;
  patientCat: TestPatient;
  tutorCredentials: { userId: string; email: string; password: string };
  appointment: TestAppointment;
  dynamicTutorCredentials?: { email: string; password: string; petName: string; tutorName: string };
}

let sharedData: SharedData | null = null;
let setupDone = false;

export function getSharedData(): SharedData {
  if (!sharedData) {
    throw new Error('Fixture global não inicializado. Verifique se o root hook está configurado.');
  }
  return sharedData;
}

export async function setupGlobalFixture(): Promise<void> {
  if (setupDone) return;

  const ctx = createTestContext();

  const owner = await registerOwner(ctx, {
    name: TEST_DATA.GLOBAL_OWNER_NAME,
    email: TEST_DATA.GLOBAL_OWNER_EMAIL,
    clinicName: TEST_DATA.GLOBAL_CLINIC_NAME,
  });

  const vet = await registerVet(ctx, owner, {
    name: 'Dra. Camila Global',
    email: 'camila.global@iougurt.com',
  });

  const tutor = await createTutor(ctx, owner, {
    fullName: 'Ricardo Global',
    cpf: '48291047243',
    phone: '61999887755',
    email: 'ricardo.global@iougurt.com',
  });

  const patientDog = await createPatient(ctx, owner, tutor.id, 'Amora Global', 'Cachorro');
  const patientCat = await createPatient(ctx, owner, tutor.id, 'Mingau Global', 'Gato');

  const tutorCredentials = await createTutorAccount(
    ctx,
    owner,
    tutor.id,
    'ricardo.global.portal@iougurt.com'
  );

  const appointment = await createAppointment(
    ctx,
    owner,
    patientDog.id,
    new Date().toISOString()
  );

  sharedData = {
    ctx,
    owner,
    vet,
    tutor,
    patientDog,
    patientCat,
    tutorCredentials,
    appointment,
  };

  setupDone = true;
}

import { WebDriver } from 'selenium-webdriver';
import { createDriver } from './driver.factory';

let globalDriver: WebDriver | null = null;

export async function getGlobalDriver(): Promise<WebDriver> {
  if (!globalDriver) {
    globalDriver = await createDriver();
  }
  return globalDriver;
}

export async function quitGlobalDriver(): Promise<void> {
  if (globalDriver) {
    try {
      await globalDriver.quit();
    } catch { /* ignore */ }
    globalDriver = null;
  }
}

export const mochaHooks = {
  async beforeAll() {
    try {
      const loginRes = await loginUser(TEST_DATA.GLOBAL_OWNER_EMAIL, TEST_PASSWORD);
      const ownerUser = {
        id: loginRes.user.id as string,
        email: TEST_DATA.GLOBAL_OWNER_EMAIL,
        password: TEST_PASSWORD,
        name: TEST_DATA.GLOBAL_OWNER_NAME,
        role: loginRes.user.role as string,
        accessToken: loginRes.accessToken,
        refreshToken: loginRes.refreshToken,
        clinicId: loginRes.user.clinicId as string,
      };
      await cleanupTestClinic(ownerUser);
    } catch { /* ignore */ }

    try {
      const loginRes = await loginUser(TEST_DATA.OWNER_EMAIL, TEST_PASSWORD);
      const ownerUser = {
        id: loginRes.user.id as string,
        email: TEST_DATA.OWNER_EMAIL,
        password: TEST_PASSWORD,
        name: TEST_DATA.OWNER_NAME,
        role: loginRes.user.role as string,
        accessToken: loginRes.accessToken,
        refreshToken: loginRes.refreshToken,
        clinicId: loginRes.user.clinicId as string,
      };
      await cleanupTestClinic(ownerUser);
    } catch { /* ignore */ }

    await setupGlobalFixture();
  },
  async afterAll() {

    if (sharedData) {
      try {
        await cleanupTestClinic(sharedData.owner);
      } catch { /* ignore */ }
    }

    try {
      const loginRes = await loginUser(TEST_DATA.OWNER_EMAIL, TEST_PASSWORD);
      const ownerUser = {
        id: loginRes.user.id as string,
        email: TEST_DATA.OWNER_EMAIL,
        password: TEST_PASSWORD,
        name: TEST_DATA.OWNER_NAME,
        role: loginRes.user.role as string,
        accessToken: loginRes.accessToken,
        refreshToken: loginRes.refreshToken,
        clinicId: loginRes.user.clinicId as string,
      };
      await cleanupTestClinic(ownerUser);
    } catch { /* ignore */ }

    await quitGlobalDriver();
  },
};

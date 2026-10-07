import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  BASE_URL: process.env.BASE_URL,
  API_URL: process.env.API_URL,
  // Abre o navegador por padrão; no CI defina HEADLESS=true
  HEADLESS: process.env.HEADLESS === 'true',
  TIMEOUT: 60000,
  LONG_TIMEOUT: 90000,
  SLOW_MO: 1000
};

export const TEST_DATA = {
  OWNER_NAME: 'Dr. Fernando Souza',
  OWNER_EMAIL: 'fernando.souza.e2e@iougurt.com',
  OWNER_PASSWORD: 'Test@123456',
  CLINIC_NAME: 'Clínica Veterinária Iougurt E2E',

  GLOBAL_OWNER_NAME: 'Dr. Global Owner',
  GLOBAL_OWNER_EMAIL: 'global.owner.e2e@iougurt.com',
  GLOBAL_CLINIC_NAME: 'Clínica Global E2E',

  VET_NAME: 'Dra. Camila Ferreira',
  VET_EMAIL: 'camila.ferreira.e2e@iougurt.com',

  TUTOR_NAME: 'Ricardo Oliveira',
  TUTOR_EMAIL: 'ricardo.oliveira.e2e@iougurt.com',
  TUTOR_CPF: '52998224725',
  TUTOR_PHONE: '61999887766',
  TUTOR_ACCOUNT_EMAIL: 'ricardo.portal.e2e@iougurt.com',

  PET_DOG_NAME: 'Amora',
  PET_CAT_NAME: 'Mingau',
};

export const TEST_PASSWORD = TEST_DATA.OWNER_PASSWORD;

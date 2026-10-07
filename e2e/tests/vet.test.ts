import { By, until, WebDriver } from 'selenium-webdriver';
import { expect } from 'chai';
import { getGlobalDriver, getSharedData } from '../helpers/global-fixture';
import { activateTutorAccount } from '../helpers/api.helper';
import { ENV, TEST_DATA } from '../config/test.config';
import { LoginPage } from '../pages/login.page';
import { RegisterPage } from '../pages/register.page';
import { PatientsListPage } from '../pages/patients-list.page';
import { PatientRegisterPage } from '../pages/patient-register.page';
import { PatientDetailsPage } from '../pages/patient-details.page';
import { SidebarPage } from '../pages/sidebar.page';
import * as fs from 'fs';
import * as path from 'path';

async function selectCustomOption(driver: WebDriver, labelText: string, optionText: string) {
  const labelXPath = `//div[contains(@class, "form-group") and ./label[contains(text(), "${labelText}")]]//div[contains(@class, "custom-select-button")]`;
  const selectButton = await driver.wait(until.elementLocated(By.xpath(labelXPath)), 8000);
  await driver.wait(until.elementIsVisible(selectButton), 8000);
  
  if (labelText === 'Tutor') {
    await driver.wait(async () => {
      const text = await selectButton.getText();
      return !text.includes('Carregando');
    }, 8000);
  } else if (labelText === 'Paciente') {
    await driver.wait(async () => {
      const text = await selectButton.getText();
      return !text.includes('Carregando') && !text.includes('primeiro');
    }, 8000);
  }

  await driver.executeScript("arguments[0].scrollIntoView({block: 'center'});", selectButton);
  await new Promise((resolve) => setTimeout(resolve, 300));
  await selectButton.click();
  
  const optionXPath = `//div[contains(@class, "form-group") and ./label[contains(text(), "${labelText}")]]//div[contains(@class, "dropdown-overlay")]//div[contains(@class, "dropdown-item") and contains(text(), "${optionText}")]`;
  const optionEl = await driver.wait(until.elementLocated(By.xpath(optionXPath)), 8000);
  await driver.wait(until.elementIsVisible(optionEl), 8000);
  await optionEl.click();
}

describe('Veterinarian Flow E2E - Continuous Journey', function () {
  let driver: WebDriver;
  let petName: string;
  let tutorName: string;
  let tutorCpf: string;
  let tutorPhone: string;
  let dummyPdfPath: string;

  before(async function () {
    driver = await getGlobalDriver();

    await driver.get(`${ENV.BASE_URL}/login`);
    try {
      await driver.executeScript('window.localStorage.clear();');
    } catch { /* ignore */ }

    petName = TEST_DATA.PET_DOG_NAME;
    tutorName = TEST_DATA.TUTOR_NAME;
    tutorCpf = TEST_DATA.TUTOR_CPF;
    tutorPhone = TEST_DATA.TUTOR_PHONE;

    dummyPdfPath = path.resolve('test.pdf');
    fs.writeFileSync(dummyPdfPath, 'dummy PDF content');
  });

  after(async function () {
    if (dummyPdfPath && fs.existsSync(dummyPdfPath)) {
      try {
        fs.unlinkSync(dummyPdfPath);
      } catch { /* ignore */ }
    }
  });

  beforeEach(async function () {
    try {
      await driver.executeScript('window.onbeforeunload = null; window.__hasBeforeUnload = false;');
    } catch { /* ignore */ }

    try {
      const overlays = await driver.findElements(By.css('.modal-overlay, .agenda-confirm-overlay, .care-modal-overlay, .patient-edit-modal-overlay'));
      for (const overlay of overlays) {
        if (await overlay.isDisplayed()) {
          await driver.navigate().refresh();
          await new Promise((resolve) => setTimeout(resolve, 1000));
          break;
        }
      }
    } catch { /* ignore */ }
  });

  it('Passo 1: Deve realizar o cadastro e login com as credenciais do owner', async function () {
    const loginPage = new LoginPage(driver);
    await loginPage.open();

    const passwordInput = await driver.wait(until.elementLocated(By.id('login-password')), 8000);
    expect(await passwordInput.getAttribute('type')).to.equal('password');
    await passwordInput.sendKeys('Test@123456');
    
    await loginPage.togglePasswordVisibility();
    expect(await passwordInput.getAttribute('type')).to.equal('text');
    
    await loginPage.togglePasswordVisibility();
    expect(await passwordInput.getAttribute('type')).to.equal('password');

    await loginPage.clickForgotPassword();
    await driver.wait(until.urlContains('/forgot-password'), 8000);

    const forgotEmailInput = await driver.wait(until.elementLocated(By.id('forgot-email')), 8000);
    await forgotEmailInput.sendKeys(TEST_DATA.OWNER_EMAIL);

    const submitBtn = await driver.wait(until.elementLocated(By.css('button.auth-submit')), 8000);
    expect(await submitBtn.isDisplayed()).to.equal(true);

    const backToLoginLink = await driver.wait(until.elementLocated(By.css('a.forgot-back-link')), 8000);
    expect(await backToLoginLink.isDisplayed()).to.equal(true);
    
    await loginPage.open();
    await driver.wait(until.urlContains('/login'), 8000);

    const registerLink = await driver.wait(until.elementLocated(By.css('a[href="/register"]')), 8000);
    await registerLink.click();
    await driver.wait(until.urlContains('/register'), 8000);

    const registerPage = new RegisterPage(driver);
    await registerPage.register(
      TEST_DATA.OWNER_NAME,
      TEST_DATA.CLINIC_NAME,
      TEST_DATA.OWNER_EMAIL,
      TEST_DATA.OWNER_PASSWORD
    );

    await loginPage.waitForUrlContains('/login');
    await loginPage.login(TEST_DATA.OWNER_EMAIL, TEST_DATA.OWNER_PASSWORD);
    
    await loginPage.waitForUrlContains('/home');
    const currentUrl = await driver.getCurrentUrl();
    expect(currentUrl).to.include('/home');
  });

  it('Passo 2: Deve cadastrar um novo pet e tutor com informações obrigatórias', async function () {
    const sidebar = new SidebarPage(driver);
    await sidebar.navigateTo('pacientes');
    
    const patientsList = new PatientsListPage(driver);
    await patientsList.waitForTableOrEmpty();
    await patientsList.clickNewPatient();
    
    const registerPage = new PatientRegisterPage(driver);
    await registerPage.waitForUrlContains('/pacientes/cadastrar');

    const petNameInput = await driver.wait(until.elementLocated(By.id('pet-name')), 8000);
    await petNameInput.sendKeys(petName);

    const birthDateInput = await driver.findElement(By.id('birth-date'));
    await birthDateInput.sendKeys('15062020');

    await registerPage.selectOption(By.id('species'), 'Cachorro');

    const breedInput = await driver.findElement(By.id('breed'));
    await breedInput.sendKeys('Vira-lata');
    
    const sexRadio = await driver.wait(until.elementLocated(By.css('input[name="sex"][value="Feminino"]')), 8000);
    await sexRadio.click();

    const microchipRadio = await driver.wait(until.elementLocated(By.css('input[name="microchip"][value="Não"]')), 8000);
    await microchipRadio.click();

    const tutorModeNewRadio = await driver.wait(until.elementLocated(By.xpath('//label[contains(., "Cadastrar novo tutor")]/input')), 8000);
    await tutorModeNewRadio.click();

    const tutorNameInput = await driver.wait(until.elementLocated(By.id('tutor-name')), 8000);
    await tutorNameInput.sendKeys(tutorName);

    const tutorCpfInput = await driver.findElement(By.id('tutor-cpf'));
    await tutorCpfInput.sendKeys(tutorCpf);

    const tutorPhoneInput = await driver.findElement(By.id('tutor-phone'));
    await tutorPhoneInput.sendKeys(tutorPhone);

    await registerPage.submit();

    try {
      await driver.wait(async () => {
        const url = await driver.getCurrentUrl();
        return url.endsWith('/pacientes') || url.endsWith('/pacientes/');
      }, 15000);
    } catch (err) {
      const errors = await driver.findElements(By.className('field-error'));
      const errorTexts = await Promise.all(errors.map(e => e.getText()));
      console.log('--- VET REGISTRATION FAILED ---');
      console.log('Field errors:', errorTexts);
      
      const toast = await driver.findElements(By.className('register-toast'));
      if (toast.length > 0) {
        console.log('Toast Message:', await toast[0].getText());
      }
      throw err;
    }
  });

  it('Passo 3: Deve realizar um agendamento para o pet recém-criado', async function () {
    const sidebar = new SidebarPage(driver);
    await sidebar.navigateTo('agenda');
    
    const agendarBtn = await driver.wait(until.elementLocated(By.css('.btn-agendar-header')), 10000);
    await driver.wait(until.elementIsVisible(agendarBtn), 8000);
    await driver.executeScript('arguments[0].click();', agendarBtn);

    await driver.wait(until.elementLocated(By.css('.schedule-modal-content')), 8000);

    await selectCustomOption(driver, 'Tutor', tutorName);
    await selectCustomOption(driver, 'Paciente', petName);

    await selectCustomOption(driver, 'Início', '14:00');
    await selectCustomOption(driver, 'Fim', '14:30');
    await selectCustomOption(driver, 'Tipo de atendimento', 'Consulta');

    const submitBtn = await driver.wait(until.elementLocated(By.css('.modal-footer .btn-submit')), 8000);
    await submitBtn.click();

    const apptCardXPath = `//div[contains(@class, "agenda-card") and .//span[contains(@class, "pet-name") and contains(text(), "${petName}")]]`;
    const apptCard = await driver.wait(until.elementLocated(By.xpath(apptCardXPath)), 10000);
    void expect(await apptCard.isDisplayed()).to.be.true;
  });

  it('Passo 4: Deve cancelar o agendamento recém-criado com justificativa', async function () {
    const apptCardXPath = `//div[contains(@class, "agenda-card") and .//span[contains(@class, "pet-name") and contains(text(), "${petName}")]]`;
    const apptCard = await driver.wait(until.elementLocated(By.xpath(apptCardXPath)), 8000);
    await apptCard.click();

    await driver.wait(until.elementLocated(By.css('.agenda-confirm-modal')), 8000);
    const cancelBtn = await driver.wait(until.elementLocated(By.css('.agenda-action-cancelar')), 8000);
    await cancelBtn.click();

    const textarea = await driver.wait(until.elementLocated(By.css('textarea.agenda-form-textarea')), 8000);
    await textarea.sendKeys('Tutor informou que precisou viajar a trabalho.');

    const confirmCancelBtn = await driver.wait(until.elementLocated(By.xpath('//button[contains(text(), "Confirmar Cancelamento")]')), 8000);
    await confirmCancelBtn.click();

    await driver.wait(until.stalenessOf(apptCard), 12000);
    const elements = await driver.findElements(By.xpath(apptCardXPath));
    expect(elements.length).to.equal(0);
  });

  it('Passo 5: Deve criar um novo agendamento e realizar o reagendamento', async function () {
    const sidebar = new SidebarPage(driver);
    await sidebar.navigateTo('agenda');

    const agendarBtn = await driver.wait(until.elementLocated(By.css('.btn-agendar-header')), 8000);
    await driver.executeScript('arguments[0].click();', agendarBtn);
    await driver.wait(until.elementLocated(By.css('.schedule-modal-content')), 8000);

    await selectCustomOption(driver, 'Tutor', tutorName);
    await selectCustomOption(driver, 'Paciente', petName);
    await selectCustomOption(driver, 'Início', '16:00');
    await selectCustomOption(driver, 'Fim', '16:30');
    await selectCustomOption(driver, 'Tipo de atendimento', 'Consulta');

    const submitBtn = await driver.wait(until.elementLocated(By.css('.modal-footer .btn-submit')), 8000);
    await submitBtn.click();

    const apptCardXPath = `//div[contains(@class, "agenda-card") and .//span[contains(@class, "pet-name") and contains(text(), "${petName}")]]`;
    const apptCard = await driver.wait(until.elementLocated(By.xpath(apptCardXPath)), 10000);
    await apptCard.click();

    await driver.wait(until.elementLocated(By.css('.agenda-confirm-modal')), 8000);
    const rescheduleBtn = await driver.wait(until.elementLocated(By.css('.agenda-action-reagendar')), 8000);
    await rescheduleBtn.click();

    const startSelect = await driver.wait(until.elementLocated(By.xpath('//div[label[contains(text(), "Novo Horário")]]/select')), 8000);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const rescheduleDate = tomorrow.toISOString().split('T')[0];
    const dateInput = await driver.wait(until.elementLocated(By.xpath('//div[label[contains(text(), "Nova Data")]]/input[@type="date"]')), 8000);
    await driver.executeScript(`
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(arguments[0], arguments[1]);
      arguments[0].dispatchEvent(new Event('input', { bubbles: true }));
      arguments[0].dispatchEvent(new Event('change', { bubbles: true }));
    `, dateInput, rescheduleDate);

    await driver.executeScript(`
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
      nativeSetter.call(arguments[0], '17:00');
      arguments[0].dispatchEvent(new Event('change', { bubbles: true }));
    `, startSelect);

    const endSelect = await driver.wait(until.elementLocated(By.xpath('//div[label[contains(text(), "Novo Fim")]]/select')), 8000);
    await driver.executeScript(`
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
      nativeSetter.call(arguments[0], '17:30');
      arguments[0].dispatchEvent(new Event('change', { bubbles: true }));
    `, endSelect);

    await new Promise((resolve) => setTimeout(resolve, 500));

    const confirmRescheduleBtn = await driver.wait(until.elementLocated(By.xpath('//button[contains(text(), "Confirmar Reagendamento")]')), 8000);
    await confirmRescheduleBtn.click();

    await new Promise((resolve) => setTimeout(resolve, 3000));

    await driver.navigate().refresh();
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const nextDayArrows = await driver.findElements(By.css('.agenda-date-arrow'));
    await nextDayArrows[1].click();
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const updatedCardXPath = `//div[contains(@class, "agenda-card") and .//span[contains(@class, "pet-name") and contains(text(), "${petName}")]]`;
    const updatedCard = await driver.wait(until.elementLocated(By.xpath(updatedCardXPath)), 12000);
    const updatedTimeSpan = await updatedCard.findElement(By.css('.agenda-card-time'));
    const finalTimeText = await updatedTimeSpan.getText();
    expect(finalTimeText).to.include('17:00');
  });

  it('Passo 6: Deve criar um terceiro agendamento e iniciar atendimento clínico', async function () {
    const sidebar = new SidebarPage(driver);
    await sidebar.navigateTo('agenda');

    const agendarBtn = await driver.wait(until.elementLocated(By.css('.btn-agendar-header')), 8000);
    await driver.executeScript('arguments[0].click();', agendarBtn);
    await driver.wait(until.elementLocated(By.css('.schedule-modal-content')), 8000);

    await selectCustomOption(driver, 'Tutor', tutorName);
    await selectCustomOption(driver, 'Paciente', petName);
    await selectCustomOption(driver, 'Início', '08:00');
    await selectCustomOption(driver, 'Fim', '08:30');
    await selectCustomOption(driver, 'Tipo de atendimento', 'Consulta');

    const submitBtn = await driver.wait(until.elementLocated(By.css('.modal-footer .btn-submit')), 8000);
    await submitBtn.click();

    const apptCardXPath = `//div[contains(@class, "agenda-card") and .//span[contains(@class, "pet-name") and contains(text(), "${petName}")]]`;
    const apptCard = await driver.wait(until.elementLocated(By.xpath(apptCardXPath)), 10000);
    await apptCard.click();

    await driver.wait(until.elementLocated(By.css('.agenda-confirm-modal')), 8000);
    const startCareBtn = await driver.wait(until.elementLocated(By.css('.agenda-action-atender')), 8000);
    await startCareBtn.click();

    await driver.wait(until.urlContains('/atendimentos/'), 12000);
    const currentUrl = await driver.getCurrentUrl();
    expect(currentUrl).to.include('/atendimentos/');

    // Preencher campos do prontuário (US09)
    const clinicalNotes = await driver.wait(until.elementLocated(By.id('clinical-notes')), 8000);
    await clinicalNotes.sendKeys('Animal com tosse e espirros frequentes.');

    const physicalExam = await driver.findElement(By.id('physical-exam'));
    await physicalExam.sendKeys('Temperatura 38.5C, pulmões limpos, mucosa corada.');

    const observations = await driver.findElement(By.id('care-observations'));
    await observations.sendKeys('Suspeita de traqueobronquite infecciosa canina.');

    const examRequests = await driver.findElement(By.id('care-exam-requests'));
    await examRequests.sendKeys('Hemograma completo, PCR para vírus respiratórios.');

    const diagnosis = await driver.findElement(By.id('care-diagnosis'));
    await diagnosis.sendKeys('Gripe canina.');

    const prescriptions = await driver.findElement(By.id('care-prescriptions'));
    await prescriptions.sendKeys('Antibiótico doxiciclina 100mg a cada 12h por 7 dias.');

    const additionalObs = await driver.findElement(By.id('care-additional-observations'));
    await additionalObs.sendKeys('Manter animal isolado de outros cães.');

    const saveBtn = await driver.findElement(By.xpath('//button[contains(@class, "care-top-action") and contains(., "Salvar alterações")]'));
    await saveBtn.click();

    const successToast = await driver.wait(until.elementLocated(By.css('.care-toast.success')), 8000);
    expect(await successToast.getText()).to.include('salvo com sucesso');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const finalizeBtn = await driver.wait(until.elementLocated(By.xpath('//button[contains(@class, "care-top-action") and contains(text(), "Finalizar atendimento")]')), 12000);
    await finalizeBtn.click();

    const confirmFinalizeBtn = await driver.wait(until.elementLocated(By.xpath('//div[contains(@class, "care-modal-actions")]/button[contains(@class, "primary") and contains(text(), "Finalizar")]')), 8000);
    await confirmFinalizeBtn.click();

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const receiptBtn = await driver.wait(until.elementLocated(By.xpath('//button[contains(@class, "care-top-action") and contains(., "Gerar Receita")]')), 8000);
    await driver.wait(async () => {
      return await receiptBtn.isEnabled();
    }, 8000);
    await receiptBtn.click();

    await new Promise((resolve) => setTimeout(resolve, 1000));
    const errorToasts = await driver.findElements(By.css('.care-toast.error'));
    expect(errorToasts.length).to.equal(0);
  });

  it('Passo 7: Deve filtrar pacientes, acessar a ficha do paciente e navegar nas abas', async function () {
    const sidebar = new SidebarPage(driver);
    await sidebar.navigateTo('pacientes');

    const patientsList = new PatientsListPage(driver);
    await patientsList.waitForTableOrEmpty();

    const searchInput = await driver.wait(until.elementLocated(By.id('patient-search')), 8000);
    await searchInput.clear();
    await searchInput.sendKeys(petName);
    await new Promise((resolve) => setTimeout(resolve, 800));

    await patientsList.openFilters();
    
    await patientsList.selectSpeciesFilter('Cachorro');
    await patientsList.applyFilters();
    await new Promise((resolve) => setTimeout(resolve, 800));

    const detailsBtnXPath = `//tr[td[contains(text(), "${petName}")]]//button[contains(@class, "table-action-btn")]`;
    const detailsBtn = await driver.wait(until.elementLocated(By.xpath(detailsBtnXPath)), 8000);
    await detailsBtn.click();

    const patientDetails = new PatientDetailsPage(driver);
    await patientDetails.waitForLoaded();

    let activeTab = await patientDetails.getActiveTabText();
    expect(activeTab).to.include('Dados');

    await patientDetails.switchTab('Prontuário');
    activeTab = await patientDetails.getActiveTabText();
    expect(activeTab).to.include('Prontuário');

    await patientDetails.switchTab('Exames');
    activeTab = await patientDetails.getActiveTabText();
    expect(activeTab).to.include('Exames');

    const attachBtn = await driver.wait(until.elementLocated(By.xpath('//button[contains(., "Anexar Exame")]')), 8000);
    await attachBtn.click();

    const fileInput = await driver.wait(until.elementLocated(By.css('input[type="file"]')), 8000);
    await fileInput.sendKeys(dummyPdfPath);

    const modalAttachConfirm = await driver.wait(until.elementLocated(By.css('.patient-edit-modal-actions button.confirm.save')), 8000);
    await modalAttachConfirm.click();

    const examRowXPath = `//tr[td[contains(., "test.pdf")]]`;
    const examRow = await driver.wait(until.elementLocated(By.xpath(examRowXPath)), 10000);
    expect(await examRow.isDisplayed()).to.equal(true);

    const downloadBtn = await examRow.findElement(By.css('.patient-records-action'));
    await downloadBtn.click();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    await patientDetails.switchTab('Dados');
    activeTab = await patientDetails.getActiveTabText();
    expect(activeTab).to.include('Dados');

    const accessBtn = await driver.wait(until.elementLocated(By.css('.patient-details-tutor-access-btn')), 8000);
    await accessBtn.click();

    const emailModalInput = await driver.wait(until.elementLocated(By.id('tutor-access-email')), 8000);
    const tutorEmail = TEST_DATA.TUTOR_ACCOUNT_EMAIL;
    await emailModalInput.sendKeys(tutorEmail);

    const generateBtn = await driver.findElement(By.css('.patient-edit-modal .confirm.save'));
    await generateBtn.click();

    // A tela mostra só o e-mail de acesso: a senha é definida no primeiro acesso
    await driver.wait(until.elementLocated(By.css('.patient-details-access-result')), 10000);

    const closeBtn = await driver.findElement(By.css('.patient-edit-modal button.ghost'));
    await closeBtn.click();

    const password = await activateTutorAccount(tutorEmail);

    const sharedData = getSharedData();
    sharedData.dynamicTutorCredentials = {
      email: tutorEmail,
      password,
      petName: petName,
      tutorName: tutorName
    };
  });

  it('Passo 8: Deve abrir edição, alterar observações do paciente e salvar com sucesso', async function () {
    const patientDetails = new PatientDetailsPage(driver);
    await patientDetails.clickEditar();

    await driver.wait(until.urlContains('/editar'), 8000);

    const weightInput = await driver.wait(until.elementLocated(By.id('weight')), 8000);
    await weightInput.clear();
    await weightInput.sendKeys('15');

    // Testar US05 - Alerta ao tentar sair com alterações não salvas (Exit Modal)
    const backBtn = await driver.findElement(By.css('.register-back-btn'));
    await backBtn.click();

    const exitModalOverlay = await driver.wait(until.elementLocated(By.css('.patient-edit-modal-overlay')), 8000);
    const cancelExitBtn = await exitModalOverlay.findElement(By.css('.patient-edit-modal-actions button.ghost'));
    await cancelExitBtn.click();

    await driver.wait(until.stalenessOf(exitModalOverlay), 8000);

    const emailInput = await driver.findElement(By.id('tutor-email'));
    await emailInput.clear();
    await emailInput.sendKeys('tutor.ricardo@gmail.com');

    const insuranceSelect = await driver.findElement(By.id('tutor-insurance'));
    await insuranceSelect.sendKeys('Nenhum');

    const cepInput = await driver.findElement(By.id('cep'));
    await cepInput.clear();
    await cepInput.sendKeys('70910900');
    await new Promise((resolve) => setTimeout(resolve, 800));

    const stateSelect = await driver.findElement(By.id('state'));
    await stateSelect.sendKeys('DF');

    const cityInput = await driver.findElement(By.id('city'));
    await cityInput.clear();
    await cityInput.sendKeys('Brasilia');

    const neighInput = await driver.findElement(By.id('neighborhood'));
    await neighInput.clear();
    await neighInput.sendKeys('Asa Norte');

    const streetInput = await driver.findElement(By.id('street'));
    await streetInput.clear();
    await streetInput.sendKeys('Campus Darcy Ribeiro');

    const numInput = await driver.findElement(By.id('address-number'));
    await numInput.clear();
    await numInput.sendKeys('123');

    const obsInput = await driver.findElement(By.id('observations'));
    await obsInput.clear();
    await obsInput.sendKeys('Paciente apresenta excelente recuperação pós-operatória. Retorno em 15 dias.');

    const saveBtn = await driver.findElement(By.css('.register-submit-btn.patient-edit-submit'));
    await driver.executeScript("arguments[0].scrollIntoView({block: 'center'});", saveBtn);
    await saveBtn.click();

    const confirmSaveBtn = await driver.wait(until.elementLocated(By.css('button.confirm.save')), 8000);
    await confirmSaveBtn.click();

    await driver.wait(async () => {
      const url = await driver.getCurrentUrl();
      return !url.includes('/editar');
    }, 10000);
    await patientDetails.waitForLoaded();

    const bodyText = await driver.findElement(By.tagName('body')).getText();
    expect(bodyText).to.include('excelente recuperação pós-operatória');
  });

  it('Passo 9: Deve navegar para Histórico, testar filtros e abrir um atendimento histórico', async function () {
    const sidebar = new SidebarPage(driver);
    await sidebar.navigateTo('historico');

    const toggleFilterBtn = await driver.wait(until.elementLocated(By.css('.history-filter-toggle')), 10000);
    await toggleFilterBtn.click();

    const selectSpecies = await driver.wait(until.elementLocated(By.css('#history-filter-species')), 8000);
    await selectSpecies.sendKeys('Cachorro');

    const applyFilterBtn = await driver.wait(until.elementLocated(By.css('.history-filter-actions button.primary')), 8000);
    await applyFilterBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 800));

    await toggleFilterBtn.click();
    const clearFilterBtn = await driver.wait(until.elementLocated(By.css('.history-filter-actions button.ghost')), 8000);
    await clearFilterBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 800));

    const historyActionBtn = await driver.wait(until.elementLocated(By.css('.history-action-button')), 8000);
    await historyActionBtn.click();

    await driver.wait(until.urlContains('/historico/'), 8000);
    const detailUrl = await driver.getCurrentUrl();
    expect(detailUrl).to.include('/historico/');
  });

  it('Passo 10: Deve acessar o Dashboard Gerencial e testar filtros de período, categoria e histórico', async function () {
    const sidebar = new SidebarPage(driver);
    await sidebar.navigateTo('dashboard');

    await driver.wait(until.elementLocated(By.css('.dashboard-chip')), 10000);

    const monthChip = await driver.wait(until.elementLocated(By.xpath('//button[contains(@class, "dashboard-chip") and contains(text(), "Mes")]')), 8000);
    await monthChip.click();
    await new Promise((resolve) => setTimeout(resolve, 500));

    const categoriesChip = await driver.wait(until.elementLocated(By.xpath('//button[contains(@class, "dashboard-chip") and contains(text(), "Categorias")]')), 8000);
    await categoriesChip.click();
    await new Promise((resolve) => setTimeout(resolve, 500));

    const weekChip = await driver.wait(until.elementLocated(By.xpath('//button[contains(@class, "dashboard-chip") and contains(text(), "Semana")]')), 8000);
    await weekChip.click();
    await new Promise((resolve) => setTimeout(resolve, 500));

    const historySelect = await driver.wait(until.elementLocated(By.xpath('//label[contains(text(), "Historico")]/select')), 8000);
    await driver.executeScript(`
      const select = arguments[0];
      select.value = "30";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    `, historySelect);
    
    const subtitle = await driver.wait(until.elementLocated(By.xpath('//p[contains(., "30 dias")]')), 8000);
    void expect(await subtitle.isDisplayed()).to.be.true;
  });

  it('Passo 11: Deve fazer logout, logar como Veterinário comum e verificar a restrição de acesso ao Dashboard', async function () {
    const sidebar = new SidebarPage(driver);
    await sidebar.logout();

    const loginPage = new LoginPage(driver);
    await loginPage.waitForUrlContains('/login');

    await loginPage.login('camila.global@iougurt.com', TEST_DATA.OWNER_PASSWORD);
    await loginPage.waitForUrlContains('/home');

    const isDashboardLinkVisible = await sidebar.isLinkVisible('dashboard');
    expect(isDashboardLinkVisible).to.equal(false);

    await driver.get(`${ENV.BASE_URL}/dashboard`);

    await driver.wait(until.urlContains('/home'), 8000);
    const currentUrl = await driver.getCurrentUrl();
    expect(currentUrl).to.not.include('/dashboard');
    expect(currentUrl).to.include('/home');

    // Limpar sessão
    await sidebar.logout();
    await loginPage.waitForUrlContains('/login');
  });
});

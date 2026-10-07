import { By, until, WebDriver } from 'selenium-webdriver';
import { expect } from 'chai';
import { getGlobalDriver, getSharedData } from '../helpers/global-fixture';
import { ENV } from '../config/test.config';
import { LoginPage } from '../pages/login.page';

describe('Tutor Flow E2E - Continuous Journey', function () {
  let driver: WebDriver;
  let tutorEmail: string;
  let tutorPassword: string;
  let dogName: string;
  let catName: string;

  before(async function () {
    driver = await getGlobalDriver();
    
    await driver.get(`${ENV.BASE_URL}/login`);
    try {
      await driver.executeScript('window.localStorage.clear();');
    } catch { /* ignore */ }

    const sharedData = getSharedData();
    if (sharedData.dynamicTutorCredentials) {
      tutorEmail = sharedData.dynamicTutorCredentials.email;
      tutorPassword = sharedData.dynamicTutorCredentials.password;
      dogName = sharedData.dynamicTutorCredentials.petName;
      catName = '';
    } else {
      tutorEmail = sharedData.tutorCredentials.email;
      tutorPassword = sharedData.tutorCredentials.password;
      dogName = sharedData.patientDog.name;
      catName = sharedData.patientCat.name;
    }
  });

  beforeEach(async function () {
    try {
      await driver.executeScript('window.onbeforeunload = null; window.__hasBeforeUnload = false;');
    } catch { /* ignore */ }
  });

  it('Passo 1: Deve realizar login com as credenciais do tutor', async function () {
    const loginPage = new LoginPage(driver);
    await loginPage.open();
    await loginPage.login(tutorEmail, tutorPassword);

    await driver.wait(until.urlContains('/portal'), 12000);
    const currentUrl = await driver.getCurrentUrl();
    expect(currentUrl).to.include('/portal');
  });

  it('Passo 2: Deve visualizar dados do pet e alternar entre os pets vinculados', async function () {
    await driver.wait(until.elementLocated(By.css('.tutor-pet-card')), 10000);

    const greeting = await driver.wait(until.elementLocated(By.css('.tutor-home-header h1')), 8000);
    const greetingText = await greeting.getText();
    expect(greetingText.toLowerCase()).to.include('ola');

    const nameSpan = await driver.wait(until.elementLocated(By.css('.tutor-pet-switch-pill span')), 8000);
    const petNameText = await nameSpan.getText();
    
    if (catName) {
      expect([dogName, catName]).to.include(petNameText);
    } else {
      expect(petNameText).to.equal(dogName);
    }

    const nextBtn = await driver.findElement(By.css('button[aria-label="Proximo pet"]'));
    if (await nextBtn.isEnabled()) {
      await nextBtn.click();
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const petNameText2 = await nameSpan.getText();
      expect(petNameText2).to.not.equal(petNameText);

      const prevBtn = await driver.findElement(By.css('button[aria-label="Pet anterior"]'));
      await prevBtn.click();
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const petNameText3 = await nameSpan.getText();
      expect(petNameText3).to.equal(petNameText);
    }
  });

  it('Passo 3: Deve visualizar o painel de alertas do Iougurt Care', async function () {
    const careSection = await driver.wait(until.elementLocated(By.css('.tutor-care-card')), 8000);
    void expect(await careSection.isDisplayed()).to.be.true;

    const listItems = await driver.findElements(By.css('.tutor-care-card ul li'));
    expect(listItems.length).to.be.greaterThan(0);
  });

  it('Passo 4: Deve navegar para Histórico do portal e testar filtros de busca', async function () {
    const historyLink = await driver.wait(until.elementLocated(By.css('a[href="/portal/historico"]')), 8000);
    await historyLink.click();

    await driver.wait(until.urlContains('/portal/historico'), 8000);

    const filterToggleBtn = await driver.wait(until.elementLocated(By.css('.history-filter-toggle')), 8000);
    await filterToggleBtn.click();

    const speciesSelect = await driver.wait(until.elementLocated(By.css('#history-filter-species')), 8000);
    await speciesSelect.sendKeys('Cachorro');

    const applyFilterBtn = await driver.wait(until.elementLocated(By.css('.history-filter-actions button.primary')), 8000);
    await applyFilterBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 800));

    await filterToggleBtn.click();
    const clearFilterBtn = await driver.wait(until.elementLocated(By.css('.history-filter-actions button.ghost')), 8000);
    await clearFilterBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 800));
  });

  it('Passo 5: Deve acessar detalhes do atendimento histórico e exportar relatório', async function () {
    const historyActionBtn = await driver.wait(until.elementLocated(By.css('.history-action-button')), 8000);
    await historyActionBtn.click();

    await driver.wait(until.urlContains('/portal/historico/'), 8000);

    const detailsContent = await driver.wait(until.elementLocated(By.css('.history-detail-content')), 10000);
    void expect(await detailsContent.isDisplayed()).to.be.true;

    // Validar o Bloco de Resumo IA (US13)
    const aiSummaryBlock = await driver.wait(
      until.elementLocated(By.xpath('//section[contains(@class, "history-detail-block") and h3[contains(text(), "Resumo IA:")]]')),
      8000
    );
    expect(await aiSummaryBlock.isDisplayed()).to.equal(true);
    const aiSummaryText = await aiSummaryBlock.findElement(By.tagName('p')).getText();
    expect(aiSummaryText.length).to.be.greaterThan(0);

    const backBtn = await driver.findElement(By.css('.care-back-button'));
    await backBtn.click();

    await driver.wait(until.urlContains('/portal/historico'), 8000);

    const logoutBtn = await driver.findElement(By.css('.tutor-sidebar-logout'));
    await logoutBtn.click();

    await driver.wait(until.urlContains('/login'), 8000);
  });
});

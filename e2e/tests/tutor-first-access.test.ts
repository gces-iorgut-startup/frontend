import { By, until, WebDriver } from 'selenium-webdriver';
import { expect } from 'chai';
import { getGlobalDriver, getSharedData } from '../helpers/global-fixture';
import {
  createTutor, createPatient,
  createPendingTutorAccount, getFirstAccessToken, refreshUserToken,
} from '../helpers/api.helper';
import { ENV } from '../config/test.config';
import { FirstAccessPage } from '../pages/first-access.page';
import { TutorLoginPage } from '../pages/tutor-login.page';

const NEW_PASSWORD = 'Senha@123';

function generateCpf(): string {
  const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  const digit = (arr: number[]) => {
    const sum = arr.reduce((acc, v, i) => acc + v * (arr.length + 1 - i), 0);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  n.push(digit(n));
  n.push(digit(n));
  return n.join('');
}

describe('Tutor Primeiro Acesso E2E', function () {
  let driver: WebDriver;
  let firstAccess: FirstAccessPage;
  let email: string;
  let token: string;

  before(async function () {
    driver = await getGlobalDriver();
    firstAccess = new FirstAccessPage(driver);

    const { owner, ctx } = getSharedData();
    await refreshUserToken(owner);

    email = `tutor.primeiroacesso.${Date.now()}@iougurt.com`;
    const tutor = await createTutor(ctx, owner, {
      fullName: 'Tutor Primeiro Acesso',
      cpf: generateCpf(),
      phone: '61999887766',
      email,
    });
    await createPatient(ctx, owner, tutor.id, 'Bolinha Acesso', 'Cachorro');
    await createPendingTutorAccount(owner, tutor.id, email);
    token = await getFirstAccessToken(email);

    await driver.get(`${ENV.BASE_URL}/login`);
    try { await driver.executeScript('window.localStorage.clear();'); } catch { /* ignore */ }
  });

  it('Passo 1: Link inválido mostra mensagem de erro', async function () {
    await firstAccess.open('token-invalido');
    const err = await driver.wait(until.elementLocated(By.css('.form-error')), 8000);
    expect(await err.getText()).to.include('Link expirado ou já utilizado');
  });

  it('Passo 2: Link válido exibe o formulário com o e-mail do tutor', async function () {
    await firstAccess.open(token);
    await driver.wait(until.elementLocated(By.id('first-access-password')), 10000);
    expect(await firstAccess.getDescriptionText()).to.include(email);
  });

  it('Passo 3: Senha fraca mantém o botão desabilitado', async function () {
    await firstAccess.fillPasswords('abc');
    void expect(await firstAccess.isSubmitEnabled()).to.be.false;
  });

  it('Passo 4: Senhas diferentes mostram aviso e mantêm o botão desabilitado', async function () {
    await firstAccess.fillPasswords(NEW_PASSWORD, 'Outra@123');
    const body = await driver.findElement(By.css('body')).getText();
    expect(body).to.include('Senhas não coincidem');
    void expect(await firstAccess.isSubmitEnabled()).to.be.false;
  });

  it('Passo 5: Senha válida define a senha e redireciona para o login do portal', async function () {
    await firstAccess.fillPasswords(NEW_PASSWORD);
    expect(await firstAccess.countValidChecks()).to.equal(4);
    await firstAccess.submit();
    await driver.wait(until.urlContains('/portal/login'), 10000);

    // O toast some após 5s, então valida logo
    const tutorLogin = new TutorLoginPage(driver);
    expect(await tutorLogin.getSuccessToastText()).to.include('Senha definida com sucesso');
  });

  it('Passo 6: Faz login com a nova senha e acessa o portal', async function () {
    const tutorLogin = new TutorLoginPage(driver);
    await tutorLogin.login(email, NEW_PASSWORD);
    await driver.wait(until.urlContains('/portal'), 12000);
  });

  it('Passo 7: Acessa o Histórico do portal', async function () {
    const link = await driver.wait(until.elementLocated(By.css('a[href="/portal/historico"]')), 8000);
    await link.click();
    await driver.wait(until.urlContains('/portal/historico'), 8000);
    await driver.wait(until.elementLocated(By.css('.history-filter-toggle')), 8000);
  });

  it('Passo 8: O link de primeiro acesso não pode ser reutilizado', async function () {
    await driver.findElement(By.css('.tutor-sidebar-logout')).click();
    await driver.wait(until.urlContains('/login'), 8000);
    await firstAccess.open(token);
    const err = await driver.wait(until.elementLocated(By.css('.form-error')), 8000);
    expect(await err.getText()).to.include('Link expirado ou já utilizado');
  });
});
import { By, Key } from 'selenium-webdriver';
import { BasePage } from './base.page';

export class FirstAccessPage extends BasePage {
  private passwordInput = By.id('first-access-password');
  private confirmInput = By.id('first-access-confirm-password');
  private submitBtn = By.css('button.auth-submit');
  private errorMessage = By.css('.form-error');
  private validChecks = By.css('.password-check-item.valid');
  private description = By.css('.forgot-description');

  async open(token: string): Promise<void> {
    await this.navigate(`/primeiro-acesso?token=${token}`);
  }

  // Apaga com o teclado (Ctrl+A + Backspace): o clear() do Selenium não dispara o onChange do React
  private async replaceText(locator: By, text: string): Promise<void> {
    const el = await this.driver.findElement(locator);
    await el.click();
    await el.sendKeys(Key.chord(Key.CONTROL, 'a'), Key.BACK_SPACE);
    await el.sendKeys(text);
  }

  async fillPasswords(password: string, confirm: string = password): Promise<void> {
    await this.replaceText(this.passwordInput, password);
    await this.replaceText(this.confirmInput, confirm);
  }

  async submit(): Promise<void> {
    await this.click(this.submitBtn);
  }

  async isSubmitEnabled(): Promise<boolean> {
    const btn = await this.driver.findElement(this.submitBtn);
    return btn.isEnabled();
  }

  async countValidChecks(): Promise<number> {
    return (await this.driver.findElements(this.validChecks)).length;
  }

  async getErrorMessage(): Promise<string> {
    return this.getText(this.errorMessage);
  }

  async getDescriptionText(): Promise<string> {
    return this.getText(this.description);
  }
}
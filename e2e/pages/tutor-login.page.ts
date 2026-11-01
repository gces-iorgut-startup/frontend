import { By } from 'selenium-webdriver';
import { BasePage } from './base.page';

export class TutorLoginPage extends BasePage {
  private emailInput = By.id('tutor-login-email');
  private passwordInput = By.id('tutor-login-password');
  private submitBtn = By.css('button.auth-submit');
  private errorMessage = By.css('.form-error');
  private successToast = By.css('.auth-success-toast');

  async open(): Promise<void> {
    await this.navigate('/portal/login');
  }

  async login(email: string, password: string): Promise<void> {
    await this.clearAndType(this.emailInput, email);
    await this.clearAndType(this.passwordInput, password);
    await this.click(this.submitBtn);
  }

  async getErrorMessage(): Promise<string> {
    return this.getText(this.errorMessage);
  }

  async getSuccessToastText(): Promise<string> {
    return this.getText(this.successToast);
  }
}

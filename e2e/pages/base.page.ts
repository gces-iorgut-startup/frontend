import { WebDriver, By, WebElement, until } from 'selenium-webdriver';
import { ENV } from '../config/test.config';
import { waitForVisible, waitForClickable } from '../helpers/wait.helper';

export class BasePage {
  protected driver: WebDriver;
  protected baseUrl: string = ENV.BASE_URL;

  constructor(driver: WebDriver) {
    this.driver = driver;
  }

  private async delay(): Promise<void> {
    if (ENV.SLOW_MO > 0) {
      await new Promise((resolve) => setTimeout(resolve, ENV.SLOW_MO));
    }
  }

  async navigate(path: string): Promise<void> {
    await this.driver.get(`${this.baseUrl}${path}`);
  }

  async click(locator: By): Promise<void> {
    await this.delay();
    const el = await waitForClickable(this.driver, locator);
    await el.click();
  }

  async type(locator: By, text: string): Promise<void> {
    await this.delay();
    const el = await waitForVisible(this.driver, locator);
    await el.sendKeys(text);
  }

  async clearAndType(locator: By, text: string): Promise<void> {
    await this.delay();
    const el = await waitForVisible(this.driver, locator);
    await el.clear();
    await el.sendKeys(text);
  }

  async getText(locator: By): Promise<string> {
    const el = await waitForVisible(this.driver, locator);
    return el.getText();
  }

  async getValue(locator: By): Promise<string> {
    const el = await waitForVisible(this.driver, locator);
    return (await el.getAttribute('value')) ?? '';
  }

  async getAttribute(locator: By, attr: string): Promise<string> {
    const el = await waitForVisible(this.driver, locator);
    return (await el.getAttribute(attr)) ?? '';
  }

  async isDisplayed(locator: By, timeout: number = 5000): Promise<boolean> {
    try {
      const el = await this.driver.wait(until.elementLocated(locator), timeout);
      return el.isDisplayed();
    } catch {
      return false;
    }
  }

  async getCurrentUrl(): Promise<string> {
    return this.driver.getCurrentUrl();
  }

  async getTitle(): Promise<string> {
    return this.driver.getTitle();
  }

  async waitForUrlContains(
    part: string,
    timeout: number = ENV.TIMEOUT
  ): Promise<void> {
    await this.driver.wait(until.urlContains(part), timeout);
  }

  async findElements(locator: By): Promise<WebElement[]> {
    return this.driver.findElements(locator);
  }

  async selectOption(locator: By, value: string): Promise<void> {
    await this.delay();
    const select = await waitForVisible(this.driver, locator);
    await select.click();
    const options = await select.findElements(By.tagName('option'));
    for (const option of options) {
      const text = await option.getText();
      if (text === value) {
        await option.click();
        return;
      }
    }
  }

  async executeScript(script: string, ...args: unknown[]): Promise<unknown> {
    return this.driver.executeScript(script, ...args);
  }
}

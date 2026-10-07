import { By } from 'selenium-webdriver';
import { BasePage } from './base.page';

export class SidebarPage extends BasePage {
  private homeLink = By.css('a.sidebar-link[href="/home"]');
  private pacientesLink = By.css('a.sidebar-link[href="/pacientes"]');
  private agendaLink = By.css('a.sidebar-link[href="/agenda"]');
  private historicoLink = By.css('a.sidebar-link[href="/historico"]');
  private dashboardLink = By.css('a.sidebar-link[href="/dashboard"]');
  private logoutBtn = By.css('.sidebar-logout');
  private username = By.css('.sidebar-username');
  private sidebar = By.css('.sidebar');
  private logo = By.css('.sidebar-logo');

  private linkMap: Record<string, By> = {
    home: this.homeLink,
    pacientes: this.pacientesLink,
    agenda: this.agendaLink,
    historico: this.historicoLink,
    dashboard: this.dashboardLink,
  };

  async navigateTo(section: string): Promise<void> {
    const locator = this.linkMap[section];
    if (locator) {
      await this.click(locator);
    }
  }

  async logout(): Promise<void> {
    await this.click(this.logoutBtn);
  }

  async getUserName(): Promise<string> {
    return this.getText(this.username);
  }

  async isSidebarVisible(): Promise<boolean> {
    return this.isDisplayed(this.sidebar);
  }

  async isLogoVisible(): Promise<boolean> {
    return this.isDisplayed(this.logo);
  }

  async isLinkVisible(section: string): Promise<boolean> {
    const locator = this.linkMap[section];
    if (!locator) return false;
    return this.isDisplayed(locator);
  }

  async isLinkActive(section: string): Promise<boolean> {
    const locator = this.linkMap[section];
    if (!locator) return false;
    try {
      const el = await this.driver.findElement(locator);
      const className = (await el.getAttribute('class')) ?? '';
      return className.includes('active');
    } catch {
      return false;
    }
  }
}

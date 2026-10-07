import { By, WebElement } from 'selenium-webdriver';
import { BasePage } from './base.page';

export class PatientDetailsPage extends BasePage {
  private backBtn = By.css('.patient-details-back');
  private tabs = By.css('.patient-details-tab');
  private actionsContainer = By.css('.patient-details-actions');
  private infoGrid = By.css('.patient-details-info-grid');
  private infoRows = By.css('.patient-details-info-row');
  private recordsTable = By.css('.patient-records-table');
  private recordsEmpty = By.css('.patient-records-empty');
  private loading = By.css('.patient-details-loading');
  private emptyState = By.css('.patient-details-empty');
  private tutorAccessBtn = By.css('.patient-details-tutor-access-btn');
  private sectionTitle = By.css('.patient-details-section-title');

  async open(patientId: string): Promise<void> {
    await this.navigate(`/pacientes/${patientId}`);
  }

  async clickBack(): Promise<void> {
    await this.click(this.backBtn);
  }

  async getTabs(): Promise<WebElement[]> {
    return this.findElements(this.tabs);
  }

  async getTabTexts(): Promise<string[]> {
    const tabElements = await this.findElements(this.tabs);
    return Promise.all(tabElements.map((t) => t.getText()));
  }

  async switchTab(tabText: string): Promise<void> {
    const tabElements = await this.findElements(this.tabs);
    for (const tab of tabElements) {
      const text = await tab.getText();
      if (text.toLowerCase().includes(tabText.toLowerCase())) {
        await tab.click();
        return;
      }
    }
  }

  async getActiveTabText(): Promise<string> {
    const tabElements = await this.findElements(this.tabs);
    for (const tab of tabElements) {
      const className = (await tab.getAttribute('class')) ?? '';
      if (className.includes('active')) {
        return tab.getText();
      }
    }
    return '';
  }

  async isInfoGridVisible(): Promise<boolean> {
    return this.isDisplayed(this.infoGrid);
  }

  async getInfoRows(): Promise<WebElement[]> {
    return this.findElements(this.infoRows);
  }

  async isRecordsTableVisible(): Promise<boolean> {
    return this.isDisplayed(this.recordsTable);
  }

  async isRecordsEmptyVisible(): Promise<boolean> {
    return this.isDisplayed(this.recordsEmpty);
  }

  async isLoadingVisible(): Promise<boolean> {
    return this.isDisplayed(this.loading, 3000);
  }

  async isEmptyStateVisible(): Promise<boolean> {
    return this.isDisplayed(this.emptyState);
  }

  async clickAtender(): Promise<void> {
    const container = await this.driver.findElement(this.actionsContainer);
    const buttons = await container.findElements(By.tagName('button'));
    for (const btn of buttons) {
      const text = await btn.getText();
      if (text.includes('Atender')) {
        await btn.click();
        return;
      }
    }
  }

  async clickEditar(): Promise<void> {
    const container = await this.driver.findElement(this.actionsContainer);
    const buttons = await container.findElements(By.tagName('button'));
    for (const btn of buttons) {
      const text = await btn.getText();
      if (text.includes('Editar')) {
        await btn.click();
        return;
      }
    }
  }

  async isTutorAccessBtnVisible(): Promise<boolean> {
    return this.isDisplayed(this.tutorAccessBtn);
  }

  async getSectionTitles(): Promise<string[]> {
    const titles = await this.findElements(this.sectionTitle);
    return Promise.all(titles.map((t) => t.getText()));
  }

  async waitForLoaded(): Promise<void> {
    await this.driver.wait(async () => {
      const loadingVisible = await this.isDisplayed(this.loading, 1000);
      return !loadingVisible;
    }, 15000);
  }
}

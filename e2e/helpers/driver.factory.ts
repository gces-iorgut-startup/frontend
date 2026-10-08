import { Builder, logging, WebDriver } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';
import { ENV } from '../config/test.config';

export async function createDriver(): Promise<WebDriver> {
  const options = new chrome.Options();

  // Captura o console do navegador (inclui falhas de requisição da API) para diagnóstico
  const loggingPrefs = new logging.Preferences();
  loggingPrefs.setLevel(logging.Type.BROWSER, logging.Level.ALL);
  options.setLoggingPrefs(loggingPrefs);

  options.addArguments('--window-size=1920,1080');
  options.addArguments('--disable-gpu');
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');
  options.addArguments('--disable-extensions');

  options.addArguments('--log-level=3');
  options.addArguments('--silent');
  options.addArguments('--disable-background-networking');
  options.addArguments('--disable-sync');
  options.addArguments('--disable-notifications');
  options.addArguments('--disable-logging');
  options.excludeSwitches('enable-logging');

  if (ENV.HEADLESS) {
    options.addArguments('--headless=new');
  }

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  await driver.manage().setTimeouts({ implicit: 0, pageLoad: 30000 });

  return driver;
}

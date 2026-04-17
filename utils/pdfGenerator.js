// utils/pdfGenerator.js
const puppeteer = require('puppeteer');

class PDFGenerator {
  constructor() {
    this.browser = null;
  }

  async getBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
    return this.browser;
  }

  async generateLedgerPDF(htmlContent, filename = 'ledger-report.pdf') {
    let browser = null;
    try {
      browser = await this.getBrowser();
      const page = await browser.newPage();
      
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0'
      });
      
      await page.setViewport({
        width: 1200,
        height: 800,
        deviceScaleFactor: 1
      });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '7mm',
          bottom: '20mm',
          left: '15mm',
          right: '15mm'
        },
        preferCSSPageSize: false,
        displayHeaderFooter: true,
        headerTemplate: `
          
        `,
        footerTemplate: `
          <div style="font-size: 8px; text-align: center; width: 100%; padding: 5px;">
            <span style="color: #666;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
          </div>
        `
      });
      
      return pdfBuffer;
    } catch (error) {
      console.error('PDF Generation Error:', error);
      throw error;
    }
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

module.exports = new PDFGenerator();
// utils/receiptGenerator.js
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

class ReceiptGenerator {
  constructor() {
    this.browser = null;
  }

  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
    return this.browser;
  }

  async imageToBase64(imagePath) {
    try {
      const possiblePaths = [
        imagePath,
        path.join(__dirname, '..', imagePath),
        path.join(process.cwd(), imagePath),
        path.join(process.cwd(), 'public', imagePath),
        path.join(process.cwd(), 'uploads', path.basename(imagePath)),
      ];

      for (const fullPath of possiblePaths) {
        if (fs.existsSync(fullPath)) {
          const imageBuffer = fs.readFileSync(fullPath);
          const mimeType = this.getMimeType(fullPath);
          return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
        }
      }
      return null;
    } catch (error) {
      console.error('Error converting logo to base64:', error);
      return null;
    }
  }

  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml'
    };
    return mimeTypes[ext] || 'image/png';
  }

  async generateReceiptHTML(receipt, settings) {
    const paymentDate = new Date(receipt.payment_date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    const createdDate = new Date(receipt.created_at).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const siteName = settings?.site_name?.value || 'ROOMAC';
    const siteTagline = settings?.site_tagline?.value || 'Premium Living Spaces';
    const contactAddress = settings?.contact_address?.value || '';
    const contactPhone = settings?.contact_phone?.value || '';
    const contactEmail = settings?.contact_email?.value || '';
    const logoPath = settings?.logo_header?.value;

    let logoBase64 = null;
    if (logoPath) {
      logoBase64 = await this.imageToBase64(logoPath);
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Payment Receipt - ${siteName}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #eef2f5;
            padding: 40px 20px;
            font-size: 12px;
          }
          
          .receipt {
            max-width: 820px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.08);
            overflow: hidden;
          }
          
          /* Header - White background with subtle border */
          .receipt-header {
            background: #ffffff;
            padding: 24px 32px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #e8ecef;
          }
          
          .logo-area {
            display: flex;
            align-items: center;
            gap: 16px;
          }
          
          .logo-img {
            width: 56px;
            height: 56px;
            object-fit: contain;
            border-radius: 12px;
          }
          
          .logo-placeholder {
            width: 56px;
            height: 56px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: 700;
            color: #ffffff;
          }
          
          .company-text h1 {
            font-size: 22px;
            font-weight: 700;
            color: #1a2a3a;
            margin-bottom: 4px;
            letter-spacing: -0.3px;
          }
          
          .company-text p {
            font-size: 11px;
            color: #6c7a8a;
          }
          
          .receipt-label {
            background: #f0fdf4;
            padding: 6px 18px;
            border-radius: 30px;
            font-size: 11px;
            font-weight: 600;
            color: #059669;
            letter-spacing: 0.5px;
            border: 1px solid #d1fae5;
          }
          
          /* Content */
          .receipt-body {
            padding: 28px 32px;
          }
          
          /* Title Section */
          .title-section {
            margin-bottom: 28px;
          }
          
          .title-section h2 {
            font-size: 20px;
            font-weight: 700;
            color: #1a2a3a;
            margin-bottom: 4px;
          }
          
          .title-section p {
            font-size: 11px;
            color: #6c7a8a;
          }
          
          .receipt-number {
            display: inline-block;
            background: #f1f5f9;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 500;
            color: #475569;
            margin-top: 8px;
          }
          
          /* Divider */
          .divider {
            height: 1px;
            background: linear-gradient(90deg, #e2e8f0, #cbd5e1, #e2e8f0);
            margin: 20px 0;
          }
          
          /* Info Grid - 3 columns */
          .info-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 28px;
          }
          
          .info-card {
            background: #f8fafc;
            border-radius: 12px;
            padding: 16px;
            border: 1px solid #eef2f6;
          }
          
          .card-title {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #64748b;
            margin-bottom: 14px;
            padding-bottom: 8px;
            border-bottom: 1.5px solid #e2e8f0;
          }
          
          .info-item {
            margin-bottom: 10px;
          }
          
          .info-item:last-child {
            margin-bottom: 0;
          }
          
          .info-label {
            font-size: 10px;
            color: #64748b;
            display: block;
            margin-bottom: 2px;
          }
          
          .info-value {
            font-size: 12px;
            font-weight: 600;
            color: #1e293b;
          }
          
          /* Amount Section */
          .amount-section {
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border-radius: 12px;
            padding: 20px 24px;
            text-align: center;
            margin-bottom: 28px;
            border: 1px solid #eef2f6;
          }
          
          .amount-label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: #64748b;
            font-weight: 500;
            margin-bottom: 8px;
          }
          
          .amount-value {
            font-size: 44px;
            font-weight: 800;
            color: #1a2a3a;
            line-height: 1;
            letter-spacing: -1px;
          }
          
          .amount-currency {
            font-size: 24px;
            font-weight: 600;
            color: #64748b;
            margin-right: 4px;
          }
          
          .amount-words {
            font-size: 10px;
            color: #6c7a8a;
            margin-top: 8px;
          }
          
          /* Payment Summary */
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            margin-bottom: 20px;
          }
          
          .summary-card {
            background: #f8fafc;
            border-radius: 10px;
            padding: 14px 16px;
            border: 1px solid #eef2f6;
          }
          
          .summary-label {
            font-size: 10px;
            font-weight: 500;
            color: #64748b;
            margin-bottom: 6px;
          }
          
          .summary-value {
            font-size: 16px;
            font-weight: 700;
            color: #1a2a3a;
          }
          
          .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: #ecfdf5;
            color: #059669;
            padding: 4px 14px;
            border-radius: 30px;
            font-size: 11px;
            font-weight: 600;
          }
          
          /* Remark */
          .remark-box {
            background: #fffbeb;
            border-left: 3px solid #f59e0b;
            padding: 12px 16px;
            border-radius: 8px;
            margin-top: 20px;
          }
          
          .remark-box p {
            font-size: 11px;
            color: #92400e;
          }
          
          /* Footer */
          .receipt-footer {
            background: #fafcfc;
            border-top: 1px solid #eef2f6;
            padding: 20px 32px;
            text-align: center;
          }
          
          .footer-address {
            font-size: 10px;
            color: #6c7a8a;
            line-height: 1.5;
            margin-bottom: 16px;
          }
          
          .signature-section {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: 16px;
            border-top: 1px dashed #cbd5e1;
          }
          
          .signature-item {
            text-align: center;
            flex: 1;
          }
          
          .signature-line {
            width: 160px;
            height: 1px;
            background: #4a5568;
            margin: 0 auto 6px;
          }
          
          .signature-text {
            font-size: 9px;
            color: #94a3b8;
          }
          
          .footer-note {
            font-size: 9px;
            color: #94a3b8;
            margin-top: 16px;
          }
          
          @media print {
            body {
              background: white;
              padding: 0;
            }
            .receipt {
              box-shadow: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <!-- Header -->
          <div class="receipt-header">
            <div class="logo-area">
              ${logoBase64 ? 
                `<img src="${logoBase64}" alt="${siteName} Logo" class="logo-img">` : 
                `<div class="logo-placeholder">${siteName.charAt(0)}</div>`
              }
              <div class="company-text">
                <h1>${this.escapeHtml(siteName)}</h1>
                <p>${this.escapeHtml(siteTagline)}</p>
              </div>
            </div>
            <div class="receipt-label">PAYMENT RECEIPT</div>
          </div>
          
          <!-- Body -->
          <div class="receipt-body">
            <!-- Title -->
            <div class="title-section">
              <h2>Payment Confirmation</h2>
              <p>Thank you for your payment</p>
              <div class="receipt-number">Receipt #${receipt.id.toString().padStart(6, '0')}</div>
            </div>
            
            <!-- Divider -->
            <div class="divider"></div>
            
            <!-- Info Grid -->
            <div class="info-grid">
              <!-- Tenant Card -->
              <div class="info-card">
                <div class="card-title">TENANT DETAILS</div>
                <div class="info-item">
                  <span class="info-label">Full Name</span>
                  <span class="info-value">${this.escapeHtml(receipt.tenant_name || 'N/A')}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Mobile Number</span>
                  <span class="info-value">${this.escapeHtml(receipt.tenant_phone || 'N/A')}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Email Address</span>
                  <span class="info-value" style="font-size: 10px;">${this.escapeHtml(receipt.tenant_email || 'N/A')}</span>
                </div>
              </div>
              
              <!-- Payment Card -->
              <div class="info-card">
                <div class="card-title">PAYMENT DETAILS</div>
                <div class="info-item">
                  <span class="info-label">Transaction Date</span>
                  <span class="info-value">${paymentDate}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Payment Mode</span>
                  <span class="info-value">${(receipt.payment_mode || 'N/A').toUpperCase()}</span>
                </div>
                ${receipt.bank_name ? `
                <div class="info-item">
                  <span class="info-label">Bank Name</span>
                  <span class="info-value">${this.escapeHtml(receipt.bank_name)}</span>
                </div>
                ` : ''}
                ${receipt.transaction_id ? `
                <div class="info-item">
                  <span class="info-label">Transaction ID</span>
                  <span class="info-value" style="font-size: 9px;">${this.escapeHtml(receipt.transaction_id)}</span>
                </div>
                ` : ''}
              </div>
              
              <!-- Property Card -->
              <div class="info-card">
                <div class="card-title">PROPERTY DETAILS</div>
                <div class="info-item">
                  <span class="info-label">Property Name</span>
                  <span class="info-value">${this.escapeHtml(receipt.property_name || 'N/A')}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Unit / Room</span>
                  <span class="info-value">${receipt.room_number || 'N/A'}${receipt.bed_number ? ` | Bed ${receipt.bed_number}` : ''}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Billing Period</span>
                  <span class="info-value">${receipt.month || ''} ${receipt.year || ''}</span>
                </div>
              </div>
            </div>
            
            <!-- Amount Section -->
            <div class="amount-section">
              <div class="amount-label">TOTAL AMOUNT PAID</div>
              <div class="amount-value">
                <span class="amount-currency">₹</span>${parseFloat(receipt.amount).toLocaleString('en-IN')}
              </div>
              <div class="amount-words">${this.numberToWords(parseFloat(receipt.amount))} Rupees Only</div>
            </div>
            
            <!-- Summary Grid -->
            <div class="summary-grid">
              <div class="summary-card">
                <div class="summary-label">Payment Status</div>
                <div class="summary-value">
                  <span class="status-badge">✓ Completed</span>
                </div>
              </div>
              <div class="summary-card">
                <div class="summary-label">Payment For</div>
                <div class="summary-value">${receipt.payment_type === 'rent' ? 'Rent Payment' : 'Security Deposit'}</div>
              </div>
            </div>
            
            <!-- Remark -->
            ${receipt.remark ? `
            <div class="remark-box">
              <p><strong>Remark:</strong> ${this.escapeHtml(receipt.remark)}</p>
            </div>
            ` : ''}
          </div>
          
          <!-- Footer -->
          <div class="receipt-footer">
            <div class="footer-address">
              ${this.escapeHtml(contactAddress)}<br>
              Tel: ${this.escapeHtml(contactPhone)} | Email: ${this.escapeHtml(contactEmail)}
            </div>
            <div class="signature-section">
              <div class="signature-item">
                <div class="signature-line"></div>
                <div class="signature-text">Authorized Signatory</div>
              </div>
              <div class="signature-item">
                <div class="signature-line"></div>
                <div class="signature-text">For ${this.escapeHtml(siteName)}</div>
              </div>
            </div>
            <div class="footer-note">
              This is a computer generated receipt. No signature required.<br>
              Generated on: ${createdDate}
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async generateReceiptPDF(receipt, settings) {
    try {
      const browser = await this.initBrowser();
      const page = await browser.newPage();
      
      const html = await this.generateReceiptHTML(receipt, settings);
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '15mm',
          bottom: '15mm',
          left: '15mm',
          right: '15mm'
        }
      });
      
      return pdfBuffer;
    } catch (error) {
      console.error('Error generating receipt PDF:', error);
      throw error;
    }
  }

  numberToWords(num) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    if (num === 0) return 'Zero';

    const numToWords = (n) => {
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
      if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + numToWords(n % 100) : '');
      if (n < 100000) return numToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + numToWords(n % 1000) : '');
      if (n < 10000000) return numToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + numToWords(n % 100000) : '');
      return numToWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + numToWords(n % 10000000) : '');
    };

    const rupees = Math.floor(num);
    const paise = Math.round((num - rupees) * 100);

    let result = numToWords(rupees);
    if (paise > 0) {
      result += ' and ' + numToWords(paise) + ' Paise';
    }

    return result;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

module.exports = new ReceiptGenerator();
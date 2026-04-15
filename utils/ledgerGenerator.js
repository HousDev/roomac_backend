// utils/ledgerGenerator.js

const generateLedgerHTML = (data) => {
  const {
    tenant,
    payments,
    siteName,
    siteTagline,
    contactAddress,
    contactPhone,
    contactEmail,
    companyLogo,
    summary
  } = data;

  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return '₹0';
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      approved: 'bg-green-100 text-green-800',
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      rejected: 'bg-red-100 text-red-800',
      partial: 'bg-blue-100 text-blue-800'
    };
    const colorClass = statusMap[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
    return `<span class="status-badge ${colorClass}">${status}</span>`;
  };

  // Group payments by month for rent summary
  const monthlyRentSummary = payments
    .filter(p => p.payment_type === 'rent')
    .reduce((acc, p) => {
      const key = `${p.month} ${p.year}`;
      if (!acc[key]) {
        acc[key] = {
          month: p.month,
          year: p.year,
          totalRent: tenant.monthly_rent || 0,
          totalPaid: 0,
          totalPending: 0,
          payments: []
        };
      }
      const amount = parseFloat(p.amount);
      if (p.status === 'approved' || p.status === 'paid') {
        acc[key].totalPaid += amount;
      }
      if (p.status === 'pending') {
        acc[key].totalPending += amount;
      }
      acc[key].payments.push(p);
      return acc;
    }, {});

  // Calculate overall statistics
  const totalRentExpected = Object.values(monthlyRentSummary).reduce(
    (sum, m) => sum + m.totalRent, 0
  );
  const totalRentPaid = Object.values(monthlyRentSummary).reduce(
    (sum, m) => sum + m.totalPaid, 0
  );
  const totalRentPending = totalRentExpected - totalRentPaid;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Payment Ledger - ${tenant.name}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: white;
      padding: 20px;
      font-size: 12px;
    }
    
    .report-container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
    }
    
    /* Header Styles */
    .header {
      text-align: center;
      border-bottom: 2px solid #004aad;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    
    .logo {
      max-height: 60px;
      margin-bottom: 10px;
    }
    
    .company-name {
      font-size: 24px;
      font-weight: bold;
      color: #004aad;
    }
    
    .tagline {
      font-size: 12px;
      color: #666;
      margin-top: 5px;
    }
    
    .contact-info {
      font-size: 10px;
      color: #999;
      margin-top: 8px;
    }
    
    .report-title {
      font-size: 16px;
      font-weight: bold;
      color: #004aad;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid #eee;
    }
    
    /* Info Grid */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      background: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    
    .info-item {
      display: flex;
      flex-direction: column;
    }
    
    .info-label {
      font-size: 10px;
      color: #666;
      margin-bottom: 4px;
    }
    
    .info-value {
      font-size: 13px;
      font-weight: 600;
      color: #333;
    }
    
    /* Summary Cards */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 12px;
      margin-bottom: 25px;
    }
    
    .summary-card {
      padding: 12px;
      border-radius: 8px;
      text-align: center;
    }
    
    .summary-card.blue { background: #e6f0ff; }
    .summary-card.yellow { background: #fff9e6; }
    .summary-card.red { background: #fee; }
    .summary-card.green { background: #e6ffe6; }
    .summary-card.purple { background: #f3e8ff; }
    
    .summary-label {
      font-size: 10px;
      color: #666;
      margin-bottom: 5px;
    }
    
    .summary-value {
      font-size: 18px;
      font-weight: bold;
    }
    
    .summary-card.blue .summary-value { color: #004aad; }
    .summary-card.yellow .summary-value { color: #d4a000; }
    .summary-card.red .summary-value { color: #dc3545; }
    .summary-card.green .summary-value { color: #28a745; }
    .summary-card.purple .summary-value { color: #6f42c1; }
    
    /* Section Titles */
    .section-title {
      font-size: 14px;
      font-weight: bold;
      color: #004aad;
      margin-bottom: 12px;
      padding-bottom: 5px;
      border-bottom: 2px solid #004aad;
    }
    
    /* Table Styles */
    .table-container {
      overflow-x: auto;
      margin-bottom: 25px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    
    th {
      background: #f1f3f5;
      padding: 10px 8px;
      text-align: left;
      font-weight: 600;
      border: 1px solid #dee2e6;
    }
    
    td {
      padding: 8px;
      border: 1px solid #dee2e6;
    }
    
    tr:nth-child(even) {
      background: #fafbfc;
    }
    
    .text-right {
      text-align: right;
    }
    
    .text-center {
      text-align: center;
    }
    
    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 500;
    }
    
    .bg-green-100 { background: #d4edda; color: #155724; }
    .bg-yellow-100 { background: #fff3cd; color: #856404; }
    .bg-red-100 { background: #f8d7da; color: #721c24; }
    .bg-blue-100 { background: #d1ecf1; color: #0c5460; }
    .bg-gray-100 { background: #e2e3e5; color: #383d41; }
    
    /* Footer */
    .footer {
      text-align: center;
      padding-top: 20px;
      margin-top: 20px;
      border-top: 1px solid #dee2e6;
      font-size: 9px;
      color: #999;
    }
    
    @media print {
      body {
        padding: 0;
        margin: 0;
      }
      .report-container {
        padding: 0;
      }
      table {
        page-break-inside: avoid;
      }
      tr {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <!-- Header -->
    <div class="header">
      ${companyLogo ? `<img src="${companyLogo}" class="logo" alt="Logo">` : ''}
      <div class="company-name">${siteName}</div>
      <div class="tagline">${siteTagline}</div>
      <div class="contact-info">${contactAddress} | Tel: ${contactPhone} | Email: ${contactEmail}</div>
      <div class="report-title">Payment Ledger Report</div>
    </div>
    
    <!-- Tenant Information -->
    <div class="info-grid">
      <div class="info-item">
        <span class="info-label">Tenant Name</span>
        <span class="info-value">${tenant.salutation} ${tenant.name}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Phone</span>
        <span class="info-value">${tenant.country_code} ${tenant.phone}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Email</span>
        <span class="info-value">${tenant.email}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Check-in Date</span>
        <span class="info-value">${formatDate(tenant.check_in_date)}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Property</span>
        <span class="info-value">${tenant.property_name || 'N/A'}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Room / Bed</span>
        <span class="info-value">Room ${tenant.room_number || 'N/A'}${tenant.bed_number ? ` • Bed #${tenant.bed_number}` : ''}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Monthly Rent</span>
        <span class="info-value">${formatCurrency(tenant.monthly_rent)}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Security Deposit</span>
        <span class="info-value">${formatCurrency(tenant.security_deposit)}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Months Since Joining</span>
        <span class="info-value">${tenant.months_since_joining || 0} month(s)</span>
      </div>
    </div>
    
    <!-- Summary Cards -->
    <div class="summary-grid">
      <div class="summary-card blue">
        <div class="summary-label">Total Rent Expected</div>
        <div class="summary-value">${formatCurrency(totalRentExpected)}</div>
      </div>
      <div class="summary-card green">
        <div class="summary-label">Total Rent Paid</div>
        <div class="summary-value">${formatCurrency(totalRentPaid)}</div>
      </div>
      <div class="summary-card yellow">
        <div class="summary-label">Total Rent Pending</div>
        <div class="summary-value">${formatCurrency(totalRentPending)}</div>
      </div>
      <div class="summary-card purple">
        <div class="summary-label">Deposit Paid</div>
        <div class="summary-value">${formatCurrency(summary.totalDepositPaid)}</div>
      </div>
      <div class="summary-card red">
        <div class="summary-label">Deposit Pending</div>
        <div class="summary-value">${formatCurrency(summary.depositPending)}</div>
      </div>
    </div>
    
    <!-- Rent Summary by Month (Like Payment Form) -->
    <div class="section-title">Monthly Rent Summary</div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Month</th>
            <th class="text-right">Rent (₹)</th>
            <th class="text-right">Paid (₹)</th>
            <th class="text-right">Pending (₹)</th>
            <th class="text-center">Status</th>
           </tr>
        </thead>
        <tbody>
          ${Object.values(monthlyRentSummary)
            .sort((a, b) => {
              const dateA = new Date(`${a.month} 1, ${a.year}`);
              const dateB = new Date(`${b.month} 1, ${b.year}`);
              return dateB.getTime() - dateA.getTime();
            })
            .map((month) => {
              let status = "Pending";
              let statusColor = "bg-red-100 text-red-800";
              if (month.totalPaid >= month.totalRent && month.totalRent > 0) {
                status = "Paid";
                statusColor = "bg-green-100 text-green-800";
              } else if (month.totalPaid > 0) {
                status = "Partial";
                statusColor = "bg-yellow-100 text-yellow-800";
              }
              return `
                <tr>
                  <td class="font-medium">${month.month} ${month.year}</td>
                  <td class="text-right">${formatCurrency(month.totalRent)}</td>
                  <td class="text-right text-green-600">${formatCurrency(month.totalPaid)}</td>
                  <td class="text-right text-amber-600">${formatCurrency(month.totalRent - month.totalPaid)}</td>
                  <td class="text-center"><span class="status-badge ${statusColor}">${status}</span></td>
                </tr>
              `;
            }).join('')}
        </tbody>
        <tfoot>
          <tr class="bg-slate-100 font-semibold">
            <td class="text-right">Total</td>
            <td class="text-right">${formatCurrency(totalRentExpected)}</td>
            <td class="text-right text-green-600">${formatCurrency(totalRentPaid)}</td>
            <td class="text-right text-amber-600">${formatCurrency(totalRentPending)}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
    
    <!-- All Payment History -->
    <div class="section-title">Payment History</div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Period</th>
            <th>Payment Mode</th>
            <th>Transaction ID</th>
            <th class="text-right">Amount (₹)</th>
            <th>Status</th>
            <th>Remark</th>
          </tr>
        </thead>
        <tbody>
          ${payments.length === 0 ? `
            <tr>
              <td colspan="8" class="text-center">No payment records found</td>
            </tr>
          ` : payments.map(payment => `
            <tr>
              <td>${formatDate(payment.payment_date)}</td>
              <td>${payment.payment_type === 'rent' ? 'Rent' : 'Security Deposit'}</td>
              <td>${payment.month && payment.year ? `${payment.month} ${payment.year}` : '-'}</td>
              <td>
                ${payment.payment_mode}
                ${payment.bank_name ? `<br><small>${payment.bank_name}</small>` : ''}
              </td>
              <td class="font-mono">${payment.transaction_id || '-'}</td>
              <td class="text-right font-medium">${formatCurrency(payment.amount)}</td>
              <td>${getStatusBadge(payment.status)}</td>
              <td class="max-w-[200px] truncate">${payment.remark || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr class="bg-slate-100 font-semibold">
            <td colspan="5" class="text-right">Total</td>
            <td class="text-right">${formatCurrency(summary.grandTotal)}</td>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      </table>
    </div>
    
    <!-- Security Deposit Summary -->
    <div class="section-title">Security Deposit Summary</div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Total Deposit</th>
            <th>Paid</th>
            <th>Pending</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="font-bold">${formatCurrency(tenant.security_deposit)}</td>
            <td class="text-green-600">${formatCurrency(summary.totalDepositPaid)}</td>
            <td class="text-amber-600">${formatCurrency(summary.depositPending)}</td>
            <td>
              ${summary.depositPending === 0 ? 
                '<span class="status-badge bg-green-100 text-green-800">Fully Paid</span>' : 
                '<span class="status-badge bg-yellow-100 text-yellow-800">Pending</span>'}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <p>This is a computer generated report. No signature required.</p>
      <p>Generated on: ${new Date().toLocaleString()}</p>
      <p>For any queries, please contact us at ${contactPhone}</p>
    </div>
  </div>
</body>
</html>`;
};

module.exports = { generateLedgerHTML };
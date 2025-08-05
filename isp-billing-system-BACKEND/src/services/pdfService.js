const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

class PDFService {
  constructor() {
    this.companyInfo = {
      name: 'Kenya ISP Solutions Ltd',
      address: '123 Uhuru Highway, Nairobi, Kenya',
      phone: '+254 700 123 456',
      email: 'billing@kenyaisp.co.ke',
      website: 'www.kenyaisp.co.ke',
      taxNumber: 'P051234567A'
    };
  }

  /**
   * Generate PDF invoice
   */
  async generateInvoicePDF(invoice, outputPath) {
    return new Promise((resolve, reject) => {
      try {
        // Create PDF document
        const doc = new PDFDocument({ margin: 50 });
        
        // Pipe to file
        const stream = fs.createWriteStream(outputPath);
        doc.pipe(stream);

        // Add content
        this.addHeader(doc);
        this.addCompanyInfo(doc);
        this.addInvoiceInfo(doc, invoice);
        this.addCustomerInfo(doc, invoice);
        this.addInvoiceItems(doc, invoice);
        this.addTotals(doc, invoice);
        this.addFooter(doc);

        // Finalize PDF
        doc.end();

        stream.on('finish', () => {
          resolve(outputPath);
        });

        stream.on('error', (error) => {
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Add header to PDF
   */
  addHeader(doc) {
    doc.fontSize(24)
       .fillColor('#2c3e50')
       .text('INVOICE', 50, 50, { align: 'center' });
    
    doc.moveTo(50, 85)
       .lineTo(550, 85)
       .strokeColor('#3498db')
       .lineWidth(2)
       .stroke();
  }

  /**
   * Add company information
   */
  addCompanyInfo(doc) {
    const startY = 110;
    
    doc.fontSize(16)
       .fillColor('#2c3e50')
       .text(this.companyInfo.name, 50, startY, { width: 250 });
    
    doc.fontSize(10)
       .fillColor('#7f8c8d')
       .text(this.companyInfo.address, 50, startY + 25, { width: 250 })
       .text(`Phone: ${this.companyInfo.phone}`, 50, startY + 40)
       .text(`Email: ${this.companyInfo.email}`, 50, startY + 55)
       .text(`Website: ${this.companyInfo.website}`, 50, startY + 70)
       .text(`Tax Number: ${this.companyInfo.taxNumber}`, 50, startY + 85);
  }

  /**
   * Add invoice information
   */
  addInvoiceInfo(doc, invoice) {
    const startY = 110;
    const rightX = 350;
    
    doc.fontSize(12)
       .fillColor('#2c3e50')
       .text('Invoice Details', rightX, startY, { width: 200 });
    
    doc.fontSize(10)
       .fillColor('#7f8c8d')
       .text(`Invoice Number: ${invoice.invoiceNumber}`, rightX, startY + 20)
       .text(`Issue Date: ${moment(invoice.issueDate).format('DD/MM/YYYY')}`, rightX, startY + 35)
       .text(`Due Date: ${moment(invoice.dueDate).format('DD/MM/YYYY')}`, rightX, startY + 50)
       .text(`Status: ${invoice.status.toUpperCase()}`, rightX, startY + 65)
       .text(`Currency: ${invoice.currency}`, rightX, startY + 80);
    
    // Billing period
    doc.text(`Billing Period:`, rightX, startY + 100)
       .text(`${moment(invoice.billingPeriodStart).format('DD/MM/YYYY')} - ${moment(invoice.billingPeriodEnd).format('DD/MM/YYYY')}`, rightX, startY + 115);
  }

  /**
   * Add customer information
   */
  addCustomerInfo(doc, invoice) {
    const startY = 260;
    
    doc.fontSize(12)
       .fillColor('#2c3e50')
       .text('Bill To:', 50, startY);
    
    doc.fontSize(10)
       .fillColor('#7f8c8d')
       .text(`${invoice.User.firstName} ${invoice.User.lastName}`, 50, startY + 20)
       .text(`Email: ${invoice.User.email}`, 50, startY + 35)
       .text(`Phone: ${invoice.User.phoneNumber}`, 50, startY + 50);
    
    if (invoice.User.address) {
      doc.text(`Address: ${invoice.User.address}`, 50, startY + 65);
    }
    
    if (invoice.User.city && invoice.User.county) {
      doc.text(`${invoice.User.city}, ${invoice.User.county}`, 50, startY + 80);
    }
    
    // Subscription info
    if (invoice.Subscription && invoice.Subscription.DataPlan) {
      doc.fontSize(12)
         .fillColor('#2c3e50')
         .text('Subscription Details:', 350, startY);
      
      doc.fontSize(10)
         .fillColor('#7f8c8d')
         .text(`Plan: ${invoice.Subscription.DataPlan.name}`, 350, startY + 20)
         .text(`Subscription: ${invoice.Subscription.subscriptionNumber}`, 350, startY + 35)
         .text(`Data Limit: ${this.formatDataLimit(invoice.Subscription.DataPlan.dataLimit)}`, 350, startY + 50)
         .text(`Speed: ${invoice.Subscription.DataPlan.speed}`, 350, startY + 65);
    }
  }

  /**
   * Add invoice items table
   */
  addInvoiceItems(doc, invoice) {
    const startY = 380;
    const tableTop = startY;
    
    // Table header
    doc.fontSize(12)
       .fillColor('#2c3e50')
       .text('Description', 50, tableTop)
       .text('Qty', 300, tableTop)
       .text('Unit Price', 350, tableTop)
       .text('Total', 450, tableTop);
    
    // Header line
    doc.moveTo(50, tableTop + 20)
       .lineTo(550, tableTop + 20)
       .strokeColor('#bdc3c7')
       .lineWidth(1)
       .stroke();
    
    let currentY = tableTop + 35;
    
    // Add items
    if (invoice.items && invoice.items.length > 0) {
      invoice.items.forEach((item, index) => {
        doc.fontSize(10)
           .fillColor('#2c3e50')
           .text(item.description, 50, currentY, { width: 240 })
           .text(parseFloat(item.quantity).toFixed(2), 300, currentY)
           .text(`KES ${parseFloat(item.unitPrice).toFixed(2)}`, 350, currentY)
           .text(`KES ${parseFloat(item.totalPrice).toFixed(2)}`, 450, currentY);
        
        // Add period if available
        if (item.periodStart && item.periodEnd) {
          currentY += 15;
          doc.fontSize(8)
             .fillColor('#7f8c8d')
             .text(`Period: ${moment(item.periodStart).format('DD/MM/YYYY')} - ${moment(item.periodEnd).format('DD/MM/YYYY')}`, 50, currentY);
        }
        
        currentY += 25;
        
        // Add separator line
        if (index < invoice.items.length - 1) {
          doc.moveTo(50, currentY - 10)
             .lineTo(550, currentY - 10)
             .strokeColor('#ecf0f1')
             .lineWidth(0.5)
             .stroke();
        }
      });
    }
    
    return currentY;
  }

  /**
   * Add totals section
   */
  addTotals(doc, invoice) {
    const startY = 500;
    const rightX = 400;
    
    doc.fontSize(10)
       .fillColor('#2c3e50');
    
    let currentY = startY;
    
    // Subtotal
    doc.text('Subtotal:', rightX, currentY)
       .text(`KES ${parseFloat(invoice.subtotal).toFixed(2)}`, rightX + 100, currentY);
    currentY += 20;
    
    // Discount (if any)
    if (parseFloat(invoice.discountAmount) > 0) {
      doc.text('Discount:', rightX, currentY)
         .text(`-KES ${parseFloat(invoice.discountAmount).toFixed(2)}`, rightX + 100, currentY);
      currentY += 20;
    }
    
    // Tax
    if (parseFloat(invoice.taxAmount) > 0) {
      doc.text('VAT (16%):', rightX, currentY)
         .text(`KES ${parseFloat(invoice.taxAmount).toFixed(2)}`, rightX + 100, currentY);
      currentY += 20;
    }
    
    // Total line
    doc.moveTo(rightX, currentY + 5)
       .lineTo(550, currentY + 5)
       .strokeColor('#2c3e50')
       .lineWidth(1)
       .stroke();
    
    currentY += 15;
    
    // Total amount
    doc.fontSize(14)
       .fillColor('#2c3e50')
       .text('Total Amount:', rightX, currentY)
       .text(`KES ${parseFloat(invoice.totalAmount).toFixed(2)}`, rightX + 100, currentY);
    
    // Payment status
    currentY += 30;
    doc.fontSize(10)
       .fillColor('#7f8c8d')
       .text(`Payment Status: ${invoice.paymentStatus.toUpperCase()}`, rightX, currentY);
    
    if (parseFloat(invoice.paidAmount) > 0) {
      currentY += 15;
      doc.text(`Paid Amount: KES ${parseFloat(invoice.paidAmount).toFixed(2)}`, rightX, currentY);
      
      const remainingAmount = parseFloat(invoice.totalAmount) - parseFloat(invoice.paidAmount);
      if (remainingAmount > 0) {
        currentY += 15;
        doc.text(`Remaining: KES ${remainingAmount.toFixed(2)}`, rightX, currentY);
      }
    }
  }

  /**
   * Add footer
   */
  addFooter(doc) {
    const footerY = 700;
    
    // Footer line
    doc.moveTo(50, footerY)
       .lineTo(550, footerY)
       .strokeColor('#bdc3c7')
       .lineWidth(1)
       .stroke();
    
    doc.fontSize(8)
       .fillColor('#7f8c8d')
       .text('Payment Terms: Payment is due within 30 days of invoice date.', 50, footerY + 15)
       .text('Late payments may incur additional charges.', 50, footerY + 30)
       .text('For support, contact us at billing@kenyaisp.co.ke or +254 700 123 456', 50, footerY + 45)
       .text(`Generated on ${moment().format('DD/MM/YYYY HH:mm')}`, 50, footerY + 65);
    
    // Company footer
    doc.text('Thank you for choosing Kenya ISP Solutions!', 50, footerY + 85, { align: 'center' });
  }

  /**
   * Format data limit for display
   */
  formatDataLimit(limitMB) {
    if (limitMB >= 1024) {
      return `${(limitMB / 1024).toFixed(1)} GB`;
    }
    return `${limitMB} MB`;
  }

  /**
   * Ensure PDF directory exists
   */
  ensurePDFDirectory() {
    const pdfDir = path.join(process.cwd(), 'storage', 'invoices');
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }
    return pdfDir;
  }

  /**
   * Generate PDF file path
   */
  generatePDFPath(invoiceNumber) {
    const pdfDir = this.ensurePDFDirectory();
    const fileName = `invoice_${invoiceNumber}_${Date.now()}.pdf`;
    return path.join(pdfDir, fileName);
  }
}

module.exports = new PDFService();


import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Order } from '../types';

export function generateQuotePDF(order: Order) {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text('TEKLIF FORMU', 150, 20);

    doc.setFontSize(10);
    doc.text('Symi Satış & Üretim', 14, 20);
    doc.text('İstanbul, Türkiye', 14, 25);
    doc.text('Tel: +90 212 123 45 67', 14, 30);

    // Customer Info
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Sayın:', 14, 45);
    doc.setFontSize(11);
    doc.text(order.customerName, 14, 52);

    // Order Details
    doc.setFontSize(10);
    doc.text(`Tarih: ${new Date(order.createdAt).toLocaleDateString()}`, 150, 45);
    doc.text(`Teklif No: #${order.id.slice(0, 8)}`, 150, 50);

    // Table
    const tableColumn = ["Ürün", "Açıklama", "Adet", "Birim Fiyat", "KDV", "Tutar"];
    const tableRows = order.items.map(item => [
        item.productName.split(' - ')[0],
        item.productName.split(' - ')[1] || '',
        item.quantity,
        `${item.unitPrice.toFixed(2)} ${order.currency}`,
        `%${item.vatRate}`,
        `${item.total.toFixed(2)} ${order.currency}`
    ]);

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 60,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] }, // Indigo-600
    });

    // Totals
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.text(`Ara Toplam: ${order.subtotal.toFixed(2)} ${order.currency}`, 140, finalY);
    doc.text(`KDV Toplam: ${order.vatTotal.toFixed(2)} ${order.currency}`, 140, finalY + 7);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`GENEL TOPLAM: ${order.grandTotal.toFixed(2)} ${order.currency}`, 140, finalY + 15);

    doc.save(`teklif_${order.customerName}_${order.id.slice(0, 6)}.pdf`);
}

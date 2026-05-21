import React, { useState } from 'react';
import jsPDF from 'jspdf';

interface BillData {
    metalType: 'gold' | 'silver';
    purity: string;
    purityLabel: string;
    weight: number;
    pricePerGram: number;
    purityValue: number;
    wastageValue: number;
    wastageInGrams: number;
    wastagePercent: number;
    total: number;
    effectiveRate: number;
    pureWeight: number;
}

interface BillGeneratorProps {
    isOpen: boolean;
    onClose: () => void;
    billData: BillData;
}

const formatCurrency = (num: number) => num.toLocaleString("en-IN", {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const formatCurrencyPlain = (num: number) => {
    const formatted = num.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    return `Rs. ${formatted}`;
};

const generateBillNumber = () => {
    const now = new Date();
    const dateStr = now.getFullYear().toString() +
        (now.getMonth() + 1).toString().padStart(2, '0') +
        now.getDate().toString().padStart(2, '0');
    const seq = Math.floor(Math.random() * 9000) + 1000;
    return `NLJ-${dateStr}-${seq}`;
};

const formatDate = () => {
    const now = new Date();
    return now.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
};

const BillGenerator: React.FC<BillGeneratorProps> = ({ isOpen, onClose, billData }) => {
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [itemDescription, setItemDescription] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    if (!isOpen) return null;

    const generatePDF = async (action: 'download' | 'share') => {
        setIsGenerating(true);

        try {
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
            });

            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 15;
            const contentWidth = pageWidth - margin * 2;
            let y = 0;

            // ===== HEADER BAR =====
            doc.setFillColor(128, 0, 0); // Maroon
            doc.rect(0, 0, pageWidth, 38, 'F');

            // Gold accent line
            doc.setFillColor(212, 175, 55); // Gold
            doc.rect(0, 38, pageWidth, 1.5, 'F');

            // Shop name
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(28);
            doc.setTextColor(212, 175, 55); // Gold text
            doc.text('NL JEWELLERS', pageWidth / 2, 18, { align: 'center' });

            // Subtitle
            doc.setFontSize(11);
            doc.setTextColor(255, 248, 231); // Ivory
            const subtitle = billData.metalType === 'gold' ? 'Gold Jewellery' : 'Silver Jewellery';
            doc.text(subtitle, pageWidth / 2, 27, { align: 'center' });

            // "ESTIMATE" label
            doc.setFontSize(9);
            doc.setTextColor(212, 175, 55);
            doc.text('ESTIMATE', pageWidth / 2, 34, { align: 'center' });

            y = 47;

            // ===== BILL INFO ROW =====
            doc.setFillColor(252, 249, 240); // Light ivory bg
            doc.rect(margin, y - 4, contentWidth, 14, 'F');
            doc.setDrawColor(212, 175, 55);
            doc.setLineWidth(0.3);
            doc.rect(margin, y - 4, contentWidth, 14, 'S');

            const billNo = generateBillNumber();
            const dateStr = formatDate();

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(128, 0, 0);
            doc.text('Bill No:', margin + 3, y + 1);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(34, 34, 34);
            doc.text(billNo, margin + 20, y + 1);

            doc.setFont('helvetica', 'bold');
            doc.setTextColor(128, 0, 0);
            doc.text('Date:', pageWidth - margin - 45, y + 1);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(34, 34, 34);
            doc.text(dateStr, pageWidth - margin - 33, y + 1);

            y += 18;

            // ===== CUSTOMER DETAILS =====
            // Section header
            doc.setFillColor(128, 0, 0);
            doc.rect(margin, y, contentWidth, 7, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(255, 255, 255);
            doc.text('CUSTOMER DETAILS', margin + 3, y + 5);
            y += 10;

            doc.setFillColor(255, 255, 255);
            doc.rect(margin, y, contentWidth, customerName || customerPhone ? 18 : 12, 'F');
            doc.setDrawColor(212, 175, 55);
            doc.setLineWidth(0.2);
            doc.rect(margin, y, contentWidth, customerName || customerPhone ? 18 : 12, 'S');

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(34, 34, 34);

            if (customerName) {
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(128, 0, 0);
                doc.text('Name:', margin + 3, y + 6);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(34, 34, 34);
                doc.text(customerName, margin + 22, y + 6);
            }
            if (customerPhone) {
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(128, 0, 0);
                doc.text('Phone:', margin + 3, y + 13);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(34, 34, 34);
                doc.text(customerPhone, margin + 22, y + 13);
            }
            if (!customerName && !customerPhone) {
                doc.setTextColor(150, 150, 150);
                doc.text('Walk-in Customer', margin + 3, y + 7);
            }

            y += (customerName || customerPhone ? 18 : 12) + 6;

            // ===== ITEM DETAILS TABLE =====
            doc.setFillColor(128, 0, 0);
            doc.rect(margin, y, contentWidth, 7, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(255, 255, 255);
            doc.text('ITEM DETAILS', margin + 3, y + 5);
            y += 9;

            // Table header
            const col1 = margin;
            const col2 = margin + 55;
            const col3 = margin + 90;
            const col4 = margin + 125;
            const tableHeight = 10;

            doc.setFillColor(252, 249, 240);
            doc.rect(col1, y, contentWidth, tableHeight, 'F');
            doc.setDrawColor(212, 175, 55);
            doc.setLineWidth(0.3);
            doc.rect(col1, y, contentWidth, tableHeight, 'S');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(128, 0, 0);
            doc.text('Item', col1 + 3, y + 6.5);
            doc.text('Weight', col2 + 3, y + 6.5);
            doc.text('Purity', col3 + 3, y + 6.5);
            doc.text('Rate /gm', col4 + 3, y + 6.5);
            y += tableHeight;

            // Table row
            doc.setFillColor(255, 255, 255);
            doc.rect(col1, y, contentWidth, tableHeight + 2, 'F');
            doc.setDrawColor(212, 175, 55);
            doc.rect(col1, y, contentWidth, tableHeight + 2, 'S');

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(34, 34, 34);

            const metalLabel = billData.metalType === 'gold'
                ? `Gold ${billData.purity}`
                : `Silver ${billData.purity}`;
            const itemLabel = itemDescription || metalLabel;

            doc.text(itemLabel.length > 20 ? itemLabel.substring(0, 20) + '...' : itemLabel, col1 + 3, y + 7);
            doc.text(`${billData.weight} gm`, col2 + 3, y + 7);
            doc.text(billData.purityLabel, col3 + 3, y + 7);
            doc.text(formatCurrencyPlain(billData.pricePerGram), col4 + 3, y + 7);

            y += tableHeight + 8;

            // ===== PRICE BREAKDOWN =====
            doc.setFillColor(128, 0, 0);
            doc.rect(margin, y, contentWidth, 7, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(255, 255, 255);
            doc.text('PRICE BREAKDOWN', margin + 3, y + 5);
            y += 10;

            // Breakdown rows
            doc.setFillColor(255, 255, 255);
            doc.rect(margin, y, contentWidth, 42, 'F');
            doc.setDrawColor(212, 175, 55);
            doc.setLineWidth(0.2);
            doc.rect(margin, y, contentWidth, 42, 'S');

            const labelX = margin + 5;
            const valueX = pageWidth - margin - 5;

            // Gold/Silver Value
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(80, 80, 80);
            const metalName = billData.metalType === 'gold' ? 'Gold' : 'Silver';
            doc.text(`${metalName} Value (${billData.weight}gm × ${billData.purityLabel})`, labelX, y + 7);
            doc.setTextColor(34, 34, 34);
            doc.setFont('helvetica', 'bold');
            doc.text(formatCurrencyPlain(billData.purityValue), valueX, y + 7, { align: 'right' });

            // Wastage
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(80, 80, 80);
            doc.text(`Wastage Charges (${billData.wastageInGrams.toFixed(3)} gm)`, labelX, y + 16);
            doc.setTextColor(34, 34, 34);
            doc.setFont('helvetica', 'bold');
            doc.text(formatCurrencyPlain(billData.wastageValue), valueX, y + 16, { align: 'right' });

            // Divider line
            doc.setDrawColor(212, 175, 55);
            doc.setLineWidth(0.5);
            doc.line(labelX, y + 22, valueX, y + 22);

            // Subtotal
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.text(`(${formatCurrencyPlain(billData.purityValue)} + ${formatCurrencyPlain(billData.wastageValue)})`, labelX, y + 29);

            // Per gram
            doc.text(`Effective cost: ${formatCurrencyPlain(billData.total / billData.weight)}/gram`, labelX, y + 36);

            y += 48;

            // ===== TOTAL AMOUNT BOX =====
            doc.setFillColor(128, 0, 0);
            doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'F');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(13);
            doc.setTextColor(212, 175, 55);
            doc.text('TOTAL AMOUNT', margin + 5, y + 12);

            doc.setFontSize(16);
            doc.setTextColor(255, 255, 255);
            doc.text(formatCurrencyPlain(billData.total), valueX, y + 12, { align: 'right' });

            y += 26;

            // ===== ADDITIONAL INFO =====
            doc.setFillColor(252, 249, 240);
            doc.rect(margin, y, contentWidth, 20, 'F');
            doc.setDrawColor(212, 175, 55);
            doc.setLineWidth(0.2);
            doc.rect(margin, y, contentWidth, 20, 'S');

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);

            doc.text(`Pure ${metalName} Weight: ${billData.pureWeight.toFixed(3)} grams`, labelX, y + 6);
            doc.text(`Effective Rate (${billData.purity}): ${formatCurrencyPlain(billData.effectiveRate)}/gram`, labelX, y + 12);
            doc.text(`${metalName} Rate (per gram): ${formatCurrencyPlain(billData.pricePerGram)}`, labelX, y + 18);

            y += 28;

            // ===== FOOTER =====
            // Gold line
            doc.setFillColor(212, 175, 55);
            doc.rect(margin, y, contentWidth, 1, 'F');
            y += 5;

            doc.setFont('helvetica', 'italic');
            doc.setFontSize(11);
            doc.setTextColor(128, 0, 0);
            doc.text('Thank you for choosing NL Jewellers!', pageWidth / 2, y + 4, { align: 'center' });

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text('This is a computer generated estimate.', pageWidth / 2, y + 12, { align: 'center' });

            // Bottom gold border
            doc.setFillColor(212, 175, 55);
            doc.rect(0, doc.internal.pageSize.getHeight() - 3, pageWidth, 3, 'F');
            doc.setFillColor(128, 0, 0);
            doc.rect(0, doc.internal.pageSize.getHeight() - 1.5, pageWidth, 1.5, 'F');

            // === Action ===
            const fileName = `NL_Jewellers_${billNo}.pdf`;

            if (action === 'share') {
                // Try Web Share API with file
                const pdfBlob = doc.output('blob');
                const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

                if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({
                            title: `NL Jewellers - ${metalName} Estimate`,
                            text: `${metalName} jewellery estimate from NL Jewellers - Total: ${formatCurrency(billData.total)}`,
                            files: [file],
                        });
                    } catch (err) {
                        if ((err as Error).name !== 'AbortError') {
                            // Fallback to download
                            doc.save(fileName);
                        }
                    }
                } else {
                    // Fallback: direct download
                    doc.save(fileName);
                }
            } else {
                doc.save(fileName);
            }
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error generating PDF. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="rounded-t-xl p-5" style={{ background: 'linear-gradient(to right, #800000, #990000)' }}>
                    <h2 className="text-2xl font-serif font-bold text-center tracking-wide"
                        style={{ color: '#D4AF37', textShadow: '1px 1px 3px rgba(0,0,0,0.3)' }}>
                        Generate Bill
                    </h2>
                    <p className="text-sm text-center mt-1" style={{ color: 'rgba(255, 248, 231, 0.8)' }}>
                        {billData.metalType === 'gold' ? 'Gold' : 'Silver'} Jewellery Estimate
                    </p>
                </div>

                <div className="p-5 space-y-4">
                    {/* Customer Name */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Customer Name <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <input
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Enter customer name"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-base"
                        />
                    </div>

                    {/* Customer Phone */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Phone Number <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <input
                            type="tel"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            placeholder="Enter phone number"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-base"
                        />
                    </div>

                    {/* Item Description */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Item Description <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <input
                            type="text"
                            value={itemDescription}
                            onChange={(e) => setItemDescription(e.target.value)}
                            placeholder={billData.metalType === 'gold' ? 'e.g., Gold Chain, Ring' : 'e.g., Silver Bangle, Anklet'}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-base"
                        />
                    </div>

                    {/* Summary Preview */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Bill Preview</h3>
                        <div className="space-y-1.5 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Item:</span>
                                <span className="font-medium">{billData.metalType === 'gold' ? `Gold ${billData.purity}` : `Silver ${billData.purity}`}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Weight:</span>
                                <span className="font-medium">{billData.weight} grams</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Purity:</span>
                                <span className="font-medium">{billData.purityLabel}</span>
                            </div>
                            <div className="flex justify-between border-t border-gray-200 pt-1.5 mt-1.5">
                                <span className="text-gray-600">{billData.metalType === 'gold' ? 'Gold' : 'Silver'} Value:</span>
                                <span className="font-medium">{formatCurrency(billData.purityValue)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Wastage ({billData.wastageInGrams.toFixed(3)}gm):</span>
                                <span className="font-medium">{formatCurrency(billData.wastageValue)}</span>
                            </div>
                            <div className="flex justify-between border-t-2 border-amber-300 pt-2 mt-2">
                                <span className="font-bold text-base" style={{ color: '#800000' }}>Total:</span>
                                <span className="font-bold text-base" style={{ color: '#800000' }}>{formatCurrency(billData.total)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => generatePDF('download')}
                            disabled={isGenerating}
                            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-white transition-all disabled:opacity-50"
                            style={{ background: 'linear-gradient(to right, #800000, #990000)' }}
                        >
                            {isGenerating ? (
                                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            )}
                            Download PDF
                        </button>
                        <button
                            onClick={() => generatePDF('share')}
                            disabled={isGenerating}
                            className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 py-3 px-4 rounded-lg font-bold text-white transition-colors disabled:opacity-50"
                        >
                            {isGenerating ? (
                                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                            )}
                            Share
                        </button>
                    </div>

                    {/* Cancel */}
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 text-gray-500 hover:text-gray-700 font-medium transition-colors text-sm"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BillGenerator;

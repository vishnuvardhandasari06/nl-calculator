import React, { useState, useEffect, useCallback } from 'react';
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
    const [stonesCost, setStonesCost] = useState<number>(0);
    const [discount, setDiscount] = useState<number>(0);
    const [editedTotal, setEditedTotal] = useState<number>(0);
    const [adjustedWastageValue, setAdjustedWastageValue] = useState<number>(0);
    const [adjustedWastageGrams, setAdjustedWastageGrams] = useState<number>(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [totalManuallyEdited, setTotalManuallyEdited] = useState(false);

    // Calculate the natural total based on current inputs
    const calculateNaturalTotal = useCallback(() => {
        return billData.purityValue + billData.wastageValue + stonesCost - discount;
    }, [billData.purityValue, billData.wastageValue, stonesCost, discount]);

    // Initialize/reset when bill data changes or modal opens
    useEffect(() => {
        if (isOpen) {
            const naturalTotal = billData.purityValue + billData.wastageValue + stonesCost - discount;
            setEditedTotal(Math.round(naturalTotal));
            setAdjustedWastageValue(billData.wastageValue);
            setAdjustedWastageGrams(billData.wastageInGrams);
            setTotalManuallyEdited(false);
        }
    }, [isOpen, billData]);

    // When stones cost or discount changes and total was NOT manually edited, recalculate total
    useEffect(() => {
        if (!totalManuallyEdited) {
            const naturalTotal = calculateNaturalTotal();
            setEditedTotal(Math.round(naturalTotal));
            setAdjustedWastageValue(billData.wastageValue);
            setAdjustedWastageGrams(billData.wastageInGrams);
        }
    }, [stonesCost, discount, totalManuallyEdited, calculateNaturalTotal, billData.wastageValue, billData.wastageInGrams]);

    // When total is manually edited, adjust wastage to match
    const handleTotalChange = (newTotal: number) => {
        setEditedTotal(newTotal);
        setTotalManuallyEdited(true);

        // Total = purityValue + wastage + stonesCost - discount
        // => wastage = Total - purityValue - stonesCost + discount
        const newWastage = newTotal - billData.purityValue - stonesCost + discount;
        setAdjustedWastageValue(Math.max(0, newWastage));
        // Calculate wastage in grams based on per-gram rate
        if (billData.pricePerGram > 0) {
            setAdjustedWastageGrams(Math.max(0, newWastage / billData.pricePerGram));
        }
    };

    if (!isOpen) return null;

    const metalName = billData.metalType === 'gold' ? 'Gold' : 'Silver';
    const isGold = billData.metalType === 'gold';
    const accentColor = isGold ? '#800000' : '#2d3748';
    const accentColorLight = isGold ? '#990000' : '#4a5568';

    const generatePDF = async (action: 'download' | 'share') => {
        setIsGenerating(true);

        try {
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
            });

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 15;
            const contentWidth = pageWidth - margin * 2;
            let y = 0;

            // ===== ROYAL OUTER BORDER =====
            // Double border with gold accent
            doc.setDrawColor(212, 175, 55);
            doc.setLineWidth(1.5);
            doc.rect(5, 5, pageWidth - 10, pageHeight - 10, 'S');
            doc.setLineWidth(0.4);
            doc.rect(8, 8, pageWidth - 16, pageHeight - 16, 'S');

            // Corner ornaments (small L-shapes in gold)
            const cornerSize = 8;
            const cornerOffset = 8;
            doc.setLineWidth(1);
            // Top-left
            doc.line(cornerOffset, cornerOffset, cornerOffset + cornerSize, cornerOffset);
            doc.line(cornerOffset, cornerOffset, cornerOffset, cornerOffset + cornerSize);
            // Top-right
            doc.line(pageWidth - cornerOffset, cornerOffset, pageWidth - cornerOffset - cornerSize, cornerOffset);
            doc.line(pageWidth - cornerOffset, cornerOffset, pageWidth - cornerOffset, cornerOffset + cornerSize);
            // Bottom-left
            doc.line(cornerOffset, pageHeight - cornerOffset, cornerOffset + cornerSize, pageHeight - cornerOffset);
            doc.line(cornerOffset, pageHeight - cornerOffset, cornerOffset, pageHeight - cornerOffset - cornerSize);
            // Bottom-right
            doc.line(pageWidth - cornerOffset, pageHeight - cornerOffset, pageWidth - cornerOffset - cornerSize, pageHeight - cornerOffset);
            doc.line(pageWidth - cornerOffset, pageHeight - cornerOffset, pageWidth - cornerOffset, pageHeight - cornerOffset - cornerSize);

            // ===== HEADER BAR =====
            doc.setFillColor(128, 0, 0);
            doc.rect(margin, margin, contentWidth, 42, 'F');

            // Gold inner border on header
            doc.setDrawColor(212, 175, 55);
            doc.setLineWidth(0.8);
            doc.rect(margin + 2, margin + 2, contentWidth - 4, 38, 'S');

            // Decorative gold line at top of header
            doc.setFillColor(212, 175, 55);
            doc.rect(margin, margin, contentWidth, 2, 'F');

            // Shop name
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(32);
            doc.setTextColor(212, 175, 55);
            doc.text('NL JEWELLERS', pageWidth / 2, margin + 22, { align: 'center' });

            // Decorative separator dots
            doc.setFontSize(10);
            doc.text('✦  ✦  ✦', pageWidth / 2, margin + 29, { align: 'center' });

            // Subtitle
            doc.setFontSize(11);
            doc.setTextColor(255, 248, 231);
            doc.text(`${metalName} Jewellery  |  ESTIMATE`, pageWidth / 2, margin + 37, { align: 'center' });

            // Gold accent bar below header
            doc.setFillColor(212, 175, 55);
            doc.rect(margin, margin + 42, contentWidth, 2.5, 'F');

            y = margin + 52;

            // ===== BILL INFO ROW =====
            doc.setFillColor(252, 249, 240);
            doc.rect(margin, y, contentWidth, 12, 'F');
            doc.setDrawColor(212, 175, 55);
            doc.setLineWidth(0.3);
            doc.rect(margin, y, contentWidth, 12, 'S');

            const billNo = generateBillNumber();
            const dateStr = formatDate();

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(128, 0, 0);
            doc.text('Bill No:', margin + 4, y + 7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(34, 34, 34);
            doc.text(billNo, margin + 22, y + 7);

            doc.setFont('helvetica', 'bold');
            doc.setTextColor(128, 0, 0);
            doc.text('Date:', pageWidth - margin - 48, y + 7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(34, 34, 34);
            doc.text(dateStr, pageWidth - margin - 36, y + 7);

            y += 18;

            // ===== CUSTOMER DETAILS =====
            // Ornamental section header
            doc.setFillColor(128, 0, 0);
            doc.rect(margin, y, contentWidth, 8, 'F');
            doc.setFillColor(212, 175, 55);
            doc.rect(margin, y, 3, 8, 'F'); // gold left accent
            doc.rect(margin + contentWidth - 3, y, 3, 8, 'F'); // gold right accent

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(255, 255, 255);
            doc.text('CUSTOMER DETAILS', pageWidth / 2, y + 5.5, { align: 'center' });
            y += 10;

            const customerBoxHeight = (customerName && customerPhone) ? 18 : (customerName || customerPhone) ? 12 : 10;
            doc.setFillColor(255, 255, 255);
            doc.rect(margin, y, contentWidth, customerBoxHeight, 'F');
            doc.setDrawColor(212, 175, 55);
            doc.setLineWidth(0.2);
            doc.rect(margin, y, contentWidth, customerBoxHeight, 'S');

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(34, 34, 34);

            let custY = y + 7;
            if (customerName) {
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(128, 0, 0);
                doc.text('Name:', margin + 4, custY);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(34, 34, 34);
                doc.text(customerName, margin + 22, custY);
                custY += 8;
            }
            if (customerPhone) {
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(128, 0, 0);
                doc.text('Phone:', margin + 4, custY);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(34, 34, 34);
                doc.text(customerPhone, margin + 22, custY);
            }
            if (!customerName && !customerPhone) {
                doc.setTextColor(150, 150, 150);
                doc.setFont('helvetica', 'italic');
                doc.text('Walk-in Customer', margin + 4, y + 7);
            }

            y += customerBoxHeight + 6;

            // ===== ITEM DETAILS TABLE =====
            doc.setFillColor(128, 0, 0);
            doc.rect(margin, y, contentWidth, 8, 'F');
            doc.setFillColor(212, 175, 55);
            doc.rect(margin, y, 3, 8, 'F');
            doc.rect(margin + contentWidth - 3, y, 3, 8, 'F');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(255, 255, 255);
            doc.text('ITEM DETAILS', pageWidth / 2, y + 5.5, { align: 'center' });
            y += 10;

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
            doc.text('Item', col1 + 4, y + 6.5);
            doc.text('Weight', col2 + 4, y + 6.5);
            doc.text('Purity', col3 + 4, y + 6.5);
            doc.text('Rate /gm', col4 + 4, y + 6.5);
            y += tableHeight;

            // Table row
            doc.setFillColor(255, 255, 255);
            doc.rect(col1, y, contentWidth, tableHeight + 2, 'F');
            doc.setDrawColor(212, 175, 55);
            doc.rect(col1, y, contentWidth, tableHeight + 2, 'S');

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(34, 34, 34);

            const metalLabel = `${metalName} ${billData.purity}`;
            const itemLabel = itemDescription || metalLabel;

            doc.text(itemLabel.length > 20 ? itemLabel.substring(0, 20) + '...' : itemLabel, col1 + 4, y + 7);
            doc.text(`${billData.weight} gm`, col2 + 4, y + 7);
            doc.text(billData.purityLabel, col3 + 4, y + 7);
            doc.text(formatCurrencyPlain(billData.pricePerGram), col4 + 4, y + 7);

            y += tableHeight + 8;

            // ===== PRICE BREAKDOWN =====
            doc.setFillColor(128, 0, 0);
            doc.rect(margin, y, contentWidth, 8, 'F');
            doc.setFillColor(212, 175, 55);
            doc.rect(margin, y, 3, 8, 'F');
            doc.rect(margin + contentWidth - 3, y, 3, 8, 'F');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(255, 255, 255);
            doc.text('PRICE BREAKDOWN', pageWidth / 2, y + 5.5, { align: 'center' });
            y += 10;

            const labelX = margin + 5;
            const valueX = pageWidth - margin - 5;

            // Calculate breakdown box height
            let breakdownRows = 2; // metal value + wastage
            if (stonesCost > 0) breakdownRows++;
            if (discount > 0) breakdownRows++;
            const rowHeight = 9;
            const breakdownHeight = breakdownRows * rowHeight + 10; // +10 for padding

            doc.setFillColor(255, 255, 255);
            doc.rect(margin, y, contentWidth, breakdownHeight, 'F');
            doc.setDrawColor(212, 175, 55);
            doc.setLineWidth(0.2);
            doc.rect(margin, y, contentWidth, breakdownHeight, 'S');

            let breakY = y + 7;

            // Metal Value
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(80, 80, 80);
            doc.text(`${metalName} Value (${billData.weight}gm × ${billData.purityLabel})`, labelX, breakY);
            doc.setTextColor(34, 34, 34);
            doc.setFont('helvetica', 'bold');
            doc.text(formatCurrencyPlain(billData.purityValue), valueX, breakY, { align: 'right' });
            breakY += rowHeight;

            // Wastage
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(80, 80, 80);
            doc.text(`Wastage Charges (${adjustedWastageGrams.toFixed(3)} gm)`, labelX, breakY);
            doc.setTextColor(34, 34, 34);
            doc.setFont('helvetica', 'bold');
            doc.text(formatCurrencyPlain(adjustedWastageValue), valueX, breakY, { align: 'right' });
            breakY += rowHeight;

            // Stones cost (if any)
            if (stonesCost > 0) {
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(80, 80, 80);
                doc.text('Stones / Additional Cost', labelX, breakY);
                doc.setTextColor(34, 34, 34);
                doc.setFont('helvetica', 'bold');
                doc.text(formatCurrencyPlain(stonesCost), valueX, breakY, { align: 'right' });
                breakY += rowHeight;
            }

            // Discount (if any)
            if (discount > 0) {
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(0, 128, 0);
                doc.text('Discount', labelX, breakY);
                doc.setFont('helvetica', 'bold');
                doc.text(`- ${formatCurrencyPlain(discount)}`, valueX, breakY, { align: 'right' });
                breakY += rowHeight;
            }

            y += breakdownHeight + 4;

            // ===== TOTAL AMOUNT BOX =====
            // Gold border around total
            doc.setDrawColor(212, 175, 55);
            doc.setLineWidth(1);
            doc.rect(margin - 1, y - 1, contentWidth + 2, 22, 'S');

            doc.setFillColor(128, 0, 0);
            doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'F');

            // Inner gold border
            doc.setDrawColor(212, 175, 55);
            doc.setLineWidth(0.5);
            doc.rect(margin + 1.5, y + 1.5, contentWidth - 3, 17, 'S');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(13);
            doc.setTextColor(212, 175, 55);
            doc.text('TOTAL AMOUNT', margin + 6, y + 13);

            doc.setFontSize(18);
            doc.setTextColor(255, 255, 255);
            doc.text(formatCurrencyPlain(editedTotal), valueX - 2, y + 14, { align: 'right' });

            y += 28;

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
            // Ornamental gold divider
            doc.setDrawColor(212, 175, 55);
            doc.setLineWidth(0.8);
            doc.line(margin + 20, y, pageWidth - margin - 20, y);
            doc.setLineWidth(0.3);
            doc.line(margin + 30, y + 2, pageWidth - margin - 30, y + 2);

            // Diamond ornament in center
            doc.setFontSize(8);
            doc.setTextColor(212, 175, 55);
            doc.text('◆', pageWidth / 2, y + 1, { align: 'center' });

            y += 8;

            doc.setFont('helvetica', 'italic');
            doc.setFontSize(12);
            doc.setTextColor(128, 0, 0);
            doc.text('Thank you for choosing NL Jewellers!', pageWidth / 2, y + 4, { align: 'center' });

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text('This is a computer generated estimate.', pageWidth / 2, y + 12, { align: 'center' });

            // Bottom ornamental border
            doc.setFillColor(212, 175, 55);
            doc.rect(5, pageHeight - 8, pageWidth - 10, 1.5, 'F');
            doc.setFillColor(128, 0, 0);
            doc.rect(5, pageHeight - 6, pageWidth - 10, 1, 'F');

            // === Action ===
            const fileName = `NL_Jewellers_${billNo}.pdf`;

            if (action === 'share') {
                const pdfBlob = doc.output('blob');
                const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

                if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({
                            title: `NL Jewellers - ${metalName} Estimate`,
                            text: `${metalName} jewellery estimate from NL Jewellers - Total: ${formatCurrency(editedTotal)}`,
                            files: [file],
                        });
                    } catch (err) {
                        if ((err as Error).name !== 'AbortError') {
                            doc.save(fileName);
                        }
                    }
                } else {
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-3"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[92vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
                style={{ scrollbarWidth: 'thin' }}
            >
                {/* Header */}
                <div className="rounded-t-2xl p-4 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColorLight})` }}>
                    {/* Subtle pattern overlay */}
                    <div className="absolute inset-0 opacity-10" style={{
                        backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(212,175,55,0.3) 1px, transparent 1px)',
                        backgroundSize: '20px 20px'
                    }} />
                    <h2 className="text-xl font-serif font-bold text-center tracking-wide relative"
                        style={{ color: '#D4AF37', textShadow: '1px 1px 3px rgba(0,0,0,0.3)' }}>
                        Generate Bill
                    </h2>
                    <p className="text-xs text-center mt-0.5 relative" style={{ color: 'rgba(255, 248, 231, 0.8)' }}>
                        {metalName} Jewellery Estimate
                    </p>
                </div>

                <div className="p-4 space-y-3">
                    {/* Customer Details - Compact Grid */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: accentColor }}>
                            Customer Details
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="text"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                placeholder="Customer Name"
                                className="col-span-2 px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent text-sm bg-gray-50 focus:bg-white transition-colors"
                                style={{ ['--tw-ring-color' as string]: '#D4AF37' } as React.CSSProperties}
                            />
                            <input
                                type="tel"
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                                placeholder="Phone Number"
                                className="px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent text-sm bg-gray-50 focus:bg-white transition-colors"
                            />
                            <input
                                type="text"
                                value={itemDescription}
                                onChange={(e) => setItemDescription(e.target.value)}
                                placeholder={isGold ? 'e.g., Chain, Ring' : 'e.g., Bangle, Anklet'}
                                className="px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent text-sm bg-gray-50 focus:bg-white transition-colors"
                            />
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-2">
                        <div className="flex-1 h-px" style={{ backgroundColor: '#D4AF37', opacity: 0.3 }} />
                        <span className="text-xs" style={{ color: '#D4AF37' }}>◆</span>
                        <div className="flex-1 h-px" style={{ backgroundColor: '#D4AF37', opacity: 0.3 }} />
                    </div>

                    {/* Price Breakdown - Compact */}
                    <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'rgba(212,175,55,0.3)' }}>
                        {/* Section header */}
                        <div className="px-3 py-1.5 flex items-center justify-between" style={{ backgroundColor: 'rgba(128,0,0,0.05)' }}>
                            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: accentColor }}>
                                Price Breakdown
                            </h3>
                            <span className="text-xs text-gray-400">{metalName} {billData.purity}</span>
                        </div>

                        <div className="divide-y divide-gray-100">
                            {/* Metal Value */}
                            <div className="flex justify-between items-center px-3 py-2">
                                <span className="text-sm text-gray-600">{metalName} Value</span>
                                <span className="text-sm font-semibold">{formatCurrency(billData.purityValue)}</span>
                            </div>

                            {/* Wastage */}
                            <div className="flex justify-between items-center px-3 py-2">
                                <span className="text-sm text-gray-600">
                                    Wastage
                                    <span className="text-xs text-gray-400 ml-1">({adjustedWastageGrams.toFixed(3)}gm)</span>
                                </span>
                                <span className="text-sm font-semibold">{formatCurrency(adjustedWastageValue)}</span>
                            </div>

                            {/* Stones Cost */}
                            <div className="flex justify-between items-center px-3 py-2 bg-amber-50/50">
                                <span className="text-sm text-gray-600">Stones / Extra</span>
                                <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">₹</span>
                                    <input
                                        type="number"
                                        value={stonesCost || ''}
                                        onChange={(e) => setStonesCost(Number(e.target.value) || 0)}
                                        placeholder="0"
                                        className="w-28 pl-6 pr-2 py-1.5 text-right text-sm font-semibold border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-amber-400 bg-white"
                                    />
                                </div>
                            </div>

                            {/* Discount */}
                            <div className="flex justify-between items-center px-3 py-2 bg-green-50/50">
                                <span className="text-sm text-green-700">Discount</span>
                                <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-green-400">₹</span>
                                    <input
                                        type="number"
                                        value={discount || ''}
                                        onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                                        placeholder="0"
                                        className="w-28 pl-6 pr-2 py-1.5 text-right text-sm font-semibold border border-green-200 rounded-md focus:outline-none focus:ring-1 focus:ring-green-400 focus:border-green-400 bg-white text-green-700"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Total - Editable */}
                        <div className="px-3 py-3 flex justify-between items-center" style={{ background: `linear-gradient(to right, ${accentColor}, ${accentColorLight})` }}>
                            <div>
                                <span className="font-bold text-sm" style={{ color: '#D4AF37' }}>TOTAL</span>
                                {totalManuallyEdited && (
                                    <button
                                        onClick={() => {
                                            setTotalManuallyEdited(false);
                                            const naturalTotal = calculateNaturalTotal();
                                            setEditedTotal(Math.round(naturalTotal));
                                            setAdjustedWastageValue(billData.wastageValue);
                                            setAdjustedWastageGrams(billData.wastageInGrams);
                                        }}
                                        className="ml-2 text-xs underline opacity-70 hover:opacity-100 transition-opacity"
                                        style={{ color: '#D4AF37' }}
                                    >
                                        reset
                                    </button>
                                )}
                            </div>
                            <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm font-bold text-white/70">₹</span>
                                <input
                                    type="number"
                                    value={editedTotal || ''}
                                    onChange={(e) => handleTotalChange(Number(e.target.value) || 0)}
                                    className="w-36 pl-6 pr-2 py-2 text-right text-lg font-bold rounded-md border-2 border-amber-400/50 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 bg-white/10 text-white"
                                    style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
                                />
                            </div>
                        </div>
                    </div>

                    {totalManuallyEdited && (
                        <p className="text-xs text-center text-amber-600 -mt-1">
                            ⚡ Wastage auto-adjusted to match your total
                        </p>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-1">
                        <button
                            onClick={() => generatePDF('download')}
                            disabled={isGenerating}
                            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-white transition-all disabled:opacity-50 shadow-md active:scale-95"
                            style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColorLight})` }}
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
                            className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 py-3 px-4 rounded-xl font-bold text-white transition-colors disabled:opacity-50 shadow-md active:scale-95"
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
                        className="w-full py-2 text-gray-400 hover:text-gray-600 font-medium transition-colors text-sm"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BillGenerator;

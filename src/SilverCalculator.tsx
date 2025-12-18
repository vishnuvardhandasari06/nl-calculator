import React, { useState, useCallback, useEffect } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { DeleteIcon } from './Icons';

interface SilverCalculatorModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface SilverCalculationParams {
    id: string;
    silverPrice: string;
    silverWeight: string;
    purity: '925' | '999';
    minPercent: string;
    maxPercent: string;
    selectedPercent?: number;
}

interface ResultDetail {
    percent: number;
    wastageValue: number;
    purityValue: number;
    total: number;
    wastageInGrams: number;
}

const formatCurrency = (num: number) => num.toLocaleString("en-IN", {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

// Helper function to calculate total price from saved calculation parameters
const calculateTotalFromParams = (params: SilverCalculationParams): number => {
    const price = parseFloat(params.silverPrice);
    const weight = parseFloat(params.silverWeight);
    const purityDecimal = params.purity === '925' ? 0.925 : 0.999;
    const percent = params.selectedPercent !== undefined ? params.selectedPercent : parseInt(params.minPercent, 10);

    const wastagePercentDecimal = percent / 100;
    const purityValue = weight * purityDecimal * price;
    const wastageValue = weight * wastagePercentDecimal * price;
    const total = purityValue + wastageValue;

    return total;
};

const SilverCalculator: React.FC = () => {
    const [silverPrice, setSilverPrice] = useState('');
    const [silverWeight, setSilverWeight] = useState('');
    const purity = '999'; // Fixed: Pure Silver 100%
    const [minPercent, setMinPercent] = useState('8');
    const [maxPercent, setMaxPercent] = useState('15');
    const [errors, setErrors] = useState<Partial<Record<keyof Omit<SilverCalculationParams, 'id' | 'purity' | 'selectedPercent'>, string>>>({});

    const [results, setResults] = useState<ResultDetail[]>([]);
    const [selectedResult, setSelectedResult] = useState<ResultDetail | null>(null);
    const [showProfitMargin, setShowProfitMargin] = useState(false); // Default: hidden
    const [showCustomerView, setShowCustomerView] = useState(false); // Customer view modal
    const [closeClickCount, setCloseClickCount] = useState(0); // Counter for 5-tap close

    const [savedCalculations, setSavedCalculations] = useLocalStorage<SilverCalculationParams[]>('silverCalculatorSaves', []);
    const [loadRequest, setLoadRequest] = useState<SilverCalculationParams | null>(null);

    const validate = useCallback(() => {
        const newErrors: Partial<Record<keyof Omit<SilverCalculationParams, 'id' | 'purity' | 'selectedPercent'>, string>> = {};
        if (!silverPrice || parseFloat(silverPrice) <= 0) newErrors.silverPrice = 'Invalid price';
        if (!silverWeight || parseFloat(silverWeight) <= 0) newErrors.silverWeight = 'Invalid weight';
        if (!minPercent || parseInt(minPercent, 10) < 0) newErrors.minPercent = 'Invalid %';
        if (!maxPercent || parseInt(maxPercent, 10) < 0) newErrors.maxPercent = 'Invalid %';
        if (parseInt(minPercent, 10) > parseInt(maxPercent, 10)) newErrors.maxPercent = 'Max must be >= min';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [silverPrice, silverWeight, minPercent, maxPercent]);

    const calculateAndSelect = useCallback((selectedPercent?: number) => {
        if (!validate()) {
            setResults([]);
            setSelectedResult(null);
            return;
        };

        const price = parseFloat(silverPrice);
        const weight = parseFloat(silverWeight);
        const purityDecimal = 1.0; // Pure Silver 100%

        const min = parseInt(minPercent, 10);
        const max = parseInt(maxPercent, 10);
        const newResults: ResultDetail[] = [];

        for (let i = min; i <= max; i++) {
            const wastagePercentDecimal = i / 100;
            const purityValue = weight * purityDecimal * price;
            const wastageValue = weight * wastagePercentDecimal * price;
            const total = purityValue + wastageValue;

            const rateOfAlloyedSilver = price * purityDecimal;
            const wastageInGrams = rateOfAlloyedSilver > 0 ? wastageValue / rateOfAlloyedSilver : 0;

            newResults.push({ percent: i, wastageValue, purityValue, total, wastageInGrams });
        }
        setResults(newResults);

        if (selectedPercent !== undefined) {
            const resultToSelect = newResults.find(r => r.percent === selectedPercent);
            setSelectedResult(resultToSelect || newResults[0] || null);
        } else {
            setSelectedResult(newResults[0] || null);
        }
    }, [silverPrice, silverWeight, minPercent, maxPercent, validate]);

    useEffect(() => {
        if (loadRequest) {
            calculateAndSelect(loadRequest.selectedPercent);
            setLoadRequest(null);
        }
    }, [loadRequest, calculateAndSelect]);

    const handleCalculate = useCallback(() => {
        calculateAndSelect();
    }, [calculateAndSelect]);

    const handleSave = () => {
        if (!validate()) return;
        const newSave: SilverCalculationParams = {
            id: Date.now().toString(),
            silverPrice, silverWeight, purity, minPercent, maxPercent,
            selectedPercent: selectedResult?.percent,
        };
        setSavedCalculations(prev => [newSave, ...prev.slice(0, 9)]); // Limit to 10 saves
    };

    const loadCalculation = (params: SilverCalculationParams) => {
        setSilverPrice(params.silverPrice);
        setSilverWeight(params.silverWeight);
        // purity is now fixed to 999
        setMinPercent(params.minPercent);
        setMaxPercent(params.maxPercent);
        setLoadRequest(params);
    };

    const deleteCalculation = (id: string) => {
        setSavedCalculations(prev => prev.filter(c => c.id !== id));
    };

    const renderInputField = (label: string, value: string, setter: (val: string) => void, name: keyof typeof errors, placeholder: string) => (
        <div>
            <label className="block text-xl md:text-lg font-medium text-text-main/90">{label}</label>
            <input
                type="number"
                value={value}
                onChange={e => setter(e.target.value)}
                placeholder={placeholder}
                className={`mt-1 block w-full px-4 py-4 md:py-3 bg-white/50 border ${errors[name] ? 'border-highlight-red' : 'border-slate-300'} rounded-md shadow-sm focus:outline-none focus:ring-slate-400 focus:border-slate-400 text-xl md:text-lg`}
            />
            {errors[name] && <p className="mt-1 text-base md:text-sm text-highlight-red">{errors[name]}</p>}
        </div>
    );

    return (
        <div className="flex-grow p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 overflow-y-auto">
            {/* Left Column: Inputs & Saved */}
            <div className="flex flex-col gap-6">
                <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-8 rounded-lg border border-slate-300/30 shadow-md">
                    <h3 className="text-3xl md:text-2xl font-serif font-bold text-slate-700 mb-4">Parameters</h3>
                    <div className="space-y-5">
                        {renderInputField("Silver Price (per gram)", silverPrice, setSilverPrice, 'silverPrice', 'e.g., 85')}
                        {renderInputField("Silver Weight (grams)", silverWeight, setSilverWeight, 'silverWeight', 'e.g., 50')}
                        <div>
                            <label className="block text-xl md:text-lg font-medium text-text-main/90">Purity</label>
                            <div className="mt-1 block w-full px-4 py-4 md:py-3 bg-gradient-to-r from-slate-100 to-blue-100 border border-slate-300 rounded-md text-xl md:text-lg text-slate-700 font-semibold">
                                999 (Pure Silver 100%)
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {renderInputField("Min Wastage %", minPercent, setMinPercent, 'minPercent', 'e.g., 12')}
                            {renderInputField("Max Wastage %", maxPercent, setMaxPercent, 'maxPercent', 'e.g., 20')}
                        </div>
                        <div className="flex gap-4 pt-2">
                            <button onClick={handleCalculate} className="w-full bg-gradient-to-r from-slate-600 to-slate-700 text-white font-bold py-4 md:py-3 px-4 rounded-lg hover:from-slate-700 hover:to-slate-800 transition-all shadow-md text-xl md:text-lg">Calculate</button>
                            <button onClick={handleSave} className="w-full bg-white border-2 border-slate-500 text-slate-700 font-bold py-4 md:py-3 px-4 rounded-lg hover:bg-slate-50 transition-colors shadow-sm text-xl md:text-lg">Save</button>
                        </div>
                    </div>
                </div>
                <div className="flex-grow flex flex-col">
                    <h3 className="text-3xl md:text-2xl font-serif font-bold text-slate-700 mb-2">Saved Calculations</h3>
                    <div className="flex-grow bg-gradient-to-br from-slate-50 to-blue-50 p-2 rounded-lg border border-slate-300/30 shadow-md overflow-y-auto">
                        {savedCalculations.length > 0 ? (
                            <ul className="space-y-2">
                                {savedCalculations.map(c => (
                                    <li key={c.id} className="group flex items-center justify-between p-4 md:p-3 rounded-md hover:bg-gray-200/50 transition-colors">
                                        <button onClick={() => loadCalculation(c)} className="text-left flex-grow">
                                            <p className="font-semibold text-text-main text-xl md:text-base">
                                                {c.silverWeight}g - {c.purity}
                                                {c.selectedPercent !== undefined
                                                    ? <span className="text-gray-700"> - Selected: {c.selectedPercent}%</span>
                                                    : ` - ${c.minPercent}% to ${c.maxPercent}%`
                                                }
                                            </p>
                                            <p className="text-lg md:text-sm text-text-main/70">Total: {formatCurrency(calculateTotalFromParams(c))}</p>
                                        </button>
                                        <button onClick={() => deleteCalculation(c.id)} className="ml-2 p-1 text-highlight-red/50 hover:text-highlight-red opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Delete saved calculation">
                                            <DeleteIcon />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-center text-sm text-text-main/60 p-4">No saved calculations yet.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Column: Results */}
            <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-4 rounded-lg border border-slate-300/30 shadow-md flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-3xl md:text-2xl font-serif font-bold text-slate-700">Results</h3>
                    {results.length > 1 && (
                        <button
                            onClick={() => setShowProfitMargin(!showProfitMargin)}
                            className="p-2 bg-slate-200/60 hover:bg-slate-300/70 border border-slate-400/50 rounded-md transition-colors text-slate-700 shadow-sm"
                            aria-label={showProfitMargin ? "Hide profit margin" : "Show profit margin"}
                        >
                            {showProfitMargin ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                </svg>
                            )}
                        </button>
                    )}
                </div>

                {/* Profit Indicator */}
                {showProfitMargin && results.length > 1 && selectedResult && (() => {
                    const minResult = results[0];
                    const profit = selectedResult.total - minResult.total;

                    return (
                        <div className="mb-4 bg-gradient-to-r from-green-50 to-emerald-50 p-5 md:p-4 rounded-md shadow-sm border-2 border-green-400/50">
                            <h4 className="font-semibold text-green-800 text-center mb-2 text-xl md:text-base">💰 Profit Margin</h4>
                            <div className="space-y-1 text-lg md:text-sm">
                                <div className="flex justify-between">
                                    <span className="text-green-700/80">Selected ({selectedResult.percent}%):</span>
                                    <span className="font-medium text-green-800">{formatCurrency(selectedResult.total)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-green-700/80">Minimum ({minResult.percent}%):</span>
                                    <span className="font-medium text-green-800">{formatCurrency(minResult.total)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-lg border-t-2 pt-2 mt-2 border-green-400/30 text-green-900">
                                    <span>Profit:</span>
                                    <span className="text-green-600">{formatCurrency(profit)}</span>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {results.length > 0 && selectedResult ? (
                    <div className="mb-4 bg-white/50 p-4 rounded-md shadow-inner border border-gray-300/10">
                        <h4 className="font-semibold text-text-main text-center mb-3 text-2xl md:text-xl">
                            Details for {selectedResult.percent}% Wastage
                        </h4>
                        <div className="space-y-2 text-xl md:text-lg">
                            <div className="flex justify-between">
                                <span className="text-text-main/80">Purity Value:</span>
                                <span className="font-medium text-text-main">{formatCurrency(selectedResult.purityValue)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-text-main/80">Wastage ({selectedResult.wastageInGrams.toFixed(3)} gm):</span>
                                <span className="font-medium text-text-main">{formatCurrency(selectedResult.wastageValue)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-3xl md:text-2xl border-t-2 pt-2 mt-2 border-slate-400/40 text-slate-700">
                                <span>Total Price:</span>
                                <span>{formatCurrency(selectedResult.total)}</span>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setShowCustomerView(true);
                                setCloseClickCount(0); // Reset counter when opening
                            }}
                            className="mt-4 w-full bg-gradient-to-r from-slate-600 to-slate-700 text-white font-bold py-4 md:py-3 px-4 rounded-lg hover:from-slate-700 hover:to-slate-800 transition-all shadow-md flex items-center justify-center gap-2 text-xl md:text-lg"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Show to Customer
                        </button>
                    </div>
                ) : null}

                <div className="flex-grow overflow-y-auto pr-2 -mr-2">
                    {results.length > 0 ? (
                        <ul className="space-y-1">
                            {results.map(r => (
                                <li key={r.percent}>
                                    <button
                                        onClick={() => setSelectedResult(r)}
                                        className={`w-full flex justify-between items-center p-3 rounded-md text-lg md:text-base transition-colors ${selectedResult?.percent === r.percent ? 'bg-gradient-to-r from-slate-300 to-blue-200 text-text-main shadow-md' : 'hover:bg-slate-100/60'}`}
                                    >
                                        <span className={`font-bold text-2xl md:text-lg ${selectedResult?.percent === r.percent ? 'text-slate-800' : 'text-slate-700'}`}>{r.percent}%</span>
                                        <div className="text-right">
                                            <p className="font-semibold text-lg md:text-base">{formatCurrency(r.total)}</p>
                                            <p className={`text-base md:text-sm ${selectedResult?.percent === r.percent ? 'text-text-main/80' : 'text-text-main/70'}`}>
                                                Wastage: {formatCurrency(r.wastageValue)} ({r.wastageInGrams.toFixed(3)} gm)
                                            </p>
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-center text-text-main/60 p-4">Enter parameters and click 'Calculate' to see results.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Customer View Modal */}
            {showCustomerView && selectedResult && (() => {
                const price = parseFloat(silverPrice);
                const weight = parseFloat(silverWeight);
                const purityDecimal = 1.0; // Pure Silver 100%
                const purityPercentage = '100%'; // Pure Silver
                const effectiveSilverRate = price * purityDecimal;
                const pureSilverWeight = weight * purityDecimal;

                const handleShare = async () => {
                    const shareText = `🏪 *NL JEWELLERS*\n\n🤍 *SILVER PRICE BREAKDOWN*\n\n📊 Item Details:\n• Silver Type: 999 (Pure Silver)\n• Total Weight: ${weight} grams\n• Purity: 100% Pure Silver\n• Pure Silver Weight: ${pureSilverWeight.toFixed(3)} grams\n\n💵 Rate Information:\n• Silver Rate (999/gram): ${formatCurrency(price)}\n• Effective Rate (999): ${formatCurrency(effectiveSilverRate)}/gram\n\n🧮 Price Calculation:\n1. Silver Value: ${formatCurrency(selectedResult.purityValue)}\n   (${weight} grams × ${formatCurrency(effectiveSilverRate)}/gram)\n\n2. Wastage Charges: ${formatCurrency(selectedResult.wastageValue)}\n   (Weight equivalent: ${selectedResult.wastageInGrams.toFixed(3)} grams)\n\n✨ *TOTAL AMOUNT: ${formatCurrency(selectedResult.total)}*\n\n📏 Per Gram Summary:\n• Effective cost per gram: ${formatCurrency(selectedResult.total / weight)}/gram\n• Pure silver per gram: ${formatCurrency(selectedResult.purityValue / weight)}/gram`;

                    if (navigator.share) {
                        try {
                            await navigator.share({
                                title: 'NL Jewellers - Silver Price Breakdown',
                                text: shareText,
                            });
                        } catch (err) {
                            if ((err as Error).name !== 'AbortError') {
                                console.error('Error sharing:', err);
                            }
                        }
                    } else {
                        // Fallback: Copy to clipboard
                        try {
                            await navigator.clipboard.writeText(shareText);
                            alert('Price breakdown copied to clipboard!');
                        } catch (err) {
                            console.error('Error copying to clipboard:', err);
                            alert('Unable to share. Please try again.');
                        }
                    }
                };

                return (
                    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                            {/* NL Jewellers Branding Header */}
                            <div className="rounded-t-xl p-6" style={{ background: 'linear-gradient(to right, #800000, #990000)' }}>
                                <h1 className="text-3xl font-serif font-bold text-center tracking-wide mb-1" style={{ color: '#D4AF37', textShadow: '1px 1px 3px rgba(0,0,0,0.3)' }}>NL JEWELLERS</h1>
                                <p className="text-lg text-center" style={{ color: 'rgba(255, 248, 231, 0.8)' }}>Silver</p>
                            </div>

                            <div className="p-6">
                                <div className="mb-6">
                                    <h2
                                        className="text-2xl font-serif font-bold text-gray-700 cursor-pointer select-none text-center"
                                        onClick={() => {
                                            const newCount = closeClickCount + 1;
                                            setCloseClickCount(newCount);
                                            if (newCount >= 5) {
                                                setShowCustomerView(false);
                                                setCloseClickCount(0);
                                            }
                                        }}
                                    >
                                        💰 Price Breakdown
                                    </h2>
                                </div>

                                <div className="space-y-4">
                                    {/* Basic Details */}
                                    <div className="bg-gray-50 p-5 rounded-lg border border-gray-300">
                                        <h3 className="font-semibold text-gray-700 mb-3 text-center text-lg">📊 Item Details</h3>
                                        <div className="space-y-2 text-base">
                                            <div className="flex justify-between">
                                                <span className="text-text-main/70">Silver Type:</span>
                                                <span className="font-semibold text-text-main">999 (Pure Silver)</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-text-main/70">Total Weight:</span>
                                                <span className="font-semibold text-text-main">{weight} grams</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-text-main/70">Purity:</span>
                                                <span className="font-semibold text-text-main">{purityPercentage} Pure Silver</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-text-main/70">Pure Silver Weight:</span>
                                                <span className="font-semibold text-text-main">{pureSilverWeight.toFixed(3)} grams</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Rate Information */}
                                    <div className="bg-gray-50 p-5 rounded-lg border border-gray-300">
                                        <h3 className="font-semibold text-gray-700 mb-3 text-center text-lg">💵 Rate Information</h3>
                                        <div className="space-y-2 text-base">
                                            <div className="flex justify-between">
                                                <span className="text-text-main/70">Silver Rate (999/gram):</span>
                                                <span className="font-semibold text-text-main">{formatCurrency(price)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-text-main/70">Effective Rate ({purity}):</span>
                                                <span className="font-semibold text-text-main">{formatCurrency(effectiveSilverRate)}/gram</span>
                                            </div>
                                            <div className="text-xs text-text-main/60 pl-4 italic">
                                                ({formatCurrency(price)} × {purityPercentage})
                                            </div>
                                        </div>
                                    </div>

                                    {/* Detailed Calculation */}
                                    <div className="bg-gray-50 p-5 rounded-lg border border-gray-300">
                                        <h3 className="font-semibold text-gray-700 mb-3 text-center text-lg">🧮 Price Calculation</h3>
                                        <div className="space-y-3 text-base">
                                            {/* Silver Value */}
                                            <div>
                                                <div className="flex justify-between">
                                                    <span className="text-text-main/70 font-medium">1. Silver Value:</span>
                                                    <span className="font-semibold text-text-main">{formatCurrency(selectedResult.purityValue)}</span>
                                                </div>
                                                <div className="text-sm text-text-main/60 pl-4 mt-1">
                                                    {weight} grams × {formatCurrency(effectiveSilverRate)}/gram
                                                </div>
                                            </div>

                                            {/* Wastage Charges */}
                                            <div className="pt-2 border-t border-gray-300">
                                                <div className="flex justify-between">
                                                    <span className="text-text-main/70 font-medium">2. Wastage Charges:</span>
                                                    <span className="font-semibold text-text-main">{formatCurrency(selectedResult.wastageValue)}</span>
                                                </div>
                                                <div className="text-sm text-text-main/60 pl-4 mt-1">
                                                    Weight equivalent: {selectedResult.wastageInGrams.toFixed(3)} grams
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Total */}
                                    <div className="bg-gradient-to-r from-gray-200 to-gray-100 p-5 rounded-lg border-2 border-gray-400">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-bold text-xl text-gray-700">Total Amount:</span>
                                            <span className="font-bold text-2xl text-gray-700">{formatCurrency(selectedResult.total)}</span>
                                        </div>
                                        <div className="text-sm text-text-main/70 text-center">
                                            ({formatCurrency(selectedResult.purityValue)} + {formatCurrency(selectedResult.wastageValue)})
                                        </div>
                                    </div>

                                    {/* Per Gram Summary */}
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-300">
                                        <h4 className="font-semibold text-gray-700 mb-2 text-center">📏 Per Gram Summary</h4>
                                        <div className="text-sm space-y-1">
                                            <div className="flex justify-between">
                                                <span className="text-text-main/70">Effective cost per gram:</span>
                                                <span className="font-medium">{formatCurrency(selectedResult.total / weight)}/gram</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-text-main/70">Pure silver per gram:</span>
                                                <span className="font-medium">{formatCurrency(selectedResult.purityValue / weight)}/gram</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <button
                                        onClick={handleShare}
                                        className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                        </svg>
                                        Share
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};


const SilverCalculatorModal: React.FC<SilverCalculatorModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in" role="dialog" aria-modal="true">
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
            `}</style>
            <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 border-b border-gray-300/20 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-xl font-serif font-bold text-gray-700">
                        Silver Price Calculator
                    </h2>
                    <button onClick={onClose} className="text-text-main/60 hover:text-gray-700" aria-label="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <SilverCalculator />
            </div>
        </div>
    );
};

export { SilverCalculator };
export default SilverCalculatorModal;

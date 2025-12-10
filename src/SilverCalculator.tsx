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
    const [purity, setPurity] = useState<'925' | '999'>('925');
    const [minPercent, setMinPercent] = useState('12');
    const [maxPercent, setMaxPercent] = useState('20');
    const [errors, setErrors] = useState<Partial<Record<keyof Omit<SilverCalculationParams, 'id' | 'purity' | 'selectedPercent'>, string>>>({});

    const [results, setResults] = useState<ResultDetail[]>([]);
    const [selectedResult, setSelectedResult] = useState<ResultDetail | null>(null);
    const [showProfitMargin, setShowProfitMargin] = useState(false); // Default: hidden
    const [showCustomerView, setShowCustomerView] = useState(false); // Customer view modal

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
        const purityDecimal = purity === '925' ? 0.925 : 0.999;

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
    }, [silverPrice, silverWeight, purity, minPercent, maxPercent, validate]);

    // Auto-update wastage percentages based on purity
    useEffect(() => {
        if (purity === '925') {
            setMinPercent('12');
            setMaxPercent('20');
        } else if (purity === '999') {
            setMinPercent('8');
            setMaxPercent('15');
        }
    }, [purity]);

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
        setPurity(params.purity);
        setMinPercent(params.minPercent);
        setMaxPercent(params.maxPercent);
        setLoadRequest(params);
    };

    const deleteCalculation = (id: string) => {
        setSavedCalculations(prev => prev.filter(c => c.id !== id));
    };

    const renderInputField = (label: string, value: string, setter: (val: string) => void, name: keyof typeof errors, placeholder: string) => (
        <div>
            <label className="block text-lg font-medium text-text-main/90">{label}</label>
            <input
                type="number"
                value={value}
                onChange={e => setter(e.target.value)}
                placeholder={placeholder}
                className={`mt-1 block w-full px-4 py-3 bg-white/50 border ${errors[name] ? 'border-highlight-red' : 'border-gray-400/50'} rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 text-lg`}
            />
            {errors[name] && <p className="mt-1 text-sm text-highlight-red">{errors[name]}</p>}
        </div>
    );

    return (
        <div className="flex-grow p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 overflow-y-auto">
            {/* Left Column: Inputs & Saved */}
            <div className="flex flex-col gap-6">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-300/20 shadow-sm">
                    <h3 className="text-2xl font-serif font-bold text-gray-700 mb-4">Parameters</h3>
                    <div className="space-y-4">
                        {renderInputField("Silver Price (per gram)", silverPrice, setSilverPrice, 'silverPrice', 'e.g., 85')}
                        {renderInputField("Silver Weight (grams)", silverWeight, setSilverWeight, 'silverWeight', 'e.g., 50')}
                        <div>
                            <label className="block text-lg font-medium text-text-main/90">Purity</label>
                            <select value={purity} onChange={e => setPurity(e.target.value as '925' | '999')} className="mt-1 block w-full px-4 py-3 bg-white/50 border border-gray-400/50 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 text-lg">
                                <option value="925">925 (Sterling Silver)</option>
                                <option value="999">999 (Pure Silver)</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {renderInputField("Min Wastage %", minPercent, setMinPercent, 'minPercent', 'e.g., 12')}
                            {renderInputField("Max Wastage %", maxPercent, setMaxPercent, 'maxPercent', 'e.g., 20')}
                        </div>
                        <div className="flex gap-4 pt-2">
                            <button onClick={handleCalculate} className="w-full bg-gray-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors text-lg">Calculate</button>
                            <button onClick={handleSave} className="w-full bg-white border border-gray-600 text-gray-600 font-bold py-3 px-4 rounded-lg hover:bg-gray-100 transition-colors text-lg">Save</button>
                        </div>
                    </div>
                </div>
                <div className="flex-grow flex flex-col">
                    <h3 className="text-2xl font-serif font-bold text-gray-700 mb-2">Saved Calculations</h3>
                    <div className="flex-grow bg-gray-50 p-2 rounded-lg border border-gray-300/20 shadow-sm overflow-y-auto">
                        {savedCalculations.length > 0 ? (
                            <ul className="space-y-2">
                                {savedCalculations.map(c => (
                                    <li key={c.id} className="group flex items-center justify-between p-3 rounded-md hover:bg-gray-200/50 transition-colors">
                                        <button onClick={() => loadCalculation(c)} className="text-left flex-grow">
                                            <p className="font-semibold text-text-main text-base">
                                                {c.silverWeight}g - {c.purity}
                                                {c.selectedPercent !== undefined
                                                    ? <span className="text-gray-700"> - Selected: {c.selectedPercent}%</span>
                                                    : ` - ${c.minPercent}% to ${c.maxPercent}%`
                                                }
                                            </p>
                                            <p className="text-sm text-text-main/70">Total: {formatCurrency(calculateTotalFromParams(c))}</p>
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
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-300/20 shadow-sm flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-serif font-bold text-gray-700">Results</h3>
                    {results.length > 1 && (
                        <button
                            onClick={() => setShowProfitMargin(!showProfitMargin)}
                            className="p-2 bg-gray-300/50 hover:bg-gray-300/70 border border-gray-400/40 rounded-md transition-colors text-gray-700"
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
                        <div className="mb-4 bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-md shadow-sm border-2 border-green-400/50">
                            <h4 className="font-semibold text-green-800 text-center mb-2 text-base">💰 Profit Margin</h4>
                            <div className="space-y-1 text-sm">
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
                        <h4 className="font-semibold text-text-main text-center mb-3 text-xl">
                            Details for {selectedResult.percent}% Wastage
                        </h4>
                        <div className="space-y-2 text-lg">
                            <div className="flex justify-between">
                                <span className="text-text-main/80">Purity Value:</span>
                                <span className="font-medium text-text-main">{formatCurrency(selectedResult.purityValue)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-text-main/80">Wastage ({selectedResult.wastageInGrams.toFixed(3)} gm):</span>
                                <span className="font-medium text-text-main">{formatCurrency(selectedResult.wastageValue)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-2xl border-t-2 pt-2 mt-2 border-gray-400/30 text-gray-700">
                                <span>Total Price:</span>
                                <span>{formatCurrency(selectedResult.total)}</span>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowCustomerView(true)}
                            className="mt-4 w-full bg-gray-700 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 text-lg"
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
                                        className={`w-full flex justify-between items-center p-3 rounded-md text-base transition-colors ${selectedResult?.percent === r.percent ? 'bg-gray-300 text-text-main shadow-sm' : 'hover:bg-gray-200/50'}`}
                                    >
                                        <span className={`font-bold text-lg ${selectedResult?.percent === r.percent ? '' : 'text-gray-700'}`}>{r.percent}%</span>
                                        <div className="text-right">
                                            <p className="font-semibold text-base">{formatCurrency(r.total)}</p>
                                            <p className={`text-sm ${selectedResult?.percent === r.percent ? 'text-text-main/80' : 'text-text-main/70'}`}>
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
            {showCustomerView && selectedResult && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4" onClick={() => setShowCustomerView(false)}>
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-serif font-bold text-gray-700">Price Calculation</h2>
                            <button onClick={() => setShowCustomerView(false)} className="text-text-main/60 hover:text-gray-700">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4 bg-gray-50 p-5 rounded-lg border border-gray-300">
                            <div className="pb-3 border-b border-gray-300">
                                <h3 className="font-semibold text-gray-700 mb-3 text-center text-lg">Silver Details</h3>
                                <div className="space-y-2 text-base">
                                    <div className="flex justify-between">
                                        <span className="text-text-main/70">Weight:</span>
                                        <span className="font-semibold text-text-main">{silverWeight} grams</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-text-main/70">Purity:</span>
                                        <span className="font-semibold text-text-main">{purity} ({purity === '925' ? 'Sterling' : 'Pure'})</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-text-main/70">Rate per gram:</span>
                                        <span className="font-semibold text-text-main">{formatCurrency(parseFloat(silverPrice))}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pb-3 border-b border-gray-300">
                                <h3 className="font-semibold text-gray-700 mb-3 text-center text-lg">Calculation Breakdown</h3>
                                <div className="space-y-2 text-base">
                                    <div className="flex justify-between">
                                        <span className="text-text-main/70">Silver Value:</span>
                                        <span className="font-medium text-text-main">{formatCurrency(selectedResult.purityValue)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-text-main/70">Making Charges:</span>
                                        <span className="font-medium text-text-main">{formatCurrency(selectedResult.wastageValue)}</span>
                                    </div>
                                    <div className="text-xs text-text-main/60 pl-4">
                                        ({selectedResult.wastageInGrams.toFixed(3)} grams equivalent)
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-r from-gray-300/40 to-gray-200/30 p-4 rounded-lg">
                                <div className="flex justify-between items-center font-bold text-2xl text-gray-700">
                                    <span>Total Amount:</span>
                                    <span>{formatCurrency(selectedResult.total)}</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowCustomerView(false)}
                            className="mt-6 w-full bg-gray-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
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

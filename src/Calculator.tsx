import React, { useState, useCallback, useEffect } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { DeleteIcon } from './Icons';
import { SilverCalculator } from './SilverCalculator';

interface CalculatorModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface CalculationParams {
    id: string;
    goldPrice: string;
    goldWeight: string;
    purity: '916' | '750';
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
const calculateTotalFromParams = (params: CalculationParams): number => {
    const price = parseFloat(params.goldPrice);
    const weight = parseFloat(params.goldWeight);
    const purityDecimal = params.purity === '916' ? 0.92 : 0.75;
    const percent = params.selectedPercent !== undefined ? params.selectedPercent : parseInt(params.minPercent, 10);

    const wastagePercentDecimal = percent / 100;
    const purityValue = weight * purityDecimal * price;
    const wastageValue = weight * wastagePercentDecimal * price;
    const total = purityValue + wastageValue;

    return total;
};

const GoldCalculator: React.FC = () => {
    const [goldPrice, setGoldPrice] = useState('');
    const [goldWeight, setGoldWeight] = useState('');
    const [purity, setPurity] = useState<'916' | '750'>('916');
    const [minPercent, setMinPercent] = useState('8');
    const [maxPercent, setMaxPercent] = useState('14');
    const [errors, setErrors] = useState<Partial<Record<keyof Omit<CalculationParams, 'id' | 'purity' | 'selectedPercent'>, string>>>({});

    const [results, setResults] = useState<ResultDetail[]>([]);
    const [selectedResult, setSelectedResult] = useState<ResultDetail | null>(null);
    const [showProfitMargin, setShowProfitMargin] = useState(false); // Default: hidden
    const [showCustomerView, setShowCustomerView] = useState(false); // Customer view modal

    const [savedCalculations, setSavedCalculations] = useLocalStorage<CalculationParams[]>('goldCalculatorSaves', []);
    const [loadRequest, setLoadRequest] = useState<CalculationParams | null>(null);

    const validate = useCallback(() => {
        const newErrors: Partial<Record<keyof Omit<CalculationParams, 'id' | 'purity' | 'selectedPercent'>, string>> = {};
        if (!goldPrice || parseFloat(goldPrice) <= 0) newErrors.goldPrice = 'Invalid price';
        if (!goldWeight || parseFloat(goldWeight) <= 0) newErrors.goldWeight = 'Invalid weight';
        if (!minPercent || parseInt(minPercent, 10) < 0) newErrors.minPercent = 'Invalid %';
        if (!maxPercent || parseInt(maxPercent, 10) < 0) newErrors.maxPercent = 'Invalid %';
        if (parseInt(minPercent, 10) > parseInt(maxPercent, 10)) newErrors.maxPercent = 'Max must be >= min';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [goldPrice, goldWeight, minPercent, maxPercent]);

    const calculateAndSelect = useCallback((selectedPercent?: number) => {
        if (!validate()) {
            setResults([]);
            setSelectedResult(null);
            return;
        };

        const price = parseFloat(goldPrice);
        const weight = parseFloat(goldWeight);
        const purityDecimal = purity === '916' ? 0.92 : 0.75;

        const min = parseInt(minPercent, 10);
        const max = parseInt(maxPercent, 10);
        const newResults: ResultDetail[] = [];

        for (let i = min; i <= max; i++) {
            const wastagePercentDecimal = i / 100;
            const purityValue = weight * purityDecimal * price;
            const wastageValue = weight * wastagePercentDecimal * price;
            const total = purityValue + wastageValue;

            // As per user request: WastageInGrams = wastageValue / (pricePerGram × purity)
            const rateOfAlloyedGold = price * purityDecimal;
            const wastageInGrams = rateOfAlloyedGold > 0 ? wastageValue / rateOfAlloyedGold : 0;

            newResults.push({ percent: i, wastageValue, purityValue, total, wastageInGrams });
        }
        setResults(newResults);

        if (selectedPercent !== undefined) {
            const resultToSelect = newResults.find(r => r.percent === selectedPercent);
            setSelectedResult(resultToSelect || newResults[0] || null);
        } else {
            setSelectedResult(newResults[0] || null);
        }
    }, [goldPrice, goldWeight, purity, minPercent, maxPercent, validate]);

    // Auto-update wastage percentages based on purity
    useEffect(() => {
        if (purity === '916') {
            setMinPercent('8');
            setMaxPercent('14');
        } else if (purity === '750') {
            setMinPercent('10');
            setMaxPercent('18');
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
        const newSave: CalculationParams = {
            id: Date.now().toString(),
            goldPrice, goldWeight, purity, minPercent, maxPercent,
            selectedPercent: selectedResult?.percent,
        };
        setSavedCalculations(prev => [newSave, ...prev.slice(0, 9)]); // Limit to 10 saves
    };

    const loadCalculation = (params: CalculationParams) => {
        setGoldPrice(params.goldPrice);
        setGoldWeight(params.goldWeight);
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
            <label className="block text-xl md:text-lg font-medium text-text-main/90">{label}</label>
            <input
                type="number"
                value={value}
                onChange={e => setter(e.target.value)}
                placeholder={placeholder}
                className={`mt-1 block w-full px-4 py-4 md:py-3 bg-ivory/50 border ${errors[name] ? 'border-highlight-red' : 'border-primary-gold/50'} rounded-md shadow-sm focus:outline-none focus:ring-primary-gold focus:border-primary-gold text-xl md:text-lg`}
            />
            {errors[name] && <p className="mt-1 text-base md:text-sm text-highlight-red">{errors[name]}</p>}
        </div>
    );

    return (
        <div className="flex-grow p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 overflow-y-auto">
            {/* Left Column: Inputs & Saved */}
            <div className="flex flex-col gap-6">
                <div className="bg-ivory/60 p-6 rounded-lg border border-primary-gold/20 shadow-sm">
                    <h3 className="text-3xl md:text-2xl font-serif font-bold text-accent-maroon mb-4">Parameters</h3>
                    <div className="space-y-4">
                        {renderInputField("Gold Price (per gram)", goldPrice, setGoldPrice, 'goldPrice', 'e.g., 7200')}
                        {renderInputField("Gold Weight (grams)", goldWeight, setGoldWeight, 'goldWeight', 'e.g., 10')}
                        <div>
                            <label className="block text-xl md:text-lg font-medium text-text-main/90">Purity</label>
                            <select value={purity} onChange={e => setPurity(e.target.value as '916' | '750')} className="mt-1 block w-full px-4 py-4 md:py-3 bg-ivory/50 border border-primary-gold/50 rounded-md shadow-sm focus:outline-none focus:ring-primary-gold focus:border-primary-gold text-xl md:text-lg">
                                <option value="916">916 (22K)</option>
                                <option value="750">750 (18K)</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {renderInputField("Min Wastage %", minPercent, setMinPercent, 'minPercent', 'e.g., 3')}
                            {renderInputField("Max Wastage %", maxPercent, setMaxPercent, 'maxPercent', 'e.g., 10')}
                        </div>
                        <div className="flex gap-4 pt-2">
                            <button onClick={handleCalculate} className="w-full bg-primary-gold text-text-main font-bold py-4 md:py-3 px-4 rounded-lg hover:bg-button-hover-gold transition-colors text-xl md:text-lg">Calculate</button>
                            <button onClick={handleSave} className="w-full bg-ivory border border-primary-gold text-primary-gold font-bold py-4 md:py-3 px-4 rounded-lg hover:bg-primary-gold/10 transition-colors text-xl md:text-lg">Save</button>
                        </div>
                    </div>
                </div>
                <div className="flex-grow flex flex-col">
                    <h3 className="text-3xl md:text-2xl font-serif font-bold text-accent-maroon mb-2">Saved Calculations</h3>
                    <div className="flex-grow bg-ivory/60 p-2 rounded-lg border border-primary-gold/20 shadow-sm overflow-y-auto">
                        {savedCalculations.length > 0 ? (
                            <ul className="space-y-2">
                                {savedCalculations.map(c => (
                                    <li key={c.id} className="group flex items-center justify-between p-4 md:p-3 rounded-md hover:bg-primary-gold/10 transition-colors">
                                        <button onClick={() => loadCalculation(c)} className="text-left flex-grow">
                                            <p className="font-semibold text-text-main text-xl md:text-base">
                                                {c.goldWeight}g - {c.purity}
                                                {c.selectedPercent !== undefined
                                                    ? <span className="text-accent-maroon"> - Selected: {c.selectedPercent}%</span>
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
            <div className="bg-ivory/60 p-4 rounded-lg border border-primary-gold/20 shadow-sm flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-3xl md:text-2xl font-serif font-bold text-accent-maroon">Results</h3>
                    {results.length > 1 && (
                        <button
                            onClick={() => setShowProfitMargin(!showProfitMargin)}
                            className="p-2 bg-primary-gold/20 hover:bg-primary-gold/30 border border-primary-gold/40 rounded-md transition-colors text-accent-maroon"
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
                    const minResult = results[0]; // First result (minimum percentage)
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
                    <div className="mb-4 bg-white/50 p-4 rounded-md shadow-inner border border-primary-gold/10">
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
                            <div className="flex justify-between font-bold text-3xl md:text-2xl border-t-2 pt-2 mt-2 border-primary-gold/30 text-accent-maroon">
                                <span>Total Price:</span>
                                <span>{formatCurrency(selectedResult.total)}</span>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowCustomerView(true)}
                            className="mt-4 w-full bg-accent-maroon text-white font-bold py-4 md:py-3 px-4 rounded-lg hover:bg-accent-maroon/90 transition-colors flex items-center justify-center gap-2 text-xl md:text-lg"
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
                                        className={`w-full flex justify-between items-center p-3 rounded-md text-lg md:text-base transition-colors ${selectedResult?.percent === r.percent ? 'bg-primary-gold text-text-main shadow-sm' : 'hover:bg-primary-gold/10'}`}
                                    >
                                        <span className={`font-bold text-2xl md:text-lg ${selectedResult?.percent === r.percent ? '' : 'text-accent-maroon'}`}>{r.percent}%</span>
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
                const price = parseFloat(goldPrice);
                const weight = parseFloat(goldWeight);
                const purityDecimal = purity === '916' ? 0.92 : 0.75;
                const purityPercentage = purity === '916' ? '92%' : '75%';
                const effectiveGoldRate = price * purityDecimal;
                const pureGoldWeight = weight * purityDecimal;

                return (
                    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4" onClick={() => setShowCustomerView(false)}>
                        <div className="bg-ivory rounded-xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-serif font-bold text-accent-maroon">💰 Price Breakdown</h2>
                                <button onClick={() => setShowCustomerView(false)} className="text-text-main/60 hover:text-accent-maroon">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Basic Details */}
                                <div className="bg-white/50 p-5 rounded-lg border border-primary-gold/30">
                                    <h3 className="font-semibold text-accent-maroon mb-3 text-center text-lg">📊 Item Details</h3>
                                    <div className="space-y-2 text-base">
                                        <div className="flex justify-between">
                                            <span className="text-text-main/70">Gold Type:</span>
                                            <span className="font-semibold text-text-main">{purity} ({purity === '916' ? '22 Karat' : '18 Karat'})</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-text-main/70">Total Weight:</span>
                                            <span className="font-semibold text-text-main">{weight} grams</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-text-main/70">Purity:</span>
                                            <span className="font-semibold text-text-main">{purityPercentage} Pure Gold</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-text-main/70">Pure Gold Weight:</span>
                                            <span className="font-semibold text-text-main">{pureGoldWeight.toFixed(3)} grams</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Rate Information */}
                                <div className="bg-white/50 p-5 rounded-lg border border-primary-gold/30">
                                    <h3 className="font-semibold text-accent-maroon mb-3 text-center text-lg">💵 Rate Information</h3>
                                    <div className="space-y-2 text-base">
                                        <div className="flex justify-between">
                                            <span className="text-text-main/70">Gold Rate (24K/gram):</span>
                                            <span className="font-semibold text-text-main">{formatCurrency(price)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-text-main/70">Effective Rate ({purity}):</span>
                                            <span className="font-semibold text-text-main">{formatCurrency(effectiveGoldRate)}/gram</span>
                                        </div>
                                        <div className="text-xs text-text-main/60 pl-4 italic">
                                            ({formatCurrency(price)} × {purityPercentage})
                                        </div>
                                    </div>
                                </div>

                                {/* Detailed Calculation */}
                                <div className="bg-white/50 p-5 rounded-lg border border-primary-gold/30">
                                    <h3 className="font-semibold text-accent-maroon mb-3 text-center text-lg">🧮 Price Calculation</h3>
                                    <div className="space-y-3 text-base">
                                        {/* Gold Value */}
                                        <div>
                                            <div className="flex justify-between">
                                                <span className="text-text-main/70 font-medium">1. Gold Value:</span>
                                                <span className="font-semibold text-text-main">{formatCurrency(selectedResult.purityValue)}</span>
                                            </div>
                                            <div className="text-sm text-text-main/60 pl-4 mt-1">
                                                {weight} grams × {formatCurrency(effectiveGoldRate)}/gram
                                            </div>
                                        </div>

                                        {/* Making Charges */}
                                        <div className="pt-2 border-t border-primary-gold/20">
                                            <div className="flex justify-between">
                                                <span className="text-text-main/70 font-medium">2. Making Charges ({selectedResult.percent}%):</span>
                                                <span className="font-semibold text-text-main">{formatCurrency(selectedResult.wastageValue)}</span>
                                            </div>
                                            <div className="text-sm text-text-main/60 pl-4 mt-1 space-y-1">
                                                <div>• Percentage: {selectedResult.percent}% on total weight</div>
                                                <div>• Weight equivalent: {selectedResult.wastageInGrams.toFixed(3)} grams</div>
                                                <div>• Calculation: {weight} grams × {selectedResult.percent}% × {formatCurrency(price)}/gram</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Total */}
                                <div className="bg-gradient-to-r from-primary-gold/30 to-primary-gold/20 p-5 rounded-lg border-2 border-primary-gold/50">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-xl text-accent-maroon">Total Amount:</span>
                                        <span className="font-bold text-2xl text-accent-maroon">{formatCurrency(selectedResult.total)}</span>
                                    </div>
                                    <div className="text-sm text-text-main/70 text-center">
                                        ({formatCurrency(selectedResult.purityValue)} + {formatCurrency(selectedResult.wastageValue)})
                                    </div>
                                </div>

                                {/* Per Gram Summary */}
                                <div className="bg-white/50 p-4 rounded-lg border border-primary-gold/20">
                                    <h4 className="font-semibold text-accent-maroon mb-2 text-center">📏 Per Gram Summary</h4>
                                    <div className="text-sm space-y-1">
                                        <div className="flex justify-between">
                                            <span className="text-text-main/70">Effective cost per gram:</span>
                                            <span className="font-medium">{formatCurrency(selectedResult.total / weight)}/gram</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-text-main/70">Pure gold per gram:</span>
                                            <span className="font-medium">{formatCurrency(selectedResult.purityValue / weight)}/gram</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowCustomerView(false)}
                                className="mt-6 w-full bg-primary-gold text-text-main font-bold py-3 px-4 rounded-lg hover:bg-button-hover-gold transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};


const CalculatorModal: React.FC<CalculatorModalProps> = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<'gold' | 'silver'>('gold');

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
                className="bg-ivory rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 border-b border-primary-gold/20 flex justify-between items-center flex-shrink-0">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveTab('gold')}
                            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'gold'
                                ? 'bg-primary-gold text-text-main shadow-md'
                                : 'bg-ivory/50 text-text-main/60 hover:bg-primary-gold/20'
                                }`}
                        >
                            💛 Gold
                        </button>
                        <button
                            onClick={() => setActiveTab('silver')}
                            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'silver'
                                ? 'bg-gray-400 text-white shadow-md'
                                : 'bg-ivory/50 text-text-main/60 hover:bg-gray-200'
                                }`}
                        >
                            🤍 Silver
                        </button>
                    </div>
                    <button onClick={onClose} className="text-text-main/60 hover:text-accent-maroon" aria-label="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                {activeTab === 'gold' ? <GoldCalculator /> : <SilverCalculator />}
            </div>
        </div>
    );
};

export { GoldCalculator };
export default CalculatorModal;
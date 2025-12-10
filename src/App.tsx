import React, { useState } from 'react';
import { GoldCalculator } from './Calculator';
import { SilverCalculator } from './SilverCalculator';

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'gold' | 'silver'>('gold');

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #FFF8E7 0%, #F5EDD8 100%)',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Header */}
            <header style={{
                background: 'linear-gradient(to right, #800000, #990000)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                padding: '1.5rem 1rem',
                textAlign: 'center'
            }}>
                <h1 style={{
                    fontSize: '2rem',
                    fontFamily: '\'Playfair Display\', serif',
                    fontWeight: 'bold',
                    color: '#D4AF37',
                    textShadow: '1px 1px 3px rgba(0,0,0,0.3)',
                    marginBottom: '0.5rem'
                }}>
                    NL Jewellers
                </h1>
                <p style={{
                    color: 'rgba(255, 248, 231, 0.8)',
                    fontSize: '0.875rem'
                }}>
                    Gold & Silver Price Calculator
                </p>
            </header>

            {/* Calculator Container */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                maxWidth: '1400px',
                width: '100%',
                margin: '0 auto',
                padding: '1rem'
            }}>
                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    marginBottom: '1rem',
                    justifyContent: 'center'
                }}>
                    <button
                        onClick={() => setActiveTab('gold')}
                        style={{
                            padding: '0.75rem 2rem',
                            borderRadius: '0.5rem',
                            fontWeight: '600',
                            fontSize: '1rem',
                            transition: 'all 0.2s',
                            background: activeTab === 'gold' ? '#D4AF37' : 'rgba(255, 248, 231, 0.5)',
                            color: activeTab === 'gold' ? '#222' : 'rgba(34, 34, 34, 0.6)',
                            boxShadow: activeTab === 'gold' ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none'
                        }}
                    >
                        💛 Gold
                    </button>
                    <button
                        onClick={() => setActiveTab('silver')}
                        style={{
                            padding: '0.75rem 2rem',
                            borderRadius: '0.5rem',
                            fontWeight: '600',
                            fontSize: '1rem',
                            transition: 'all 0.2s',
                            background: activeTab === 'silver' ? '#9ca3af' : 'rgba(255, 248, 231, 0.5)',
                            color: activeTab === 'silver' ? '#fff' : 'rgba(34, 34, 34, 0.6)',
                            boxShadow: activeTab === 'silver' ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none'
                        }}
                    >
                        🤍 Silver
                    </button>
                </div>

                {/* Calculator Content */}
                <div style={{
                    flex: 1,
                    background: '#FFF8E7',
                    borderRadius: '1rem',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {activeTab === 'gold' ? <GoldCalculator /> : <SilverCalculator />}
                </div>
            </div>
        </div>
    );
};

export default App;

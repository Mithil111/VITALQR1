                                        <Save className="h-5 w-5 mr-2" />
                                        Save Customization Preferences
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* MODIFIED: QR Code Display Card with improved preview */}
                <Card className="bg-slate-900/40 border-cyan-400/30 backdrop-blur-xl hover-theme mb-6">
                    <CardContent className="flex flex-col items-center p-8 gap-6">
                        {/* QR Code Label */}
                        <div className="text-center">
                            <h2 className="text-white text-2xl font-bold mb-2 flex items-center justify-center gap-2">
                                {activeTab === 'online' ? (
                                    <>
                                        <Globe className="h-6 w-6 text-blue-400" />
                                        Online QR Code
                                    </>
                                ) : (
                                    <>
                                        <WifiOff className="h-6 w-6 text-purple-400" />
                                        Offline QR Code
                                    </>
                                )}
                            </h2>
                            <p className="text-blue-200/70 text-sm">
                                {activeTab === 'online' 
                                    ? 'Requires internet connection to access your full profile'
                                    : 'Works without internet with embedded medical data'
                                }
                            </p>
                        </div>

                        {/* Enhanced QR Code Card Preview */}
                        <div 
                            className="p-8 rounded-2xl shadow-2xl border-4 transition-all duration-300 hover:scale-105"
                            style={{ 
                                backgroundColor: cardBgColor,
                                borderColor: cardTextColor,
                                minWidth: '400px',
                                maxWidth: '500px',
                            }}
                        >
                            <h3 
                                className="text-center font-bold text-xl mb-4"
                                style={{ color: cardTextColor }}
                            >
                                EMERGENCY MEDICAL ID
                            </h3>
                            <img 
                                src={activeTab === 'online' ? onlineQR : offlineQR} 
                                alt={`${activeTab} QR Code`}
                                className="w-full h-full max-w-sm mx-auto"
                            />
                            {customText && (
                                <p 
                                    className={`text-center mt-4 font-semibold break-words ${
                                        textSize === 'small' ? 'text-sm' :
                                        textSize === 'large' ? 'text-xl' :
                                        'text-base'
                                    }`}
                                    style={{ color: cardTextColor }}
                                >
                                    {customText}
                                </p>
                            )}
                            <p 
                                className="text-center mt-4 text-sm"
                                style={{ color: cardTextColor }}
                            >
                                {activeTab === 'online' ? '🌐 Online (Requires Internet)' : '📴 Offline (Works Anywhere)'}
                            </p>
                        </div>

                        {/* MODIFIED: Action Buttons with better spacing and styling */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                            <Button
                                onClick={shareCard}
                                className="h-16 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-lg font-semibold transform hover:scale-105 transition-all duration-300"
                            >
                                <Share2 className="h-5 w-5 mr-2" />
                                📤 Share to Apps
                            </Button>
                            <Button
                                onClick={printCard}
                                className="h-16 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-lg font-semibold transform hover:scale-105 transition-all duration-300"
                            >
                                <Printer className="h-5 w-5 mr-2" />
                                🖨️ Print Card
                            </Button>
                        </div>

                        {/* ENHANCED: Info section */}
                        <div className="text-center text-blue-200/70 text-sm max-w-md space-y-2">
                            <p className="flex items-center justify-center gap-2">
                                <Palette className="h-4 w-4 text-cyan-400" />
                                🎨 Customize colors and text above
                            </p>
                            <p className="flex items-center justify-center gap-2">
                                <Download className="h-4 w-4 text-green-400" />
                                💳 Cards are wallet-sized (3.375" × 2.125")
                            </p>
                            <p className="flex items-center justify-center gap-2">
                                <Share2 className="h-4 w-4 text-purple-400" />
                                📱 Share to WhatsApp, Email, or Print
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

import { QrCode as QrCodeIcon } from 'lucide-react';

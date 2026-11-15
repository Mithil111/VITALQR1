                                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-700 text-white">
                                                    {allergy.severity.toUpperCase()}
                                                </span>
                                            </div>
                                            {allergy.reaction && (
                                                <p className="text-red-200 text-sm mt-1">Reaction: {allergy.reaction}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        <section className="p-4 bg-orange-500/10 rounded-xl border border-orange-400/30">
                            <h2 className="text-orange-300 font-semibold mb-3 text-lg flex items-center gap-2">
                                <Activity className="h-5 w-5" />
                                HIGH-PRIORITY MEDICAL CONDITIONS
                            </h2>
                            {conditions.length === 0 ? (
                                <p className="text-orange-100/70">No high-priority conditions listed.</p>
                            ) : (
                                <div className="space-y-2">
                                    {conditions.map((condition, index) => (
                                        <div key={`${condition.condition_name}-${index}`} className="p-3 bg-orange-500/20 rounded-lg">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <p className="text-white font-bold">{condition.condition_name}</p>
                                                <span className="px-2 py-1 rounded-full text-xs font-bold bg-orange-700 text-white">
                                                    {condition.priority_level.toUpperCase()}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        <section className="p-4 bg-blue-500/10 rounded-xl border border-blue-400/30">
                            <h2 className="text-blue-300 font-semibold mb-3 text-lg flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                ACTIVE MEDICATIONS
                            </h2>
                            {medications.length === 0 ? (
                                <p className="text-blue-100/70">No active medications listed.</p>
                            ) : (
                                <div className="space-y-2">
                                    {medications.map((medication, index) => (
                                        <div key={`${medication.medication_name}-${index}`} className="p-3 bg-blue-500/20 rounded-lg">
                                            <p className="text-white font-bold">{medication.medication_name}</p>
                                            {medication.dosage && <p className="text-blue-200 text-sm">Dosage: {medication.dosage}</p>}
                                            {medication.frequency && <p className="text-blue-200 text-sm">Frequency: {medication.frequency}</p>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        <section className="p-6 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl border-2 border-green-400/50">
                            <div className="flex items-center gap-2 mb-4">
                                <Phone className="h-6 w-6 text-green-400" />
                                <h2 className="text-green-300 font-bold text-xl">Primary Emergency Contact</h2>
                            </div>
                            {contact ? (
                                <div className="space-y-2">
                                    <p className="text-white text-2xl font-bold">{contact.name}</p>
                                    {contact.relationship && <p className="text-green-200">{contact.relationship}</p>}
                                    <a
                                        href={`tel:${contact.phone_number}`}
                                        className="inline-block text-white text-xl font-bold bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg mt-2"
                                    >
                                        Call {contact.phone_number}
                                    </a>
                                </div>
                            ) : (
                                <p className="text-green-100/70">No emergency contact has been added.</p>
                            )}
                        </section>

                        <div className="p-4 bg-cyan-500/10 rounded-xl border border-cyan-400/30">
                            <p className="text-cyan-200 text-sm flex items-start gap-2">
                                <Shield className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                <span>
                                    This page displays only the emergency summary returned by the secure database function.
                                    Private medical history and documents are not downloaded or unlocked on this public page.
                                </span>
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-yellow-400/30">
                    <CardContent className="p-5 flex items-start gap-3">
                        <Shield className="h-6 w-6 text-yellow-400 flex-shrink-0" />
                        <div>
                            <p className="text-white font-semibold">Private Medical History</p>
                            <p className="text-slate-300 text-sm mt-1">
                                Detailed medical history and uploaded documents are not available through the public QR page.
                                A server-side PIN verification feature must be implemented before this information can be safely shown.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <footer className="text-center text-cyan-300/70 text-sm py-6">
                    <p className="mb-2">VitalQR Emergency Medical Profile</p>
                    <p>Use this information to support emergency response.</p>
                </footer>
            </main>
        </div>
    );
}

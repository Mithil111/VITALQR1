export interface Profile {
    id: string;
    full_name: string;
    date_of_birth?: string;
    blood_type?: string;
    profile_pin?: string;
    language_preference: string;
    verified: boolean;
    avatar_url?: string;
    // QR customization fields
    qr_custom_text?: string;
    qr_text_size?: 'small' | 'medium' | 'large';
    card_bg_color?: string;
    card_text_color?: string; // ENSURE THIS EXISTS
    qr_fg_color?: string;
    qr_bg_color?: string;
    created_at: string;
    updated_at: string;
}

export interface MedicalCondition {
    id: string;
    user_id: string;
    condition_name: string;
    priority_level: 'low' | 'medium' | 'high' | 'critical';
    notes?: string;
    diagnosed_date?: string;
    created_at: string;
    updated_at: string;
}

export interface Allergy {
    id: string;
    user_id: string;
    allergen: string;
    severity: 'mild' | 'moderate' | 'severe' | 'life-threatening';
    reaction?: string;
    created_at: string;
    updated_at: string;
}

export interface Medication {
    id: string;
    user_id: string;
    medication_name: string;
    dosage?: string;
    frequency?: string;
    start_date?: string;
    end_date?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface EmergencyContact {
    id: string;
    user_id: string;
    name: string;
    relationship?: string;
    phone_number: string;
    is_primary: boolean;
    created_at: string;
    updated_at: string;
}

export interface MedicalDocument {
    id: string;
    user_id: string;
    document_name: string;
    document_type: 'prescription' | 'surgery';
    document_url: string;
    file_size?: number;
    notes?: string;
    uploaded_at: string;
}

export interface EmergencyHistory {
    id: string;
    user_id: string;
    incident_date: string;
    incident_type?: string;
    description?: string;
    location?: string;
    created_at: string;
}

export interface QRCode {
    id: string;
    user_id: string;
    qr_type: 'online' | 'offline';
    qr_data: string;
    qr_image_url?: string;
    color_theme: string;
    created_at: string;
    updated_at: string;
}

export interface ScanHistory {
    id: string;
    user_id: string;
    scanned_at: string;
    location_lat?: number;
    location_lng?: number;
    ip_address?: string;
}

export interface MedicalData {
    name?: string;
    age?: string;
    bloodGroup?: string;
    dob?: string;
    allergies?: string;
    operations?: string;
    conditions?: string;
    history?: string;
    emergencyContactName?: string;
    emergencyContactRelation?: string;
    emergencyContactPhone?: string;
    profilePin?: string; // NEW: Added PIN field
}
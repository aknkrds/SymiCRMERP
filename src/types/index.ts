// Types definition
export interface Message {
    id: string;
    threadId: string;
    senderId: string;
    senderName: string;
    recipientId: string;
    recipientName: string;
    subject?: string;
    content: string;
    relatedOrderId?: string;
    isRead: boolean;
    createdAt: string;
}

export interface Customer {
    id: string;
    companyName: string;
    address: string;
    phone: string;
    contactName: string;
    mobile: string;
    email: string;
    createdAt: string;
}

export type CustomerFormData = Omit<Customer, 'id' | 'createdAt'>;

export interface Product {
    id: string;
    code: string; // GMP01, etc.
    name: string; // Product Name (formerly description)
    productType: 'percinli' | 'sivama';
    boxShape?: string;
    
    // Legacy dimensions kept for compatibility if needed, but we might rely on dynamic fields later
    dimensions?: {
        length: number;
        width: number;
        depth: number;
    };

    // New Inks structure replacing 'colors'
    inks: {
        cmyk: boolean;
        white: boolean;
        pantones: string[]; // Array of codes
        goldLak: { has: boolean; code?: string };
        emaye: { has: boolean; code?: string };
        astar: { has: boolean; code?: string };
        silverLak: { has: boolean; code?: string };
        mold: boolean; // Kalıp
    };

    features: {
        hasLid: boolean;
        hasWindow: boolean;
        extras: string;
        gofre: boolean;
        gofreDetails?: {
            count: number;
            notes: string;
        };
        // foodGrade removed
    };
    
    details?: string;
    windowDetails?: {
        width: number;
        height: number;
        count: number;
    };
    lidDetails?: {
        material: string;
        paint: string;
        notes: string;
        hasGofre: boolean;
        gofreDetails?: {
            count: number;
            notes: string;
        };
        hasWindow: boolean;
        windowDimensions?: {
            width: number;
            height: number;
        };
        dimensions?: {
            length: number;
            width: number;
            depth: number;
        };
    };
    images?: {
        customer: string[]; // Base64 or URL
        // design removed
    };
    createdAt: string;
}

export type ProductFormData = Omit<Product, 'id' | 'createdAt'> & {
    code?: string;
};

export type OrderStatus = 
    | 'created' 
    | 'offer_sent' 
    | 'waiting_manager_approval'
    | 'manager_approved'
    | 'revision_requested'
    | 'offer_accepted' 
    | 'offer_cancelled'
    | 'supply_design_process'
    | 'design_pending' 
    | 'design_approved' 
    | 'supply_completed'
    | 'production_pending'
    | 'production_planned'
    | 'production_started'
    | 'production_completed'
    | 'invoice_added'
    | 'shipping_completed'
    | 'order_completed'
    | 'order_cancelled'
    | 'production_cancelled';

export interface OrderItem {
    id: string; // Product ID or temp ID
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    vatRate: number; // Percentage like 18 or 20
    total: number; // quantity * unitPrice * (1 + vatRate/100)
}

export interface Order {
    id: string;
    customerId: string;
    customerName: string;
    items: OrderItem[];
    currency: string;
    subtotal: number;
    vatTotal: number;
    grandTotal: number;
    status: OrderStatus;
    // Tasarım departmanı iş bilgileri
    jobSize?: string;       // İşin ebadı
    boxSize?: string;       // Kutu boyutu
    efficiency?: string;    // Verim
    assignedUserId?: string;
    assignedUserName?: string;
    assignedRoleName?: string;
    designStatus?: string; // Specific status for design flow
    procurementStatus?: string; // Specific status for procurement flow
    stockUsage?: Record<string, number>; // itemId -> quantity
    productionStatus?: string; // Specific status for production flow
    procurementDate?: string; // When procurement was completed
    procurementDetails?: Record<string, { // productId -> details
        plate: number;
        body: number;
        lid: number;
        bottom: number;
    }>;
    productionApprovedDetails?: Record<string, {
        plate: number;
        body: number;
        lid: number;
        bottom: number;
    }>;
    productionDiffs?: Record<string, {
        plate: number;
        body: number;
        lid: number;
        bottom: number;
    }>;
    designImages?: (string | { url: string; productId?: string })[]; // URLs or objects with product link
    invoiceUrl?: string; // URL of uploaded invoice
    waybillUrl?: string; // URL of uploaded waybill
    // Shipment details
    packagingType?: string;
    packagingCount?: number;
    packageNumber?: string;
    vehiclePlate?: string;
    trailerPlate?: string;
    additionalDocUrl?: string;
    deadline?: string;
    paymentMethod?: 'havale_eft' | 'cek' | 'cari_hesap';
    maturityDays?: number;
    prepaymentAmount?: string;
    gofrePrice?: number;
    gofreQuantity?: number;
    gofreUnitPrice?: number;
    gofreVatRate?: number;
    shippingPrice?: number;
    shippingVatRate?: number;
    createdAt: string;
}

export type OrderFormData = Omit<Order, 'id' | 'createdAt' | 'subtotal' | 'vatTotal' | 'grandTotal'>;

export interface StockItem {
    id: string;
    stockNumber: string;
    company: string;
    product: string;
    quantity: number;
    unit: string;
    category?: 'procurement' | 'finished' | 'scrap';
    productId?: string;
    notes?: string;
    createdAt: string;
}

export type StockItemFormData = Omit<StockItem, 'id' | 'createdAt'>;

export interface Personnel {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    birthDate?: string;
    birthPlace?: string;
    tcNumber?: string;
    address?: string;
    homePhone?: string;
    mobilePhone?: string;
    email?: string;
    emergencyContactName?: string;
    emergencyContactRelation?: string;
    emergencyContactPhone?: string;
    maritalStatus?: string;
    sskNumber?: string;
    department?: string;
    startDate?: string;
    recruitmentPlace?: string;
    endDate?: string;
    exitReason?: string;
    childrenCount?: number;
    childrenAges?: number[];
    parentsStatus?: string;
    hasDisability?: boolean;
    disabilityDescription?: string;
    documents?: Record<string, string>;
    createdAt: string;
}

export type PersonnelFormData = Omit<Personnel, 'id' | 'createdAt'>;

export interface Machine {
    id: string;
    machineNumber: string;
    features: string;
    maintenanceInterval: string;
    lastMaintenance: string;
    createdAt: string;
}

export type MachineFormData = Omit<Machine, 'id' | 'createdAt'>;

export interface Shift {
    id: string;
    orderId: string;
    machineId: string;
    supervisorId: string;
    personnelIds: string[];
    startTime: string;
    endTime: string;
    plannedQuantity: number;
    producedQuantity: number;
    scrapQuantity: number;
    status: 'planned' | 'active' | 'completed';
    createdAt: string;
}

export type ShiftFormData = Omit<Shift, 'id' | 'createdAt' | 'producedQuantity' | 'scrapQuantity' | 'status'>;

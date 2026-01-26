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
    code: string;
    description: string;
    dimensions: {
        length: number;
        width: number;
        depth: number;
    };
    features: {
        hasLid: boolean;
        hasWindow: boolean;
        extras: string;
    };
    // New fields
    details?: string;
    windowDetails?: {
        width: number;
        height: number;
        count: number;
    };
    lidDetails?: {
        material: string;
        color: string;
        notes: string;
    };
    images?: {
        customer: string[]; // Base64 strings, max 2
        design: string[];   // Base64 strings, max 2
    };
    createdAt: string;
}

export type ProductFormData = Omit<Product, 'id' | 'createdAt'>;

export type OrderStatus = 
    | 'created' 
    | 'offer_sent' 
    | 'offer_accepted' 
    | 'offer_cancelled'
    | 'design_pending' 
    | 'design_approved' 
    | 'supply_completed'
    | 'production_planned'
    | 'production_started'
    | 'production_completed'
    | 'invoice_added'
    | 'shipping_completed'
    | 'order_completed'
    | 'order_cancelled';

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
    procurementStatus?: string; // Specific status for procurement flow
    productionStatus?: string; // Specific status for production flow
    procurementDate?: string; // When procurement was completed
    designImages?: string[]; // URLs of uploaded design images
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
    createdAt: string;
}

export type StockItemFormData = Omit<StockItem, 'id' | 'createdAt'>;

export interface Personnel {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
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

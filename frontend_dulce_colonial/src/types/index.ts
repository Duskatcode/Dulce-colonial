export type Role = 'ADMIN' | 'OPERADOR';

export type ProductStatus = 'ACTIVO' | 'INACTIVO' | 'AGOTADO';
export type MovementType = 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'MERMA';
export type ReferenceType = 'PRODUCTO' | 'INGREDIENTE';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  description?: string;
  price: number;
  stock: number;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Ingredient {
  id: number;
  name: string;
  unit: string;
  quantity: number;
  minStock: number;
  observations?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Movement {
  id: number;
  type: MovementType;
  referenceType: ReferenceType;
  quantity: number;
  reason?: string;
  notes?: string;
  createdAt: string;
  user: { id: number; name: string };
  product?: { id: number; name: string; category: string };
  ingredient?: { id: number; name: string; unit: string };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface StockAlert {
  entityType: string;
  entityName: string;
  currentStock: number;
  minStock: number;
  timestamp: string;
}

export type TransactionType =
  | 'VENTA'
  | 'GASTO'
  | 'INGRESO'
  | 'DEVOLUCION'
  | 'COTIZACION';

export interface CashRegister {
  id:             number;
  status:         'ABIERTA' | 'CERRADA';
  openedAt:       string;
  closedAt?:      string;
  openingBalance: number;
  closingBalance?: number;
  expectedBalance?: number;
  openedBy?:      { id: number; name: string };
  closedBy?:      { id: number; name: string };
}

export interface CashTransaction {
  id:             number;
  cashRegisterId: number;
  type:           TransactionType;
  amount:         number;
  description:    string;
  reference?:     string;
  balanceAfter:   number;
  createdAt:      string;
  user:           { id: number; name: string };
  product?:       { id: number; name: string; price: number };
  productQty?:    number;
}

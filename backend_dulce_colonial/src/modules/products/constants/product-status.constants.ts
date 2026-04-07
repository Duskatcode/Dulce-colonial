export const PRODUCT_STATUS_VALUES = ['ACTIVO', 'AGOTADO', 'INACTIVO'] as const;

export type ProductStatusValue = (typeof PRODUCT_STATUS_VALUES)[number];

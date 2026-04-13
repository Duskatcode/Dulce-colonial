export const MOVEMENT_TYPE_VALUES = [
  'ENTRADA',
  'SALIDA',
  'AJUSTE',
  'MERMA',
] as const;
export type MovementTypeValue = (typeof MOVEMENT_TYPE_VALUES)[number];

export const MOVEMENT_ENTITY_VALUES = ['PRODUCTO', 'INGREDIENTE'] as const;
export type MovementEntityValue = (typeof MOVEMENT_ENTITY_VALUES)[number];

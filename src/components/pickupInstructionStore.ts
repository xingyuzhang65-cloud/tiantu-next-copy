export interface PickupSelectedShipment {
  id: string;
  customer: string;
  shipment: string;
  reference: string;
  warehouse: string;
  boxes: number;
}

export interface PickupInstruction extends Omit<PickupSelectedShipment, 'id'> {
  id: string;
  waybill: string;
  instructionNo: string;
  createdAt: string;
  expectedPickupTime: string;
  pickupContact: string;
  pickupPhone: string;
}

const storageKey = 'tiantu-customer-pickup-instructions';

export function readPickupInstructions(): PickupInstruction[] {
  try {
    const data = JSON.parse(window.localStorage.getItem(storageKey) || '[]');
    return Array.isArray(data) ? data.filter((item) => item?.instructionNo && item?.expectedPickupTime) : [];
  } catch {
    return [];
  }
}

export function savePickupInstructions(
  shipments: PickupSelectedShipment[],
  details: Pick<PickupInstruction, 'expectedPickupTime' | 'pickupContact' | 'pickupPhone'>,
): void {
  const now = new Date();
  const createdAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  const entries = shipments.map(({ id: waybill, ...shipment }, index) => ({
    ...shipment,
    waybill,
    id: `${now.getTime()}-${index}`,
    instructionNo: `CI${createdAt.replace(/\D/g, '')}${String(index + 1).padStart(2, '0')}`,
    createdAt,
    ...details,
  }));
  window.localStorage.setItem(storageKey, JSON.stringify([...entries, ...readPickupInstructions()]));
}

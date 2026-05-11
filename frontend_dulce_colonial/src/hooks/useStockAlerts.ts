import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { connectSocket } from '../services/socket';

interface StockAlert {
  entityType: string;
  entityName: string;
  currentStock: number;
  minStock: number;
  timestamp: string;
}

export function useStockAlerts() {
  const [alerts, setAlerts] = useState<StockAlert[]>([]);

  useEffect(() => {
    const socket = connectSocket();

    socket.on('stock_alert', (alert: StockAlert) => {
      toast.error(
        `Stock bajo: ${alert.entityName}\nActual: ${alert.currentStock} / Mínimo: ${alert.minStock}`,
        { duration: 6000, id: `alert-${alert.entityName}` },
      );

      setAlerts((prev) => [alert, ...prev].slice(0, 50));
    });

    return () => {
      socket.off('stock_alert');
    };
  }, []);

  return { alerts };
}

import { useEffect, useState } from 'react';
import { connectSocket } from '../services/socket';
import toast from 'react-hot-toast';

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
      // Notificación visual en pantalla
      toast.error(
        `⚠️ Stock bajo: ${alert.entityName}\nActual: ${alert.currentStock} / Mínimo: ${alert.minStock}`,
        { duration: 6000, id: `alert-${alert.entityName}` }
      );

      setAlerts((prev) => [alert, ...prev].slice(0, 50)); // Máximo 50 alertas en memoria
    });

    return () => {
      socket.off('stock_alert');
    };
  }, []);

  return { alerts };
}
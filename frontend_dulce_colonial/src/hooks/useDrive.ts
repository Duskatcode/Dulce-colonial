import { useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  getStatus as fetchDriveStatus,
  getAuthUrl,
  revoke as revokeDrive,
  refreshToken as refreshDriveToken,
} from '../services/drive.service';

const FIVE_MINUTES = 5 * 60 * 1000;

const normalizeError = (error: unknown) =>
  (typeof error === 'string' && error) || 'Error inesperado';

export default function useDrive() {
  const {
    data,
    isLoading,
    isFetching,
    refetch: refetchStatus,
  } = useQuery({
    queryKey: ['drive-status'],
    queryFn: fetchDriveStatus,
    refetchInterval: FIVE_MINUTES,
    refetchOnWindowFocus: true,
  });

  const handleConnect = useCallback(() => {
    getAuthUrl()
      .then(({ url }) => {
        window.location.href = url;
      })
      .catch((error) => {
        toast.error(normalizeError(error));
      });
  }, []);

  const revokeMutation = useMutation({
    mutationFn: revokeDrive,
    onSuccess: async () => {
      toast.success('Cuenta de Google desconectada');
      await refetchStatus();
    },
    onError: (error) => {
      toast.error(normalizeError(error));
    },
  });

  const refreshMutation = useMutation({
    mutationFn: refreshDriveToken,
    onSuccess: async () => {
      toast.success('Token de Google actualizado');
      await refetchStatus();
    },
    onError: (error) => {
      toast.error(normalizeError(error));
    },
  });

  const isExpired = Boolean(data?.requiresReauth);

  return {
    isConnected: Boolean(data?.connected),
    isExpired,
    isOperational: Boolean(data?.connected && data?.folderConfigured),
    isLoading: isLoading || isFetching,
    email: data?.email,
    status: data,
    accessTokenExpiresAt: data?.accessTokenExpiresAt,
    accessTokenExpiresInSeconds: data?.accessTokenExpiresInSeconds,
    hasRefreshToken: Boolean(data?.hasRefreshToken),
    refreshTokenIssuedAt: data?.refreshTokenIssuedAt,
    refreshTokenExpiresAt: data?.refreshTokenExpiresAt,
    refreshTokenExpiresInSeconds: data?.refreshTokenExpiresInSeconds,
    refreshTokenStatus: data?.refreshTokenStatus,
    requiresReauth: Boolean(data?.requiresReauth),
    folderConfigured: Boolean(data?.folderConfigured),
    folderWarning: data?.folderWarning,
    connect: handleConnect,
    revoke: revokeMutation.mutateAsync,
    refresh: refreshMutation.mutateAsync,
  };
}

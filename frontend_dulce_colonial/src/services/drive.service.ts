import { AxiosError } from 'axios';
import api from './api';
import { DriveAuthUrl, DriveStatus } from '../types/drive.types';

const buildDriveError = (error: unknown): Error => {
  const message =
    (error as AxiosError<{ message: string }>)?.response?.data?.message ??
    'Error inesperado';
  return new Error(message);
};

export const getStatus = async (): Promise<DriveStatus> => {
  try {
    const response = await api.get<DriveStatus>('/google/status');
    return response.data;
  } catch (error) {
    throw buildDriveError(error);
  }
};

export const getAuthUrl = async (): Promise<DriveAuthUrl> => {
  try {
    const response = await api.get<DriveAuthUrl>('/google/auth-url');
    return response.data;
  } catch (error) {
    throw buildDriveError(error);
  }
};

export const revoke = async (): Promise<void> => {
  try {
    await api.post('/google/revoke');
  } catch (error) {
    throw buildDriveError(error);
  }
};

export const refreshToken = async (): Promise<void> => {
  try {
    await api.post('/google/refresh');
  } catch (error) {
    throw buildDriveError(error);
  }
};

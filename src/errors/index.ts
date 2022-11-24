/* eslint-disable max-classes-per-file */
import { SARASAxiosError } from '../interfaces/saras';

export class ApiError extends Error {
  status?: number; // HTTP status code

  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
    this.name = this.constructor.name;
  }
}

export class CrmError extends ApiError { }

export class SarasError extends ApiError {
  code?: number; // SARAS error code

  reason?: string; // SARAS error description

  static fromAxiosResponse(error: SARASAxiosError): SarasError {
    const status = error.response?.status;
    const code = error.response?.data?.code;
    const reason = error.response?.data?.reason;

    if (code === 1025) {
      return new SarasDuplicateError(error.message, status, code, reason);
    }
    if (code === 1029) {
      return new SarasAppointmentNotFoundError(error.message, status, code, reason);
    }

    return new SarasError(error.message, status, code, reason);
  }

  constructor(message: string, status?: number, code?: number, reason?: string) {
    super(message, status);
    this.code = code;
    this.reason = reason;
  }
}

export class SarasDuplicateError extends SarasError { }

export class SarasAppointmentNotFoundError extends SarasError { }

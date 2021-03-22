import { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import {
  TestCentreRegion, DeliveryMode, Organisation, VoiceoverLanguage, TestAccommodation, TestLanguage, Gender,
} from '../enum/saras';

export interface SARASBooking {
  id: string;
}

export interface SARASAppointment {
  DateTime: string;
}

export interface SARASCandidate extends ConvertedContact {
  CandidateID: string;
  Name: string;
  Surname: string;
  DOB: string;
  DrivingLicenseNumber: string;
  PersonalReferenceNumber?: string;
  EntitlementConfirmation?: string;
}

export interface SARASTestCentre {
  Region: TestCentreRegion;
  TestcentreCode: string;
}

export interface SARASBookingDetails extends ConvertedBookingProduct {
  Appointment: SARASAppointment;
  Candidate: SARASCandidate;
  Testcentre: SARASTestCentre;
  DeliveryModeID: DeliveryMode;
  TestType: number;
  Organisation: Organisation;
  PreviousPassedExams?: number[];
}

export interface ConvertedOrganisation {
  Organisation: Organisation;
  Region: TestCentreRegion;
}

export interface ConvertedBookingProduct {
  TestLanguage: TestLanguage;
  VoiceOverLanguage?: VoiceoverLanguage;
  TestAccommodation?: TestAccommodation[];
}

export interface ConvertedContact {
  Gender: Gender;
  Address?: string;
}

// Axios types
export interface SARASAxiosError extends AxiosError {
  config: SARASAxiosConfig
  response?: SARASAxiosResponse;
}

interface SARASAxiosConfig extends AxiosRequestConfig {
  _retryCount?: number; // Custom prop we set to track number of retries
}

interface SARASAxiosResponse extends AxiosResponse {
  headers: {
    'retry-after'?: string;
  };
  data: {
    code?: number;
    reason?: string;
  }
}

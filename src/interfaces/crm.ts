import { Origin, Remit, TestStatus } from '../enum/crm';

export interface CRMResponse<T> {
  value: T[];
}

export interface CRMBookingProduct extends CRMBookingReference {
  ftts_testdate: string;
  ftts_testenginebookingupdated: string;
  ftts_personalreferencenumber: string;
  ftts_entitlementconfirmation: string;
  ftts_testlanguage: number;
  ftts_voiceoverlanguage: number;
  ftts_testaccommodation: string;
  _ftts_candidateid_value: string;
  ftts_CandidateId: CRMContact;
  ftts_productid: CRMProduct;
  ftts_ihttcid: CRMOrganisation;
  ftts_drivinglicencenumber: CRMDrivingLicence;
}

export interface CRMBookingReference {
  ftts_bookingproductid: string;
  ftts_reference: string;
}

interface CRMProduct {
  ftts_testenginetesttype: number;
  ftts_tcntestname?: string,
}

interface CRMOrganisation {
  ftts_remit: number;
  ftts_testenginedeliverymodel: number;
  ftts_testenginetestcentrecode: string;
  ftts_tcntestcentreid: string;
  parentaccountid: {
    ftts_regiona: boolean | null;
    ftts_regionb: boolean | null;
    ftts_regionc: boolean | null;
  } | null;
}

interface CRMDrivingLicence {
  ftts_licence: string;
}

interface CRMContact extends CRMAddress {
  contactid: string;
  ftts_firstandmiddlenames: string;
  lastname: string;
  birthdate: string;
  gendercode: number;
}

interface CRMAddress {
  address1_line1: string;
  address1_line2: string;
  address1_line3: string;
  address1_city: string;
  address1_county: string;
  address1_postalcode: string;
}

export interface CRMTestHistory {
  testHistoryId: string;
  testStatus: TestStatus;
  testDate: string;
  candidateId: string;
  productNumber: string;
  testEngineTestType: string;
  bookingProductReference: string;
  origin: Origin;
  testCentreRemit?: Remit;
}

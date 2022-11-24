import { TestType } from '../enum/crm';

export interface BookingDetails {
  bookingProduct: BookingProduct;
  contact: Contact;
  organisation: Organisation;
  licence: Licence;
  product: Product;
  testHistory?: TestType[];
  testLastPassedDate?: string;
}

export interface BookingReference {
  id: string;
  reference: string;
}

export interface BookingProduct extends BookingReference {
  testDate: string;
  lastUpdatedAtDate: string;
  candidateId: string;
  personalReferenceNumber: string;
  entitlementConfirmation: string;
  testLanguage: number;
  voiceoverLanguage: number;
  testAccommodation: string;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  genderCode: number;
  address: Address;
}

export interface Address {
  line1: string;
  line2: string;
  line3: string;
  city: string;
  county: string;
  postcode: string;
}

export interface Organisation {
  remit: number;
  deliveryMode: number;
  testCentreCode: string;
  tcnTestCentreId: string;
  parent: {
    regionA?: boolean | null;
    regionB?: boolean | null;
    regionC?: boolean | null;
  }
}

export interface Licence {
  licenceNumber: string;
}

export interface Product {
  testType: number;
  tcnTestName?: string;
}

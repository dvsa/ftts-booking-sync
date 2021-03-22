import { BookingDetails } from '../../src/interfaces/domain';

// Deep clone so we don't modify same object in each test
export const buildMockBookingDetails = (): BookingDetails => {
  const mockBookingDetails = mockBookings[0];
  return JSON.parse(JSON.stringify(mockBookingDetails)) as BookingDetails;
};

export const mockBookings: BookingDetails[] = [
  {
    bookingProduct: {
      id: '001',
      entitlementConfirmation: 'entconfirm353525',
      personalReferenceNumber: 'ABC123',
      reference: 'REF001',
      testAccommodation: '1,2,3',
      testDate: '2020-06-23T07:00:00Z',
      lastUpdatedAtDate: '2020-06-21T07:00:00Z',
      testLanguage: 2,
      voiceoverLanguage: 675030005,
      candidateId: 'candidate1',
    },
    contact: {
      id: 'C001',
      firstName: 'Carl',
      lastName: 'Teslington',
      dateOfBirth: '1980-12-03',
      genderCode: 1,
      address: {
        line1: 'Floor 15',
        line2: 'ECJU',
        line3: '50 Victoria Street',
        city: 'London',
        county: null,
        postcode: 'SW1H 0TL',
      },
    },
    organisation: {
      remit: 675030000,
      deliveryMode: 1,
      testCentreCode: 'TESTCENTRE-1',
      regionA: false,
      regionB: true,
      regionC: false,
    },
    licence: {
      licenceNumber: 'WENDY68245925',
    },
    product: {
      testType: 4,
    },
  },
  {
    bookingProduct: {
      id: '002',
      entitlementConfirmation: 'entbonfirm353525',
      personalReferenceNumber: 'BCD8742',
      reference: 'REF002',
      testAccommodation: '1',
      testDate: '2020-05-12T11:00:00Z',
      lastUpdatedAtDate: '2020-05-11T12:00:00Z',
      testLanguage: 2,
      voiceoverLanguage: 675030006,
      candidateId: 'candidate2',
    },
    contact: {
      id: 'C002',
      firstName: 'Marl',
      lastName: 'Meslington',
      dateOfBirth: '1981-04-13',
      genderCode: 2,
      address: {
        line1: 'gwgewg',
        line2: null,
        line3: 'fasf',
        city: 'Manchester',
        county: null,
        postcode: 'M1 7ER',
      },
    },
    organisation: {
      remit: 675030001,
      deliveryMode: 1,
      testCentreCode: 'IHTTC-TESTCENTRE-2',
      regionA: true,
      regionB: false,
      regionC: true,
    },
    licence: {
      licenceNumber: 'CARLY26245910',
    },
    product: {
      testType: 2,
    },
  },
];

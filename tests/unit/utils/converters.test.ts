import { mapAndConvertBookingDetailsToSARAS, removeNullsAndUndefined } from '../../../src/utils/converters';
import { buildMockBookingDetails } from '../../stubs/domain';

describe('CRM to SARAS object converter', () => {
  describe('mapAndConvertBookingDetailsToSARAS', () => {
    test.each([
      // input, output
      [1, 1],
      [2, 0],
      [3, 3],
      [null, 3],
    ])('correctly maps gender value for %d', (crmGender, expected) => {
      const bookingDetails = buildMockBookingDetails();
      bookingDetails.contact.genderCode = crmGender;

      const actual = mapAndConvertBookingDetailsToSARAS(bookingDetails);

      expect(actual).toHaveProperty('Candidate.Gender', expected);
    });

    test.each([
      [675030001, 0],
      [675030000, 1],
      [675030002, 1],
      [675030003, 1],
    ])('correctly maps remit %d to Organisation', (crmRemit, expected) => {
      const bookingDetails = buildMockBookingDetails();
      bookingDetails.organisation.remit = crmRemit;

      const actual = mapAndConvertBookingDetailsToSARAS(bookingDetails);

      expect(actual).toHaveProperty('Organisation', expected);
    });

    test.each([
      [1, 0],
      [2, 1],
    ])('correctly maps test language %d', (crmTestLang, expected) => {
      const bookingDetails = buildMockBookingDetails();
      bookingDetails.bookingProduct.testLanguage = crmTestLang;

      const actual = mapAndConvertBookingDetailsToSARAS(bookingDetails);

      expect(actual).toHaveProperty('TestLanguage', expected);
    });

    test.each([
      [675030005, 0],
      [675030021, 1],
      [675030001, 2],
      [675030006, 3],
      [675030003, 4],
      [675030018, 5],
      [675030012, 6],
      [675030013, 7],
      [null, undefined],
    ])('correctly maps voiceover language %d', (crmVoiceoverLang, expected) => {
      const bookingDetails = buildMockBookingDetails();
      bookingDetails.bookingProduct.voiceoverLanguage = crmVoiceoverLang;

      const actual = mapAndConvertBookingDetailsToSARAS(bookingDetails);

      expect(actual).toHaveProperty('VoiceOverLanguage', expected);
    });

    test.each([
      ['0,1,2', [0, 1, 2]],
      ['1', [1]],
      ['0', [0]],
      ['1,2', [1, 2]],
      ['', undefined],
      [null, undefined],
    ])('correctly maps test accommodations %s', (testAccommodation, expected) => {
      const bookingDetails = buildMockBookingDetails();
      bookingDetails.bookingProduct.testAccommodation = testAccommodation;

      const actual = mapAndConvertBookingDetailsToSARAS(bookingDetails);

      expect(actual).toHaveProperty('TestAccommodation', expected);
    });

    test.each([
      ['region 1', true, false, false, 1],
      ['region 2', false, true, false, 2],
      ['region 3', false, false, true, 3],
      ['no region', false, false, false, 0],
    ])('correctly converts test centre %s', (_, regiona, regionb, regionc, expected) => {
      const bookingDetails = buildMockBookingDetails();
      bookingDetails.organisation.regionA = regiona;
      bookingDetails.organisation.regionB = regionb;
      bookingDetails.organisation.regionC = regionc;

      const actual = mapAndConvertBookingDetailsToSARAS(bookingDetails);

      expect(actual).toHaveProperty('Testcentre.Region', expected);
    });

    test('successfully returns a correctly mapped Booking details object in the SARAS format', () => {
      const bookingDetails = buildMockBookingDetails();
      bookingDetails.testHistory = [3];

      const actual = mapAndConvertBookingDetailsToSARAS(bookingDetails);

      expect(actual).toHaveProperty('TestLanguage', 1);
      expect(actual).toHaveProperty('TestType', 4);
      expect(actual).toHaveProperty('Organisation', 1);
      expect(actual).toHaveProperty('VoiceOverLanguage', 0);
      expect(actual).toHaveProperty('DeliveryModeID', bookingDetails.organisation.deliveryMode);
      expect(actual).toHaveProperty('TestAccommodation', [1, 2, 3]);
      expect(actual).toHaveProperty('PreviousPassedExams', [3]);

      expect(actual).toHaveProperty('Appointment.DateTime', bookingDetails.bookingProduct.testDate);
      expect(actual).toHaveProperty('Candidate.Name', bookingDetails.contact.firstName);
      expect(actual).toHaveProperty('Candidate.Surname', bookingDetails.contact.lastName);
      expect(actual).toHaveProperty('Candidate.DOB', bookingDetails.contact.dateOfBirth);
      expect(actual).toHaveProperty('Candidate.DrivingLicenseNumber', bookingDetails.licence.licenceNumber);
      expect(actual).toHaveProperty('Candidate.PersonalReferenceNumber', bookingDetails.bookingProduct.personalReferenceNumber);
      expect(actual).toHaveProperty('Candidate.EntitlementConfirmation', bookingDetails.bookingProduct.entitlementConfirmation);
      expect(actual).toHaveProperty('Candidate.Gender', 1);
      expect(actual).toHaveProperty('Candidate.Address', 'Floor 15,ECJU,50 Victoria Street,London,SW1H 0TL');

      expect(actual).toHaveProperty('Testcentre.TestcentreCode', bookingDetails.organisation.testCentreCode);
      expect(actual).toHaveProperty('Testcentre.Region', 2);
    });
  });

  describe('remove nulls and undefined', () => {
    type TestObject = {
      string: string;
      emptyString: string;
      undefinedString?: string
      nullString: string | null
      normalBoolean: boolean
      undefinedBoolean?: boolean
      nullableBoolean: boolean | null
      stringArray: string[],
      testObject?: TestObject,
      testObjectArray?: TestObject[],
    };

    test('undefined fields are removed', () => {
      const object: TestObject = {
        string: 'string',
        emptyString: '',
        undefinedString: undefined,
        nullString: null,
        normalBoolean: false,
        undefinedBoolean: undefined,
        nullableBoolean: null,
        stringArray: ['a', 'b', undefined, null],
        testObject: {
          string: 'string',
          emptyString: '',
          undefinedString: undefined,
          nullString: null,
          normalBoolean: false,
          undefinedBoolean: undefined,
          nullableBoolean: null,
          stringArray: ['a', 'b', undefined, null],
        },
        testObjectArray: [{
          string: 'string',
          emptyString: '',
          undefinedString: undefined,
          nullString: null,
          normalBoolean: false,
          undefinedBoolean: undefined,
          nullableBoolean: null,
          stringArray: ['a', 'b', undefined, null],
        }],
      };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const convertedData = removeNullsAndUndefined(object);

      expect(convertedData).toStrictEqual({
        string: 'string',
        emptyString: '',
        normalBoolean: false,
        stringArray: ['a', 'b'],
        testObject: {
          string: 'string',
          emptyString: '',
          normalBoolean: false,
          stringArray: ['a', 'b'],
        },
        testObjectArray: [
          {
            string: 'string',
            emptyString: '',
            normalBoolean: false,
            stringArray: ['a', 'b'],
          },
        ],
      });
    });
  });
});

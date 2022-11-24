import cleanDeep from 'clean-deep';
import {
  REMITS, TEST_LANGUAGES, VOICEOVER_LANGUAGES, GENDERCODES,
} from './mappings';
import { TestCentreRegion, Gender, TestAccommodation } from '../enum/saras';
import {
  ConvertedBookingProduct, ConvertedContact, ConvertedOrganisation, SARASBookingDetails,
} from '../interfaces/saras';
import {
  Address, Organisation, Contact, BookingProduct, BookingDetails,
} from '../interfaces/domain';
import { logger } from '../libraries/logger';

export const mapAndConvertBookingDetailsToSARAS = (bookingDetails: BookingDetails): SARASBookingDetails => {
  const convertedBookingProduct = convertBookingProduct(bookingDetails.bookingProduct);
  const convertedContact = convertContact(bookingDetails.contact);
  const convertedOrg = convertOrganisation(bookingDetails.organisation);

  const convertedBookingDetails: SARASBookingDetails = {
    Appointment: {
      DateTime: bookingDetails.bookingProduct.testDate,
    },
    Candidate: {
      CandidateID: bookingDetails.bookingProduct.candidateId,
      Name: bookingDetails.contact.firstName,
      Surname: bookingDetails.contact.lastName,
      DOB: bookingDetails.contact.dateOfBirth,
      Gender: convertedContact.Gender,
      Address: convertedContact.Address,
      DrivingLicenseNumber: bookingDetails.licence.licenceNumber, // License is not a typo!
      PersonalReferenceNumber: bookingDetails.bookingProduct.personalReferenceNumber || undefined,
      EntitlementConfirmation: bookingDetails.bookingProduct.entitlementConfirmation || undefined,
    },
    DeliveryModeID: bookingDetails.organisation.deliveryMode,
    Testcentre: {
      Region: convertedOrg.Region,
      TestcentreCode: bookingDetails.organisation.testCentreCode,
    },
    TestLanguage: convertedBookingProduct.TestLanguage,
    VoiceOverLanguage: convertedBookingProduct.VoiceOverLanguage,
    TestType: bookingDetails.product.testType,
    Organisation: convertedOrg.Organisation,
    TestAccommodation: convertedBookingProduct.TestAccommodation,
    PreviousPassedExams: bookingDetails.testHistory,
    PreviousPassedTestDate: bookingDetails.testLastPassedDate,
  };

  return convertedBookingDetails;
};

const convertBookingProduct = (bp: BookingProduct): ConvertedBookingProduct => ({
  TestLanguage: TEST_LANGUAGES.get(bp.testLanguage) ?? 0,
  VoiceOverLanguage: VOICEOVER_LANGUAGES.get(bp.voiceoverLanguage),
  TestAccommodation: convertTestAccommodations(bp),
});

const convertContact = (contact: Contact): ConvertedContact => ({
  Gender: GENDERCODES.get(contact.genderCode) ?? Gender.UNKNOWN,
  Address: createAddressFromFields(contact.address),
});

const convertOrganisation = (org: Organisation): ConvertedOrganisation => ({
  Region: convertRegions(org),
  Organisation: REMITS.get(org.remit) ?? 1,
});

const convertTestAccommodations = (bp: BookingProduct): TestAccommodation[] | undefined => {
  logger.debug(`convertTestAccommodations:: Calling for ${bp.reference}`, { bp });
  const testAccommodations: number[] = [];

  // When voiceover language has been selected as a standard accommodation - ALWAYS add it to the list of test accommodations as well even if no NSAs are present
  const hasSelectedVoiceover = VOICEOVER_LANGUAGES.has(bp.voiceoverLanguage);
  if (hasSelectedVoiceover) {
    logger.debug(`convertTestAccommodations:: ${bp.reference} has voiceover - adding to the list of accommodations`);
    testAccommodations.push(TestAccommodation.VOICEOVER_LANG);
  }
  if (bp.testAccommodation === '' || bp.testAccommodation === undefined || bp.testAccommodation === null) {
    return (hasSelectedVoiceover) ? testAccommodations : undefined;
  }

  // Ensure we're only adding voiceover once
  const mappedTestAccommodations = bp.testAccommodation
    .split(',')
    .map((val: string) => Number(val))
    .filter((elem) => ((hasSelectedVoiceover) ? elem !== TestAccommodation.VOICEOVER_LANG : true));

  testAccommodations.push(...mappedTestAccommodations);

  return testAccommodations;
};

const convertRegions = (org: Organisation): TestCentreRegion => {
  if (org.parent.regionA) {
    return TestCentreRegion.REGION_A;
  }
  if (org.parent.regionB) {
    return TestCentreRegion.REGION_B;
  }
  if (org.parent.regionC) {
    return TestCentreRegion.REGION_C;
  }
  return TestCentreRegion.DEFAULT;
};

function createAddressFromFields(address: Address): string | undefined {
  const concatenatedAddress = Object.values(address)
    .filter((val) => val)
    .map((val: string) => val.trim())
    .join();

  return concatenatedAddress || undefined;
}

export const removeNullsAndUndefined = <T>(data: T): T => {
  const transformedData = cleanDeep(data, {
    emptyArrays: false,
    emptyObjects: false,
    emptyStrings: false,
  });
  return transformedData as T;
};

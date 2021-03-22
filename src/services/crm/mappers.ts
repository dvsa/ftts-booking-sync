/* eslint-disable no-underscore-dangle */
import Container from 'typedi';
import { CRMBookingProduct } from '../../interfaces/crm';
import { BookingDetails } from '../../interfaces/domain';
import { Logger } from '../../libraries/logger';

export class CRMMapper {
  constructor(
    private logger: Logger = Container.get('logger'),
  ) { }

  public crmBookingToBookingDetails(crmBooking: CRMBookingProduct): BookingDetails | undefined {
    try {
      return {
        bookingProduct: {
          id: crmBooking.ftts_bookingproductid,
          testDate: crmBooking.ftts_testdate,
          lastUpdatedAtDate: crmBooking.ftts_testenginebookingupdated,
          reference: crmBooking.ftts_reference,
          candidateId: crmBooking._ftts_candidateid_value,
          personalReferenceNumber: crmBooking.ftts_personalreferencenumber,
          entitlementConfirmation: crmBooking.ftts_entitlementconfirmation,
          testLanguage: crmBooking.ftts_testlanguage,
          voiceoverLanguage: crmBooking.ftts_voiceoverlanguage,
          testAccommodation: crmBooking.ftts_testaccommodation,
        },
        contact: {
          id: crmBooking.ftts_CandidateId.contactid,
          firstName: crmBooking.ftts_CandidateId.ftts_firstandmiddlenames,
          lastName: crmBooking.ftts_CandidateId.lastname,
          dateOfBirth: crmBooking.ftts_CandidateId.birthdate,
          genderCode: crmBooking.ftts_CandidateId.gendercode,
          address: {
            line1: crmBooking.ftts_CandidateId.address1_line1,
            line2: crmBooking.ftts_CandidateId.address1_line2,
            line3: crmBooking.ftts_CandidateId.address1_line3,
            city: crmBooking.ftts_CandidateId.address1_city,
            county: crmBooking.ftts_CandidateId.address1_county,
            postcode: crmBooking.ftts_CandidateId.address1_postalcode,
          },
        },
        product: {
          testType: crmBooking.ftts_productid.ftts_testenginetesttype,
        },
        organisation: {
          remit: crmBooking.ftts_bookingid.ftts_testcentre.ftts_remit,
          deliveryMode: crmBooking.ftts_bookingid.ftts_testcentre.ftts_testenginedeliverymodel,
          testCentreCode: crmBooking.ftts_bookingid.ftts_testcentre.ftts_testenginetestcentrecode,
          regionA: crmBooking.ftts_bookingid.ftts_testcentre.ftts_regiona,
          regionB: crmBooking.ftts_bookingid.ftts_testcentre.ftts_regionb,
          regionC: crmBooking.ftts_bookingid.ftts_testcentre.ftts_regionc,
        },
        licence: {
          licenceNumber: crmBooking.ftts_bookingid.ftts_LicenceId.ftts_licence,
        },
      };
    } catch (e) {
      const error = e as Error;
      this.logger.critical('Error retrieving booking details from CRM booking product response', {
        bookingProductId: crmBooking.ftts_bookingproductid,
        error,
      });
      return undefined;
    }
  }
}

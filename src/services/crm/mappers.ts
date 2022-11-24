/* eslint-disable no-underscore-dangle */
import Container from 'typedi';
import { CRMBookingProduct } from '../../interfaces/crm';
import { BookingDetails } from '../../interfaces/domain';
import { Logger, BusinessTelemetry } from '../../libraries/logger';

export class CRMMapper {
  constructor(
    private logger: Logger = Container.get('logger'),
  ) { }

  public crmBookingToBookingDetails(crmBookingProduct: CRMBookingProduct): BookingDetails | undefined {
    try {
      if (!crmBookingProduct.ftts_reference) {
        throw new Error('Missing booking reference');
      }
      if (!crmBookingProduct.ftts_ihttcid) {
        throw new Error('Missing linked test centre entity');
      }
      return {
        bookingProduct: {
          id: crmBookingProduct.ftts_bookingproductid,
          testDate: crmBookingProduct.ftts_testdate,
          lastUpdatedAtDate: crmBookingProduct.ftts_testenginebookingupdated,
          reference: crmBookingProduct.ftts_reference,
          candidateId: crmBookingProduct._ftts_candidateid_value,
          personalReferenceNumber: crmBookingProduct.ftts_personalreferencenumber,
          entitlementConfirmation: crmBookingProduct.ftts_entitlementconfirmation,
          testLanguage: crmBookingProduct.ftts_testlanguage,
          voiceoverLanguage: crmBookingProduct.ftts_voiceoverlanguage,
          testAccommodation: crmBookingProduct.ftts_testaccommodation,
        },
        contact: {
          id: crmBookingProduct.ftts_CandidateId.contactid,
          firstName: crmBookingProduct.ftts_CandidateId.ftts_firstandmiddlenames,
          lastName: crmBookingProduct.ftts_CandidateId.lastname,
          dateOfBirth: crmBookingProduct.ftts_CandidateId.birthdate,
          genderCode: crmBookingProduct.ftts_CandidateId.gendercode,
          address: {
            line1: crmBookingProduct.ftts_CandidateId.address1_line1,
            line2: crmBookingProduct.ftts_CandidateId.address1_line2,
            line3: crmBookingProduct.ftts_CandidateId.address1_line3,
            city: crmBookingProduct.ftts_CandidateId.address1_city,
            county: crmBookingProduct.ftts_CandidateId.address1_county,
            postcode: crmBookingProduct.ftts_CandidateId.address1_postalcode,
          },
        },
        product: {
          testType: crmBookingProduct.ftts_productid.ftts_testenginetesttype,
          tcnTestName: crmBookingProduct.ftts_productid?.ftts_tcntestname,
        },
        organisation: {
          remit: crmBookingProduct.ftts_ihttcid.ftts_remit,
          deliveryMode: crmBookingProduct.ftts_ihttcid.ftts_testenginedeliverymodel,
          testCentreCode: crmBookingProduct.ftts_ihttcid.ftts_testenginetestcentrecode,
          tcnTestCentreId: crmBookingProduct.ftts_ihttcid.ftts_tcntestcentreid,
          parent: {
            regionA: crmBookingProduct.ftts_ihttcid.parentaccountid?.ftts_regiona,
            regionB: crmBookingProduct.ftts_ihttcid.parentaccountid?.ftts_regionb,
            regionC: crmBookingProduct.ftts_ihttcid.parentaccountid?.ftts_regionc,
          },
        },
        licence: {
          licenceNumber: crmBookingProduct.ftts_drivinglicencenumber.ftts_licence,
        },
      };
    } catch (e) {
      const error = e as Error;
      this.logger.event(BusinessTelemetry.CBS_CDS_CORRUPTED_DATA, `CRMMapper::crmBookingToBookingDetails: Booking product ${crmBookingProduct.ftts_bookingproductid} missing required data`, {
        ftts_bookingproductid: crmBookingProduct.ftts_bookingproductid,
        ftts_reference: crmBookingProduct.ftts_reference,
        error,
      });
      this.logger.audit('CRMMapper::crmBookingToBookingDetails: Failed to map CRM booking product', {
        crmBooking: crmBookingProduct,
        ftts_bookingproductid: crmBookingProduct.ftts_bookingproductid,
        ftts_reference: crmBookingProduct.ftts_reference,
        error,
      });
      return undefined; // Skip this record
    }
  }
}

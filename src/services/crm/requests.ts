import { Expand, RetrieveMultipleRequest } from 'dynamics-web-api';
import { Collection } from '../../enum/crm';

const bookingProductFields = ['ftts_testdate', 'ftts_testenginebookingupdated', '_ftts_candidateid_value', 'ftts_reference', 'ftts_personalreferencenumber', 'ftts_entitlementconfirmation', 'ftts_testlanguage', 'ftts_voiceoverlanguage', 'ftts_testaccommodation'];
const addressFields = ['address1_line1', 'address1_line2', 'address1_line3', 'address1_city', 'address1_county', 'address1_postalcode'];
const candidateFields = ['ftts_firstandmiddlenames', 'lastname', 'birthdate', 'gendercode', ...addressFields];
const productFields = ['ftts_testenginetesttype'];
const organisationFields = ['ftts_remit', 'ftts_testenginedeliverymodel', 'ftts_testenginetestcentrecode', 'ftts_regiona', 'ftts_regionb', 'ftts_regionc'];
const licenceFields = ['ftts_licence'];

const expandQuery: Expand[] = [
  { property: 'ftts_CandidateId', select: candidateFields },
  { property: 'ftts_productid', select: productFields },
  { property: 'ftts_bookingid', select: ['ftts_bookingid'], expand: [{ property: 'ftts_testcentre', select: organisationFields }, { property: 'ftts_LicenceId', select: licenceFields }] },
];

export const buildRetrieveBookingDetailsRequest = (): RetrieveMultipleRequest => ({
  collection: Collection.BOOKING_PRODUCTS,
  select: bookingProductFields,
  expand: expandQuery,
});

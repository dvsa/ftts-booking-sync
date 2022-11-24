import {
  Gender, Organisation, TestLanguage, VoiceoverLanguage,
} from '../enum/saras';
import { TestType } from '../enum/crm';

/**
 * Mappings from CRM codes to SARAS values
 */

export const GENDERCODES: Map<number, Gender> = new Map([
  [1, Gender.MALE],
  [2, Gender.FEMALE],
  [3, Gender.UNKNOWN],
]);

export const REMITS: Map<number, Organisation> = new Map([
  [675030001, Organisation.DVA],
  [675030000, Organisation.DVSA], // EN
  [675030002, Organisation.DVSA], // WALES
  [675030003, Organisation.DVSA], // SCOT
]);

export const TEST_LANGUAGES: Map<number, TestLanguage> = new Map([
  [1, TestLanguage.ENGLISH],
  [2, TestLanguage.WELSH],
]);

export const VOICEOVER_LANGUAGES: Map<number, VoiceoverLanguage> = new Map([
  [675030005, VoiceoverLanguage.ENGLISH],
  [675030021, VoiceoverLanguage.WELSH],
  [675030001, VoiceoverLanguage.ARABIC],
  [675030006, VoiceoverLanguage.FARSI],
  [675030003, VoiceoverLanguage.CANTONESE],
  [675030018, VoiceoverLanguage.TURKISH],
  [675030012, VoiceoverLanguage.POLISH],
  [675030013, VoiceoverLanguage.PORTUGUESE],
]);

export const LGV_PCV_TESTTYPE_COUNTERPARTS: Map<TestType, TestType> = new Map([
  [TestType.LGV_MULTIPLE_CHOICE, TestType.LGV_HPT],
  [TestType.LGV_HPT, TestType.LGV_MULTIPLE_CHOICE],
  [TestType.PCV_MULTIPLE_CHOICE, TestType.PCV_HPT],
  [TestType.PCV_HPT, TestType.PCV_MULTIPLE_CHOICE],
]);

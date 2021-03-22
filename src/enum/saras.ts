export enum DeliveryMode {
  IHTTC = 0,
  PERMANENT_TESTCENTRE = 1,
  OCCASIONAL_TESTCENTRE = 2,
  AT_HOME = 3,
}

export enum Gender {
  FEMALE = 0,
  MALE = 1,
  UNKNOWN = 3,
}

export enum Organisation {
  DVA = 0,
  DVSA = 1,
}

export enum TestLanguage {
  ENGLISH = 0,
  WELSH = 1,
}

export enum VoiceoverLanguage {
  ENGLISH = 0,
  WELSH = 1,
  ARABIC = 2,
  FARSI = 3,
  CANTONESE = 4,
  TURKISH = 5,
  POLISH = 6,
  PORTUGUESE = 7
}

export enum TestCentreRegion {
  DEFAULT = 0,
  REGION_A = 1,
  REGION_B = 2,
  REGION_C = 3,
}

export enum TestAccommodation {
  EXTRA_LENGTH = 0,
  VOICEOVER_LANG = 1,
  BSL = 2,
  PAUSE_HPT = 3,
  OLM = 4,
  READER = 5,
  RECORDER = 6,
  BSL_TRANSLATOR = 7,
  LIP_SPEAKER = 8,
  LISTENING_AID = 9,
  SEPARATE_ROOM = 10,
  AT_HOME_TESTING = 11,
  LANGUAGE_TRANSLATOR = 12,
}

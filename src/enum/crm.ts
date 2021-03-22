export enum Collection {
  BOOKING_PRODUCTS = 'ftts_bookingproducts',
  TEST_HISTORIES = 'ftts_testhistories'
}

export enum BookingStatus {
  CONFIRMED = 675030001,
  CANCELLED = 675030008,
  CANCELLATION_IN_PROGRESS = 675030002,
  CHANGE_IN_PROGRESS = 675030003,
}

export enum TestStatus {
  PASSED = 2,
}

export enum TestType {
  LGV_MULTIPLE_CHOICE = 3,
  LGV_HPT = 4,
  PCV_MULTIPLE_CHOICE = 7,
  PCV_HPT = 8,
}

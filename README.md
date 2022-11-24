# Booking Synchroniser

Booking Synchroniser function to send individual booking data to SARAS and notify CDS.

Azure Function app with one function:

-  **syncTimerTrigger**: time trigger function for copying data from CRM to SARAS and confirmations back to CRM

Each has its own folder in the project root with a `function.json` config

## Build

Install node modules:

```
npm install
```

Compile the ts source:
```
npm run build
```

## Tests

All tests are housed under `tests/` directory in root

Run all the tests:
```
npm run test
```

Watch the tests:
```
npm run test:watch
```

Run test coverage:
```
npm run test:coverage
```

See the generated `coverage` directory for the results

## Running Locally

1. Create the local.settings.json file by running `npm run copy-config` and fill in the configuration
2. Run the code - ```npm start ```
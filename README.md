# Booking Synchroniser

Booking Synchroniser function to send individual booking data to SARAS and notify CDS

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

## Environment
```
SYNC_CRON_TIMER - an interval following the NCRONTAB format for Azure function - see https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-timer?tabs=csharp#ncrontab-expressions for details

USE_SARAS_STUB - boolean

SARAS_STUB_URL - saras stub url

SARAS_URL - saras url

SARAS_MAX_RETRIES - saras max number of request retries

CBIBOOKING_TOKEN_URL - saras auth token url

CBIBOOKING_CLIENT_ID - saras auth client id

CBIBOOKING_CLIENT_SECRET - saras auth secret

CBIBOOKING_SCOPE - saras auth scope

CRM_BASE_URL - crm url

CRM_MAX_RETRIES - crm max number of request retries

CRM_TOKEN_URL - crm auth token url

CRM_CLIENT_ID - crm auth client id

CRM_CLIENT_SECRET - crm auth secret
```

## Running Locally

1) Create a main.ts file in the src folder with the following code:
```
import  funcTrigger  from  './sync';

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {
	try {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		await  funcTrigger({ traceContext: {} } as  any);
	} catch (e) {
		console.log(e);
	}
})();
```

2. Build the project -  ``` npm run build ```
3. Run the code - ```npm start ```
import { Container } from 'typedi';

import { logger } from '../libraries/logger';
import { newDynamicsWebApi } from '../libraries/dynamics-web-api';
import { config } from '../config';
import { CRM } from '../services/crm';
import { SarasAxios, sarasToken } from '../services/saras/axios-instance';
import { SARAS } from '../services/saras';

const dependencies = async (): Promise<void> => {
  // Fresh SARAS token to use for duration of run
  const sarasActiveToken = await sarasToken.getToken(config.saras.identity.scope);
  try {
    Container.set('logger', logger);

    Container.set('dynamicsWebApi', newDynamicsWebApi());
    Container.set('crm:client', new CRM());

    Container.set('sarasAxiosInstance', new SarasAxios(sarasActiveToken?.token || '', logger));
    Container.set('saras:client', new SARAS());

    logger.info('Services injected into Container');
  } catch (error) {
    logger.critical('Error injecting services into Container');
    throw error;
  }
};

export {
  dependencies,
};

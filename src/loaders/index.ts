import { dependencies } from './dependencies';
import { envLoader } from './env';

const loader = async (): Promise<void> => {
  envLoader();
  await dependencies();
};

export {
  loader,
};

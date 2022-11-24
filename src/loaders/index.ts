import { dependencies } from './dependencies';

const loader = async (): Promise<void> => {
  await dependencies();
};

export {
  loader,
};

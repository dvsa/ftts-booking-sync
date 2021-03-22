import dotenv from 'dotenv';

const envLoader = (): void => {
  // Set the NODE_ENV to 'development' by default
  process.env.NODE_ENV = process.env.NODE_ENV || 'development';

  if (process.env.NODE_ENV === 'development') {
    const result = dotenv.config();
    if (result.error) {
      // This error should crash whole process
      throw new Error('Could not find .env file');
    }
  }
};

export {
  envLoader,
};

const ENV = {
  API: {

    BASE_URL: import.meta.env.VITE_API_URL || '/api',
    TIMEOUT: 30000,
    RETRIES: 3
  },
  STORAGE: {
    USER: 'jebo_user',
    TOKEN: 'token',
    REFRESH: 'token_refresh',
    THEME: 'jebo_theme'
  }
};

export default ENV;

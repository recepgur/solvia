declare global {
  namespace NodeJS {
    interface Global {
      IS_REACT_ACT_ENVIRONMENT: boolean;
      React: typeof import('react');
      ReactDOM: typeof import('react-dom');
    }
  }

  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

export {};

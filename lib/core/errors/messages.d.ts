export declare const UnknownDependenciesMessage: (
  type: string,
  index: number,
  length: number,
) => string;
export declare const InvalidMiddlewareMessage: (name: string) => string;
export declare const InvalidModuleMessage: (scope: string) => string;
export declare const UnknownExportMessage: (name: string) => string;
export declare const INVALID_MIDDLEWARE_CONFIGURATION =
  "Invalid middleware configuration passed inside the module 'configure()' method.";
export declare const UNKNOWN_REQUEST_MAPPING =
  'Request mapping properties not defined in the @RequestMapping() annotation!';
export declare const UNHANDLED_RUNTIME_EXCEPTION =
  'Unhandled Runtime Exception.';
export declare const INVALID_EXCEPTION_FILTER =
  'Invalid exception filters (@UseFilters()).';
export declare const MICROSERVICES_PACKAGE_NOT_FOUND_EXCEPTION =
  "Unable to load @nestjs/microservices packages (please, make sure whether it's installed already).";

import { CorsOptions } from './external/cors-options.interface';
import { CanActivate } from './features/can-activate.interface';
import { NestInterceptor } from './features/nest-interceptor.interface';
import { HttpServer } from './http/http-server.interface';
import {
  ExceptionFilter,
  INestMicroservice,
  NestHybridApplicationOptions,
  PipeTransform,
} from './index';
import { INestApplicationContext } from './nest-application-context.interface';
import { WebSocketAdapter } from './websockets/web-socket-adapter.interface';
import { GlobalPrefixOptions } from './global-prefix-options.interface';

/**
 * Interface defining the core NestApplication object.
 *
 * @publicApi
 */
export interface INestApplication extends INestApplicationContext {
  /**
   * A wrapper function around HTTP adapter method: `adapter.use()`.
   * Example `app.use(cors())`
   *
   * @returns {void}
   */
  use(...args: any[]): this;

  /**
   * Enables CORS (Cross-Origin Resource Sharing)
   *
   * @returns {void}
   */
  enableCors(options?: CorsOptions): void;

  /**
   * Starts the application.
   *
   * @param  {number} port
   * @param  {string} hostname
   * @param  {Function} callback Optional callback
   * @returns A Promise that, when resolved, is a reference to the underlying HttpServer.
   */
  listen(port: number | string, callback?: () => void): Promise<any>;
  listen(
    port: number | string,
    hostname: string,
    callback?: () => void,
  ): Promise<any>;

  /**
   * Returns the url the application is listening at, based on OS and IP version. Returns as an IP value either in IPv6 or IPv4
   *
   * @returns The IP where the server is listening
   */
  getUrl(): Promise<string>;

  /**
   * Starts the application (can be awaited).
   *
   * @param  {number} port
   * @param  {string} hostname (optional)
   * @returns {Promise}
   */
  listenAsync(port: number | string, hostname?: string): Promise<any>;

  /**
   * Registers a prefix for every HTTP route path.
   *
   * @param  {string} prefix The prefix for every HTTP route path (for example `/v1/api`)
   * @param  {NestApplicationGlobalPrefixOptions} globalPrefixOptions GlobalPrefix options object
   * @returns {void}
   */
  setGlobalPrefix(
    prefix: string,
    globalPrefixOptions?: GlobalPrefixOptions,
  ): this;

  /**
   * Setup Ws Adapter which will be used inside Gateways.
   * Use when you want to override default `socket.io` library.
   *
   * @param  {WebSocketAdapter} adapter
   * @returns {void}
   */
  useWebSocketAdapter(adapter: WebSocketAdapter): this;

  /**
   * Connects microservice to the NestApplication instance. Transforms application
   * to a hybrid instance.
   *
   * @param  {T} options Microservice options object
   * @param  {NestHybridApplicationOptions} hybridOptions Hybrid options object
   * @returns {INestMicroservice}
   */
  connectMicroservice<T extends object = any>(
    options: T,
    hybridOptions?: NestHybridApplicationOptions,
  ): INestMicroservice;

  /**
   * Returns array of the microservices connected to the NestApplication.
   *
   * @returns {INestMicroservice[]}
   */
  getMicroservices(): INestMicroservice[];

  /**
   * Returns the underlying native HTTP server.
   *
   * @returns {any}
   */
  getHttpServer(): any;

  /**
   * Returns the underlying HTTP adapter.
   *
   * @returns {HttpServer}
   */
  getHttpAdapter(): HttpServer;

  /**
   * Starts all connected microservices asynchronously.
   *
   * @param  {Function} callback Optional callback function
   * @returns {void}
   */
  startAllMicroservices(callback?: () => void): this;

  /**
   * Starts all connected microservices and can be awaited.
   *
   * @returns {Promise}
   */
  startAllMicroservicesAsync(): Promise<void>;

  /**
   * Registers exception filters as global filters (will be used within
   * every HTTP route handler)
   *
   * @param  {ExceptionFilter[]} ...filters
   */
  useGlobalFilters(...filters: ExceptionFilter[]): this;

  /**
   * Registers pipes as global pipes (will be used within every HTTP route handler)
   *
   * @param  {PipeTransform[]} ...pipes
   */
  useGlobalPipes(...pipes: PipeTransform<any>[]): this;

  /**
   * Registers interceptors as global interceptors (will be used within
   * every HTTP route handler)
   *
   * @param  {NestInterceptor[]} ...interceptors
   */
  useGlobalInterceptors(...interceptors: NestInterceptor[]): this;

  /**
   * Registers guards as global guards (will be used within every HTTP route handler)
   *
   * @param  {CanActivate[]} ...guards
   */
  useGlobalGuards(...guards: CanActivate[]): this;

  /**
   * Terminates the application (including NestApplication, Gateways, and each connected
   * microservice)
   *
   * @returns {Promise<void>}
   */
  close(): Promise<void>;
}

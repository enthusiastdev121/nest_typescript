import { HttpsOptions } from './https-options.interface';
import { LoggerService } from '../services/logger.service';
import { NestApplicationContextOptions } from './nest-application-context-options.interface';

export interface NestApplicationOptions
  extends HttpsOptions,
    NestApplicationContextOptions {
  cors?: boolean;
  bodyParser?: boolean;
}

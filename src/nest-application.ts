import { MiddlewaresModule } from './core/middlewares/middlewares-module';
import { SocketModule } from './websockets/socket-module';
import { NestContainer } from './core/injector/container';
import { ExpressAdapter } from './core/adapters/express-adapter';
import { RoutesResolver } from './core/router/routes-resolver';
import { Logger } from './common/services/logger.service';
import { messages } from './core/constants';
import { MicroservicesModule } from './microservices/microservices-module';
import { Resolver } from './core/router/interfaces/resolver.interface';
import { INestApplication } from './common/interfaces';

export class NestApplication implements INestApplication {
    private readonly routesResolver: Resolver;
    private readonly logger = new Logger(NestApplication.name);

    constructor(
        private readonly container: NestContainer,
        private readonly express) {

        this.routesResolver = new RoutesResolver(container, ExpressAdapter);
    }

    public setupModules() {
        SocketModule.setup(this.container);
        MiddlewaresModule.setup(this.container);
        MicroservicesModule.setupClients(this.container);
    }

    public listen(port: number, callback?: () => void) {
        console.log(this.container.getModules());
        this.setupMiddlewares(this.express);
        this.setupRoutes(this.express);

        this.logger.log(messages.APPLICATION_READY);
        return this.express.listen(port, callback);
    }

    private setupMiddlewares(instance) {
        MiddlewaresModule.setupMiddlewares(instance);
    }

    private setupRoutes(instance) {
        this.routesResolver.resolve(instance);
    }
}
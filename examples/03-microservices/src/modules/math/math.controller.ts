import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ClientProxy, Client, Transport, MessagePattern } from '@nestjs/microservices';
import { Observable } from 'rxjs/Observable';
import { LoggingInterceptor } from '../common/interceptors/logging.interceptor';

@Controller()
@UseInterceptors(LoggingInterceptor)
export class MathController {
  @Client({ transport: Transport.TCP })
  client: ClientProxy;

  @Get()
  call() {
    const pattern = { cmd: 'add' };
    const data = [1, 2, 3, 4, 5];
    return this.client.send<number>(pattern, data);
  }

  @MessagePattern({ cmd: 'add' })
  add(data): number {
    return (data || []).reduce((a, b) => a + b);
  }
}
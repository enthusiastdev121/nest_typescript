import { HelloService } from './hello.service';
import { Controller, Get, Post, Body, Header, Param } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { UserByIdPipe } from './users/user-by-id.pipe';

@Controller('hello')
export class HelloController {
  constructor(private readonly helloService: HelloService) {}

  @Get()
  @Header('Authorization', 'Bearer')
  greeting(): string {
    return this.helloService.greeting();
  }

  @Get('async')
  async asyncGreeting(): Promise<string> {
    return await this.helloService.greeting();
  }

  @Get('stream')
  streamGreeting(): Observable<string> {
    return of(this.helloService.greeting());
  }

  @Get('local-pipe/:id')
  localPipe(
    @Param('id', UserByIdPipe)
    user: any,
  ): any {
    return user;
  }
}

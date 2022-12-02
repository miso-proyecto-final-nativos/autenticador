import {
  Inject,
  Injectable,
  Logger,
  RequestTimeoutException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ClientProxy } from '@nestjs/microservices';
import { compareSync } from 'bcrypt';
import {
  catchError,
  firstValueFrom,
  throwError,
  timeout,
  TimeoutError,
} from 'rxjs';

// Imports the Google Cloud client library
const { PubSub } = require('@google-cloud/pubsub');
const pubSubClient = new PubSub();
const TOPIC = "projects/sportapp-miso-grupo6/topics/sensors";

@Injectable()
export class AuthService {
  constructor(
    @Inject('USER_CLIENT')
    private readonly client: ClientProxy,
    private readonly jwtService: JwtService,
  ) { }

  async validateUser(username: string, password: string): Promise<any> {
    try {
      const user$ = this.client
        .send({ role: 'user', cmd: 'get' }, { username })
        .pipe(
          timeout(5000),
          catchError((err) => {
            if (err instanceof TimeoutError) {
              return throwError(() => new RequestTimeoutException());
            }
            return throwError(() => err);
          }),
        );

      const user = await firstValueFrom(user$);

      if (compareSync(password, user.password)) {
        return user;
      }
      // The user does not exists!!
      console.log("Error en la validación del usuario: ${username}");
      await publishMessage("Error en la validación del usuario: ${username}");
      return null;
    } catch (e) {
      Logger.log(e);
      throw e;
    }
  }

  async login(user) {
    const payload = { user, sub: user.id };

    return {
      userId: user.id,
      accessToken: this.jwtService.sign(payload),
    };
  }

  validateToken(jwt: string) {
    return this.jwtService.verify(jwt);
  }
}

async function publishMessage(data: string) {
  const dataBuffer = Buffer.from(data);

  try {
    const messageId = await pubSubClient
      .topic(TOPIC)
      .publishMessage({ data: dataBuffer });
    console.log(`Message ${messageId} published.`);
  } catch (error) {
    console.error(`Received error while publishing: ${error.message}`);
    process.exitCode = 1;
  }
}

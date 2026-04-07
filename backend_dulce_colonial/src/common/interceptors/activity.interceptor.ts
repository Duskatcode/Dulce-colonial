import {
  Injectable, NestInterceptor, ExecutionContext,
  CallHandler, Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { ActivityService } from '../../modules/activity/activity.service';

// Mapa de métodos HTTP → acciones legibles
const ACTION_MAP: Record<string, string> = {
  POST:   'CREAR',
  PATCH:  'ACTUALIZAR',
  PUT:    'ACTUALIZAR',
  DELETE: 'ELIMINAR',
  GET:    'CONSULTAR',
};

// Entidades a registrar (excluye rutas de auth y logs propios)
const TRACKED_ENTITIES = [
  'products', 'inventory', 'movements',
  'reports', 'users', 'drive',
];

@Injectable()
export class ActivityInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ActivityInterceptor.name);

  constructor(private readonly activityService: ActivityService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user } = request;

    // Solo registrar si hay usuario autenticado
    if (!user?.id) return next.handle();

    // Extraer entidad de la URL — /api/v1/products/3 → products
    const segments = url.replace('/api/v1/', '').split('/');
    const entity   = segments[0];

    // Solo registrar entidades rastreadas y métodos mutantes
    const shouldTrack =
      TRACKED_ENTITIES.includes(entity) && method !== 'GET';

    return next.handle().pipe(
      tap({
        next: (responseBody) => {
          if (!shouldTrack) return;

          const action   = ACTION_MAP[method] ?? method;
          const entityId = segments[1] ? +segments[1] : responseBody?.id ?? undefined;

          this.activityService
            .log({
              userId:   user.id,
              action,
              entity,
              entityId: isNaN(entityId) ? undefined : entityId,
              details:  { method, url, status: 'success' },
            })
            .catch((err) => this.logger.error('Error registrando actividad:', err));
        },
        error: (err) => {
          if (!shouldTrack) return;
          this.activityService
            .log({
              userId:  user.id,
              action:  ACTION_MAP[method] ?? method,
              entity,
              details: { method, url, status: 'error', error: err.message },
            })
            .catch(() => {});
        },
      }),
    );
  }
}
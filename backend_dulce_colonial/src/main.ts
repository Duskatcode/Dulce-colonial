import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { ReportsService } from './modules/reports/reports.service';
import { ActivityInterceptor } from './common/interceptors/activity.interceptor';
import { ActivityService } from './modules/activity/activity.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1', {
    exclude: ['api/docs', 'api/docs-json', 'google/callback'],
  });
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Dulce Colonial API')
    .setDescription('Documentación de la API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument, {
    swaggerOptions: { persistAuthorization: true },
  });
  await app.listen(process.env.PORT ?? 3000);
  // Reporte automático al apagar el servidor
  app.enableShutdownHooks();
  const reportsService = app.get(ReportsService);
  process.on('SIGTERM', () => {
    void (async () => {
      await reportsService.runShutdownReport();
      await app.close();
    })();
  });
  process.on('SIGINT', () => {
    void (async () => {
      await reportsService.runShutdownReport();
      await app.close();
    })();
  });
  const activityService = app.get(ActivityService);
  app.useGlobalInterceptors(new ActivityInterceptor(activityService));
}
void bootstrap();

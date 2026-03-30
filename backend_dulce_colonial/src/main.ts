import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new GlobalExceptionFilter());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
// Reporte automático al apagar el servidor
app.enableShutdownHooks();
const reportsService = app.get(ReportsService);
process.on('SIGTERM', async () => {
  await reportsService.runShutdownReport();
  await app.close();
});
process.on('SIGINT', async () => {
  await reportsService.runShutdownReport();
  await app.close();
});

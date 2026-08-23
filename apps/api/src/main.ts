import "reflect-metadata";
import "./env";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  const allowedOrigins = (process.env.WEB_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim());
  app.enableCors({ origin: allowedOrigins, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const config = new DocumentBuilder()
    .setTitle("EduFix API")
    .setDescription("API quản lý tài sản và sự cố trường học")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  if (process.env.NODE_ENV !== "production")
    SwaggerModule.setup(
      "api/docs",
      app,
      SwaggerModule.createDocument(app, config),
    );
  await app.listen(
    Number(process.env.API_PORT ?? 4000),
    process.env.API_HOST ?? "0.0.0.0",
  );
}
void bootstrap();

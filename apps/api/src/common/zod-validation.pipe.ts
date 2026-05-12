import { BadRequestException, type PipeTransform } from '@nestjs/common';
import { ZodError, type ZodSchema } from 'zod';

/**
 * Pipe genérico para validar el body, query o params contra un schema
 * Zod del paquete @perdida-peso/schemas. Uso:
 *
 *   @Post()
 *   register(@Body(new ZodValidationPipe(registerInputSchema)) input) {}
 */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    try {
      return this.schema.parse(value);
    } catch (e) {
      if (e instanceof ZodError) {
        throw new BadRequestException({
          message: 'Validación fallida',
          errors: e.flatten().fieldErrors,
        });
      }
      throw e;
    }
  }
}

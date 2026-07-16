import { NestFactory } from '@nestjs/core'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AppModule } from '../src/app.module.js'

let app: NestFastifyApplication
let paths: Readonly<Record<string, unknown>>

beforeAll(async () => {
  app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { logger: false },
  )
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('NEXO').setVersion('1').build(),
  )
  paths = document.paths
})

afterAll(async () => app.close())

describe('Phase 1 OpenAPI contract', () => {
  it.each([
    '/v1/auth/register',
    '/v1/auth/login',
    '/v1/auth/logout',
    '/v1/auth/refresh',
    '/v1/auth/forgot-password',
    '/v1/auth/reset-password',
    '/v1/auth/change-password',
    '/v1/auth/sessions',
    '/v1/auth/sessions/{id}',
    '/v1/auth/sessions/revoke-others',
    '/v1/auth/me',
    '/v1/organizations',
    '/v1/organizations/{id}',
    '/v1/organizations/{id}/select',
    '/v1/organizations/{organizationId}/memberships',
    '/v1/organizations/{organizationId}/invitations',
    '/v1/invitations/{token}/accept',
    '/v1/invitations/{id}/resend',
    '/v1/memberships/{id}',
    '/v1/teams',
    '/v1/teams/{id}',
    '/v1/teams/{id}/members',
    '/v1/teams/{id}/members/{membershipId}',
    '/v1/roles',
    '/v1/permissions',
    '/v1/audit-logs',
  ])('documents %s', (path) => expect(paths[path]).toBeDefined())
})

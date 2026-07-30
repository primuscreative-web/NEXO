import { generateKeyPairSync } from 'node:crypto'
import { mkdirSync, existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const directory = join(process.cwd(), '.preview-secrets')
const privatePath = join(directory, 'jwt-ed25519-private.pem')
const publicPath = join(directory, 'jwt-ed25519-public.pem')
if (existsSync(privatePath) || existsSync(publicPath))
  throw new Error('Refusing to overwrite existing preview JWT keys')
mkdirSync(directory, { recursive: true, mode: 0o700 })
const { privateKey, publicKey } = generateKeyPairSync('ed25519')
writeFileSync(
  privatePath,
  privateKey.export({ type: 'pkcs8', format: 'pem' }),
  {
    mode: 0o600,
  },
)
writeFileSync(publicPath, publicKey.export({ type: 'spki', format: 'pem' }), {
  mode: 0o644,
})
console.log('Preview Ed25519 files created in ignored .preview-secrets/.')
console.log(
  'Set AUTH_JWT_PRIVATE_KEY and AUTH_JWT_PUBLIC_KEY from those files in the secret store.',
)

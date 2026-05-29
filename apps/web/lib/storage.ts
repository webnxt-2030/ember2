import fs from 'node:fs'
import path from 'node:path'
import type { Readable } from 'node:stream'

export interface StorageDriver {
  put(key: string, data: Buffer, mimeType: string): Promise<void>
  get(key: string): Promise<{ stream: Readable; mimeType: string | null } | null>
}

class RailwayVolumeDriver implements StorageDriver {
  constructor(private readonly root: string) {}

  async put(key: string, data: Buffer, mimeType: string): Promise<void> {
    const dest = path.join(this.root, key)
    await fs.promises.mkdir(path.dirname(dest), { recursive: true })
    await fs.promises.writeFile(dest, data)
    await fs.promises.writeFile(`${dest}.mime`, mimeType)
  }

  async get(key: string): Promise<{ stream: Readable; mimeType: string | null } | null> {
    const filePath = path.join(this.root, key)
    try {
      await fs.promises.access(filePath)
    } catch {
      return null
    }
    let mimeType: string | null = null
    try {
      mimeType = (await fs.promises.readFile(`${filePath}.mime`, 'utf-8')).trim()
    } catch {
      // mime sidecar missing — non-fatal
    }
    return { stream: fs.createReadStream(filePath), mimeType }
  }
}

// S3-compatible driver (MinIO / AWS S3 / Railway S3).
// Requires `@aws-sdk/client-s3` to be installed:
//   pnpm --filter web add @aws-sdk/client-s3
// Set STORAGE_DRIVER=minio (or s3) and S3_* env vars.
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
class S3Driver implements StorageDriver {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any = null
  private readonly config: {
    endpoint: string
    bucket: string
    accessKey: string
    secretKey: string
    region: string
  }

  constructor(cfg: {
    endpoint: string
    bucket: string
    accessKey: string
    secretKey: string
    region?: string
  }) {
    this.config = { ...cfg, region: cfg.region ?? 'us-east-1' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getClient(): any {
    if (this.client) return this.client
    let S3Client: unknown
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      S3Client = require('@aws-sdk/client-s3').S3Client
    } catch {
      throw new Error(
        'S3/MinIO storage requires @aws-sdk/client-s3. ' +
          'Run: pnpm --filter web add @aws-sdk/client-s3',
      )
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.client = new (S3Client as any)({
      endpoint: this.config.endpoint,
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKey,
        secretAccessKey: this.config.secretKey,
      },
      forcePathStyle: true,
    })
    return this.client
  }

  async put(key: string, data: Buffer, mimeType: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PutObjectCommand } = require('@aws-sdk/client-s3')
    await this.getClient().send(
      new PutObjectCommand({ Bucket: this.config.bucket, Key: key, Body: data, ContentType: mimeType }),
    )
  }

  async get(key: string): Promise<{ stream: Readable; mimeType: string | null } | null> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GetObjectCommand } = require('@aws-sdk/client-s3')
    try {
      const res = await this.getClient().send(
        new GetObjectCommand({ Bucket: this.config.bucket, Key: key }),
      )
      if (!res.Body) return null
      return { stream: res.Body as Readable, mimeType: res.ContentType ?? null }
    } catch (err: unknown) {
      const name = (err as { name?: string }).name
      if (name === 'NoSuchKey' || name === 'NotFound') return null
      throw err
    }
  }
}
/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

let _driver: StorageDriver | null = null

export function getStorageDriver(): StorageDriver {
  if (_driver) return _driver

  const driverName = process.env.STORAGE_DRIVER ?? 'railway-volume'

  if (driverName === 'railway-volume') {
    _driver = new RailwayVolumeDriver(process.env.STORAGE_ROOT ?? '/data/uploads')
  } else if (driverName === 'minio' || driverName === 's3') {
    _driver = new S3Driver({
      endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
      bucket: process.env.S3_BUCKET ?? 'ember',
      accessKey: process.env.S3_ACCESS_KEY ?? '',
      secretKey: process.env.S3_SECRET_KEY ?? '',
    })
  } else {
    throw new Error(`Unknown STORAGE_DRIVER: "${driverName}". Valid values: railway-volume, minio, s3`)
  }

  return _driver
}

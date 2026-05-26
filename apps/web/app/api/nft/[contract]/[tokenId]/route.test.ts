import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@ember/shared', async () => {
  const { z } = await import('zod')
  return {
    addressSchema: z
      .string()
      .regex(/^0x[0-9a-fA-F]{40}$/, 'Invalid Ethereum address'),
  }
})

vi.mock('@/lib/db/contributions', () => ({
  getContributionByNft: vi.fn(),
}))

import { GET } from './route'
import { getContributionByNft } from '@/lib/db/contributions'

const mockedGetContributionByNft = vi.mocked(getContributionByNft)

function makeRequest(contract: string, tokenId: string): NextRequest {
  return new NextRequest(`http://localhost/api/nft/${contract}/${tokenId}`)
}

describe('GET /api/nft/[contract]/[tokenId]', () => {
  it('returns 200 metadata JSON for a valid NFT', async () => {
    mockedGetContributionByNft.mockResolvedValue({
      nftTokenId: '42',
      amount: { toString: () => '100.5' },
      m0Share: { toString: () => '25.25' },
      contributedAt: new Date('2026-05-01T00:00:00Z'),
      project: { slug: 'my-project', title: 'My Project' },
    } as any)

    const req = makeRequest('0xabc1230000000000000000000000000000000000', '42')
    const res = await GET(req, {
      params: Promise.resolve({
        contract: '0xabc1230000000000000000000000000000000000',
        tokenId: '42',
      }),
    })

    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=60')

    const json = await res.json()
    expect(json).toEqual({
      name: 'Ember Position #42',
      description: 'Contribution to My Project on Ember.',
      image:
        'https://ember.app/og/nft/0xabc1230000000000000000000000000000000000/42',
      attributes: [
        { trait_type: 'Project', value: 'my-project' },
        { trait_type: 'Amount (USDT)', value: '100.500000' },
        { trait_type: 'M0 Share (USDT)', value: '25.250000' },
        { trait_type: 'Contributed At', value: '2026-05-01T00:00:00.000Z' },
      ],
    })
  })

  it('returns 404 when NFT is not found', async () => {
    mockedGetContributionByNft.mockResolvedValue(null)

    const req = makeRequest('0xabc1230000000000000000000000000000000000', '99')
    const res = await GET(req, {
      params: Promise.resolve({
        contract: '0xabc1230000000000000000000000000000000000',
        tokenId: '99',
      }),
    })

    expect(res.status).toBe(404)
    expect(res.headers.get('Content-Type')).toBe('application/problem+json')
  })

  it('returns 404 for invalid contract address', async () => {
    const req = makeRequest('not-an-address', '1')
    const res = await GET(req, {
      params: Promise.resolve({
        contract: 'not-an-address',
        tokenId: '1',
      }),
    })

    expect(res.status).toBe(404)
    expect(res.headers.get('Content-Type')).toBe('application/problem+json')
  })

  it('returns 404 for non-numeric tokenId', async () => {
    const req = makeRequest(
      '0xabc1230000000000000000000000000000000000',
      'abc',
    )
    const res = await GET(req, {
      params: Promise.resolve({
        contract: '0xabc1230000000000000000000000000000000000',
        tokenId: 'abc',
      }),
    })

    expect(res.status).toBe(404)
    expect(res.headers.get('Content-Type')).toBe('application/problem+json')
  })
})

import { prisma } from './index'

export async function getContributionByNft(contract: string, tokenId: string) {
  return prisma.contribution.findFirst({
    where: {
      nftContract: contract,
      nftTokenId: tokenId,
    },
    include: {
      project: {
        select: {
          slug: true,
          title: true,
        },
      },
    },
  })
}

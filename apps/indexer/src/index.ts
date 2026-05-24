// Ember Indexer — standalone Node.js service for chain event indexing
// Watches onchain events from ProjectEscrow and PositionNFT contracts
// and mirrors state into the Prisma/Postgres database.

import pino from "pino";

const logger = pino({ name: "ember-indexer" });

logger.info("Ember indexer starting...");

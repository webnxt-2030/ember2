import { indexerEnv } from "./lib/env.js";
import { logger } from "./lib/logger.js";
import { startFactoryWatcher, stopFactoryWatcher } from "./watchers/factory.js";
import {
  startEscrowWatchers,
  stopAllEscrowWatchers,
} from "./watchers/escrow.js";
import { startKeeper, stopKeeper } from "./keeper.js";

async function main() {
  logger.info("Ember indexer starting...");
  logger.info(
    { confirmations: indexerEnv.INDEXER_CONFIRMATIONS },
    "Indexer config"
  );

  await startEscrowWatchers();

  await startFactoryWatcher();

  startKeeper();

  logger.info("Indexer ready");
}

main().catch((err) => {
  logger.fatal({ err }, "Indexer fatal error");
  process.exit(1);
});

process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down...");
  stopFactoryWatcher();
  stopAllEscrowWatchers();
  stopKeeper();
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down...");
  stopFactoryWatcher();
  stopAllEscrowWatchers();
  stopKeeper();
  process.exit(0);
});
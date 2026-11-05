import { bootstrapGrpcService, GRPC_CONTRACTS } from './shared/common/index.js';
import { AppModule } from './app.module.js';

await bootstrapGrpcService(AppModule, GRPC_CONTRACTS.offers, process.env.GRPC_URL ?? '0.0.0.0:50052');

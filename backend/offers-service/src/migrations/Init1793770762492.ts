import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1793770762492 implements MigrationInterface {
  name = 'Init1793770762492';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("CREATE TABLE \"outbox_events\" (\"id\" uuid NOT NULL, \"type\" text NOT NULL, \"version\" integer NOT NULL, \"occurred_at\" TIMESTAMP WITH TIME ZONE NOT NULL, \"data\" jsonb NOT NULL, \"published_at\" TIMESTAMP WITH TIME ZONE, \"created_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT \"PK_6689a16c00d09b8089f6237f1d2\" PRIMARY KEY (\"id\"))");
    await queryRunner.query("CREATE INDEX \"idx_outbox_pending\" ON \"outbox_events\"  (\"created_at\") WHERE published_at IS NULL");
    await queryRunner.query("CREATE TABLE \"offers\" (\"id\" uuid NOT NULL DEFAULT gen_random_uuid(), \"company_id\" uuid NOT NULL, \"company_name\" text NOT NULL, \"title\" text NOT NULL, \"description\" text NOT NULL, \"career_code\" text NOT NULL, \"modality\" text NOT NULL, \"schedule\" text NOT NULL, \"deadline\" date NOT NULL, \"status\" text NOT NULL DEFAULT 'PENDIENTE', \"rejection_reason\" text, \"reviewed_by\" uuid, \"reviewed_at\" TIMESTAMP WITH TIME ZONE, \"closed_at\" TIMESTAMP WITH TIME ZONE, \"created_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT \"chk_offers_schedule\" CHECK (schedule IN ('TIEMPO_COMPLETO', 'MEDIO_TIEMPO')), CONSTRAINT \"chk_offers_modality\" CHECK (modality IN ('PRESENCIAL', 'REMOTA', 'HIBRIDA')), CONSTRAINT \"chk_offers_status\" CHECK (status IN ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'CERRADA')), CONSTRAINT \"PK_4c88e956195bba85977da21b8f4\" PRIMARY KEY (\"id\"))");
    await queryRunner.query("CREATE INDEX \"idx_offers_company\" ON \"offers\"  (\"company_id\") ");
    await queryRunner.query("CREATE INDEX \"idx_offers_search\" ON \"offers\"  (\"status\", \"career_code\", \"modality\", \"schedule\", \"deadline\") ");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX \"public\".\"idx_offers_search\"");
    await queryRunner.query("DROP INDEX \"public\".\"idx_offers_company\"");
    await queryRunner.query("DROP TABLE \"offers\"");
    await queryRunner.query("DROP INDEX \"public\".\"idx_outbox_pending\"");
    await queryRunner.query("DROP TABLE \"outbox_events\"");
  }
}

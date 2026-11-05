import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1793770763906 implements MigrationInterface {
  name = 'Init1793770763906';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("CREATE TABLE \"notifications\" (\"id\" uuid NOT NULL DEFAULT gen_random_uuid(), \"recipient_id\" uuid NOT NULL, \"event_id\" uuid NOT NULL, \"type\" text NOT NULL, \"title\" text NOT NULL, \"body\" text NOT NULL, \"link\" text NOT NULL, \"read_at\" TIMESTAMP WITH TIME ZONE, \"created_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT \"uq_notifications_event_recipient\" UNIQUE (\"event_id\", \"recipient_id\"), CONSTRAINT \"PK_6a72c3c0f683f6462415e653c3a\" PRIMARY KEY (\"id\"))");
    await queryRunner.query("CREATE INDEX \"idx_notifications_inbox\" ON \"notifications\"  (\"recipient_id\", \"read_at\", \"created_at\") ");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX \"public\".\"idx_notifications_inbox\"");
    await queryRunner.query("DROP TABLE \"notifications\"");
  }
}

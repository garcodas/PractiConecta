import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1793770865569 implements MigrationInterface {
  name = 'Init1793770865569';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("CREATE TABLE \"outbox_events\" (\"id\" uuid NOT NULL, \"type\" text NOT NULL, \"version\" integer NOT NULL, \"occurred_at\" TIMESTAMP WITH TIME ZONE NOT NULL, \"data\" jsonb NOT NULL, \"published_at\" TIMESTAMP WITH TIME ZONE, \"created_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT \"PK_6689a16c00d09b8089f6237f1d2\" PRIMARY KEY (\"id\"))");
    await queryRunner.query("CREATE INDEX \"idx_outbox_pending\" ON \"outbox_events\"  (\"created_at\") WHERE published_at IS NULL");
    await queryRunner.query("CREATE TABLE \"applications\" (\"id\" uuid NOT NULL, \"offer_id\" uuid NOT NULL, \"student_id\" uuid NOT NULL, \"company_id\" uuid NOT NULL, \"offer_title\" text NOT NULL, \"company_name\" text NOT NULL, \"status\" text NOT NULL, \"created_at\" TIMESTAMP WITH TIME ZONE NOT NULL, \"updated_at\" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT \"uq_applications_offer_student\" UNIQUE (\"offer_id\", \"student_id\"), CONSTRAINT \"chk_applications_status\" CHECK (status IN ('ENVIADA', 'EN_REVISION', 'ENTREVISTA', 'ACEPTADA', 'RECHAZADA')), CONSTRAINT \"PK_938c0a27255637bde919591888f\" PRIMARY KEY (\"id\"))");
    await queryRunner.query("CREATE INDEX \"idx_applications_company_offer\" ON \"applications\"  (\"company_id\", \"offer_id\") ");
    await queryRunner.query("CREATE INDEX \"idx_applications_student\" ON \"applications\"  (\"student_id\") ");
    await queryRunner.query("CREATE TABLE \"application_status_history\" (\"id\" uuid NOT NULL DEFAULT gen_random_uuid(), \"application_id\" uuid NOT NULL, \"from_status\" text, \"to_status\" text NOT NULL, \"changed_by\" uuid NOT NULL, \"changed_at\" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT \"PK_62f7e8a5533a7db21218f2e2434\" PRIMARY KEY (\"id\"))");
    await queryRunner.query("CREATE INDEX \"idx_history_application\" ON \"application_status_history\"  (\"application_id\", \"changed_at\") ");
    await queryRunner.query("ALTER TABLE \"application_status_history\" ADD CONSTRAINT \"FK_a461ff43395424ebd6e218deb32\" FOREIGN KEY (\"application_id\") REFERENCES \"applications\"(\"id\") ON DELETE CASCADE ON UPDATE NO ACTION");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE \"application_status_history\" DROP CONSTRAINT \"FK_a461ff43395424ebd6e218deb32\"");
    await queryRunner.query("DROP INDEX \"public\".\"idx_history_application\"");
    await queryRunner.query("DROP TABLE \"application_status_history\"");
    await queryRunner.query("DROP INDEX \"public\".\"idx_applications_student\"");
    await queryRunner.query("DROP INDEX \"public\".\"idx_applications_company_offer\"");
    await queryRunner.query("DROP TABLE \"applications\"");
    await queryRunner.query("DROP INDEX \"public\".\"idx_outbox_pending\"");
    await queryRunner.query("DROP TABLE \"outbox_events\"");
  }
}

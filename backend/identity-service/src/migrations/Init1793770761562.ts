import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1793770761562 implements MigrationInterface {
  name = 'Init1793770761562';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("CREATE TABLE \"outbox_events\" (\"id\" uuid NOT NULL, \"type\" text NOT NULL, \"version\" integer NOT NULL, \"occurred_at\" TIMESTAMP WITH TIME ZONE NOT NULL, \"data\" jsonb NOT NULL, \"published_at\" TIMESTAMP WITH TIME ZONE, \"created_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT \"PK_6689a16c00d09b8089f6237f1d2\" PRIMARY KEY (\"id\"))");
    await queryRunner.query("CREATE INDEX \"idx_outbox_pending\" ON \"outbox_events\"  (\"created_at\") WHERE published_at IS NULL");
    await queryRunner.query("CREATE TABLE \"users\" (\"id\" uuid NOT NULL DEFAULT gen_random_uuid(), \"email\" text NOT NULL, \"password_hash\" text NOT NULL, \"role\" text NOT NULL, \"created_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT \"UQ_97672ac88f789774dd47f7c8be3\" UNIQUE (\"email\"), CONSTRAINT \"chk_users_role\" CHECK (role IN ('STUDENT', 'COMPANY', 'COORDINATOR')), CONSTRAINT \"PK_a3ffb1c0c8416b9fc6f907b7433\" PRIMARY KEY (\"id\"))");
    await queryRunner.query("CREATE TABLE \"skills\" (\"id\" uuid NOT NULL DEFAULT gen_random_uuid(), \"name\" text NOT NULL, CONSTRAINT \"UQ_81f05095507fd84aa2769b4a522\" UNIQUE (\"name\"), CONSTRAINT \"PK_0d3212120f4ecedf90864d7e298\" PRIMARY KEY (\"id\"))");
    await queryRunner.query("CREATE TABLE \"student_profiles\" (\"user_id\" uuid NOT NULL, \"full_name\" text NOT NULL, \"career_code\" text NOT NULL, \"semester\" integer NOT NULL, \"cv_file_name\" text, CONSTRAINT \"chk_student_semester\" CHECK (semester BETWEEN 1 AND 12), CONSTRAINT \"PK_cef016a0d95e26ae7c0f167ec28\" PRIMARY KEY (\"user_id\"))");
    await queryRunner.query("CREATE TABLE \"company_profiles\" (\"user_id\" uuid NOT NULL, \"name\" text NOT NULL, \"contact_email\" text NOT NULL, \"contact_phone\" text NOT NULL, \"status\" text NOT NULL DEFAULT 'PENDIENTE', \"rejection_reason\" text, \"reviewed_by\" uuid, \"reviewed_at\" TIMESTAMP WITH TIME ZONE, CONSTRAINT \"chk_company_status\" CHECK (status IN ('PENDIENTE', 'APROBADA', 'RECHAZADA')), CONSTRAINT \"PK_d06e08f04b51637dffa0ff16850\" PRIMARY KEY (\"user_id\"))");
    await queryRunner.query("CREATE TABLE \"student_skills\" (\"student_id\" uuid NOT NULL, \"skill_id\" uuid NOT NULL, CONSTRAINT \"PK_c4761fff6256e081968cce88704\" PRIMARY KEY (\"student_id\", \"skill_id\"))");
    await queryRunner.query("CREATE INDEX \"IDX_6cdb9b295520747eb357461dfa\" ON \"student_skills\"  (\"student_id\") ");
    await queryRunner.query("CREATE INDEX \"IDX_379f5842981fcdc1dc3c886b86\" ON \"student_skills\"  (\"skill_id\") ");
    await queryRunner.query("ALTER TABLE \"student_profiles\" ADD CONSTRAINT \"FK_cef016a0d95e26ae7c0f167ec28\" FOREIGN KEY (\"user_id\") REFERENCES \"users\"(\"id\") ON DELETE CASCADE ON UPDATE NO ACTION");
    await queryRunner.query("ALTER TABLE \"company_profiles\" ADD CONSTRAINT \"FK_d06e08f04b51637dffa0ff16850\" FOREIGN KEY (\"user_id\") REFERENCES \"users\"(\"id\") ON DELETE CASCADE ON UPDATE NO ACTION");
    await queryRunner.query("ALTER TABLE \"student_skills\" ADD CONSTRAINT \"FK_6cdb9b295520747eb357461dfaf\" FOREIGN KEY (\"student_id\") REFERENCES \"student_profiles\"(\"user_id\") ON DELETE CASCADE ON UPDATE CASCADE");
    await queryRunner.query("ALTER TABLE \"student_skills\" ADD CONSTRAINT \"FK_379f5842981fcdc1dc3c886b86d\" FOREIGN KEY (\"skill_id\") REFERENCES \"skills\"(\"id\") ON DELETE CASCADE ON UPDATE CASCADE");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE \"student_skills\" DROP CONSTRAINT \"FK_379f5842981fcdc1dc3c886b86d\"");
    await queryRunner.query("ALTER TABLE \"student_skills\" DROP CONSTRAINT \"FK_6cdb9b295520747eb357461dfaf\"");
    await queryRunner.query("ALTER TABLE \"company_profiles\" DROP CONSTRAINT \"FK_d06e08f04b51637dffa0ff16850\"");
    await queryRunner.query("ALTER TABLE \"student_profiles\" DROP CONSTRAINT \"FK_cef016a0d95e26ae7c0f167ec28\"");
    await queryRunner.query("DROP INDEX \"public\".\"IDX_379f5842981fcdc1dc3c886b86\"");
    await queryRunner.query("DROP INDEX \"public\".\"IDX_6cdb9b295520747eb357461dfa\"");
    await queryRunner.query("DROP TABLE \"student_skills\"");
    await queryRunner.query("DROP TABLE \"company_profiles\"");
    await queryRunner.query("DROP TABLE \"student_profiles\"");
    await queryRunner.query("DROP TABLE \"skills\"");
    await queryRunner.query("DROP TABLE \"users\"");
    await queryRunner.query("DROP INDEX \"public\".\"idx_outbox_pending\"");
    await queryRunner.query("DROP TABLE \"outbox_events\"");
  }
}

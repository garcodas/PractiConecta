-- Una base y un rol por servicio. Cada rol solo entra a su base: ningún servicio
-- puede leer los datos de otro. Las bases *_test son para pruebas de integración.
\set ON_ERROR_STOP on

CREATE ROLE identity_svc LOGIN PASSWORD 'identity_pw';
CREATE ROLE offers_svc LOGIN PASSWORD 'offers_pw';
CREATE ROLE applications_svc LOGIN PASSWORD 'applications_pw';
CREATE ROLE notifications_svc LOGIN PASSWORD 'notifications_pw';

CREATE DATABASE identity_db OWNER identity_svc;
CREATE DATABASE offers_db OWNER offers_svc;
CREATE DATABASE applications_db OWNER applications_svc;
CREATE DATABASE notifications_db OWNER notifications_svc;
CREATE DATABASE identity_test OWNER identity_svc;
CREATE DATABASE offers_test OWNER offers_svc;
CREATE DATABASE applications_test OWNER applications_svc;
CREATE DATABASE notifications_test OWNER notifications_svc;

REVOKE CONNECT ON DATABASE identity_db, identity_test FROM PUBLIC;
REVOKE CONNECT ON DATABASE offers_db, offers_test FROM PUBLIC;
REVOKE CONNECT ON DATABASE applications_db, applications_test FROM PUBLIC;
REVOKE CONNECT ON DATABASE notifications_db, notifications_test FROM PUBLIC;
